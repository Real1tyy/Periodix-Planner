import type { DateTime } from "luxon";
import type { App, TFile } from "obsidian";
import type { Observable, Subscription } from "rxjs";
import {
	parseAllocationBlock,
	resolveAllocations,
	serializeAllocations,
} from "../components/time-budget/allocation-parser";
import type { PeriodType } from "../constants";
import type {
	NoteGenerationResult,
	PeriodicPlannerSettings,
	PeriodLinks,
	PropertySettings,
	TimeAllocation,
} from "../types";
import { ORDERED_PERIOD_TYPES, PERIOD_CONFIG } from "../types";
import {
	createPeriodInfo,
	formatPeriodName,
	getAncestorPeriodTypes,
	getNextPeriod,
	getPreviousPeriod,
	getStartOfPeriod,
	type PeriodInfo,
} from "../utils/date-utils";
import { ensureFolderExists, getPdfPath, removeFileExtension } from "../utils/file-operations";
import {
	assignPeriodPropertiesToFrontmatter,
	createWikiLink,
	extractLinkTarget,
	resolveNoteFile,
} from "../utils/frontmatter-utils";
import { getHoursForPeriodType, roundHours } from "../utils/time-budget-utils";

type Frontmatter = Record<string, unknown>;

export class NoteGenerator {
	private settings: PeriodicPlannerSettings;
	private subscription: Subscription;

	constructor(
		private app: App,
		settings$: Observable<PeriodicPlannerSettings>
	) {
		this.settings = null!;
		this.subscription = settings$.subscribe((settings) => {
			this.settings = settings;
		});
	}

	destroy(): void {
		this.subscription.unsubscribe();
	}

	async generateNote(dt: DateTime, periodType: PeriodType): Promise<NoteGenerationResult> {
		const filePath = this.getNotePath(dt, periodType);

		const existingFile = this.app.vault.getAbstractFileByPath(filePath);
		if (existingFile) {
			return { success: true, filePath, alreadyExists: true };
		}

		try {
			await ensureFolderExists(this.app, filePath);
			const file = await this.app.vault.create(filePath, "");
			await this.writeFrontmatter(file, dt, periodType);
			await this.writeTimeBudgetBlock(file, periodType);
			await this.writePdfContent(file, filePath);

			return { success: true, filePath, alreadyExists: false };
		} catch (error) {
			return {
				success: false,
				filePath,
				alreadyExists: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	async generateAllPeriodsForDate(dt: DateTime): Promise<Map<PeriodType, NoteGenerationResult>> {
		const results = new Map<PeriodType, NoteGenerationResult>();

		for (const periodType of ORDERED_PERIOD_TYPES) {
			const result = await this.generateNote(dt, periodType);
			results.set(periodType, result);
		}

		return results;
	}

	getNotePath(dt: DateTime, periodType: PeriodType): string {
		const config = PERIOD_CONFIG[periodType];
		const folder = this.settings.directories[config.folderKey];
		const format = this.settings.naming[config.formatKey];
		const periodStart = getStartOfPeriod(dt, periodType);
		const name = formatPeriodName(periodStart, format);
		return `${folder}/${name}.md`;
	}

	getNoteLink(dt: DateTime, periodType: PeriodType): string {
		const format = this.settings.naming[PERIOD_CONFIG[periodType].formatKey];
		const periodStart = getStartOfPeriod(dt, periodType);
		const displayName = formatPeriodName(periodStart, format);
		const fullPath = removeFileExtension(this.getNotePath(dt, periodType));
		return createWikiLink(fullPath, displayName);
	}

	getNotePathWithoutExtension(dt: DateTime, periodType: PeriodType): string {
		return removeFileExtension(this.getNotePath(dt, periodType));
	}

	getNoteDisplayName(dt: DateTime, periodType: PeriodType): string {
		const format = this.settings.naming[PERIOD_CONFIG[periodType].formatKey];
		const periodStart = getStartOfPeriod(dt, periodType);
		return formatPeriodName(periodStart, format);
	}

	private async writeFrontmatter(file: TFile, dt: DateTime, periodType: PeriodType): Promise<void> {
		const props = this.settings.properties;
		const gen = this.settings.generation;
		const format = this.settings.naming[PERIOD_CONFIG[periodType].formatKey];
		const periodInfo = createPeriodInfo(dt, periodType, format);
		const links = this.buildPeriodLinks(periodInfo);
		const hoursAvailable = getHoursForPeriodType(this.settings.timeBudget, periodType);

		await this.app.fileManager.processFrontMatter(file, (fm: Frontmatter) => {
			assignPeriodPropertiesToFrontmatter(fm, props, periodType, periodInfo, links, hoursAvailable, false);

			if (gen.includePdfFrontmatter) {
				const pdfPath = getPdfPath(file.path);
				fm[gen.pdfNoteProp] = `[[${pdfPath}]]`;
			}
		});
	}

	private async writeTimeBudgetBlock(file: TFile, periodType: PeriodType): Promise<void> {
		if (!this.settings.generation.autoInsertCodeBlock) {
			return;
		}

		const inheritedAllocations = await this.getInheritedAllocations(file, periodType);
		const content = await this.app.vault.read(file);
		const updatedContent = this.insertCodeBlockAfterFrontmatter(content, inheritedAllocations);

		if (updatedContent !== content) {
			await this.app.vault.modify(file, updatedContent);
		}
	}

	async ensureTimeBudgetBlock(file: TFile, periodType: PeriodType): Promise<void> {
		if (!this.settings.generation.autoInsertCodeBlock) {
			return;
		}

		const content = await this.app.vault.read(file);
		if (content.includes("```periodic-planner")) return;

		const inheritedAllocations = await this.getInheritedAllocations(file, periodType);
		const updatedContent = this.insertCodeBlockAfterFrontmatter(content, inheritedAllocations);

		if (updatedContent !== content) {
			await this.app.vault.modify(file, updatedContent);
		}
	}

	private async getInheritedAllocations(file: TFile, periodType: PeriodType): Promise<TimeAllocation[]> {
		const parentPeriodType = PERIOD_CONFIG[periodType].parent;
		if (!parentPeriodType) return [];

		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) return [];

		const parentFile = this.resolveParentFileForInheritance(cache, parentPeriodType, this.settings.properties);
		if (!parentFile) return [];

		const parentContent = await this.app.vault.read(parentFile);
		const parentCodeMatch = parentContent.match(/```periodic-planner\n([\s\S]*?)```/);
		if (!parentCodeMatch) return [];

		const parentParsed = parseAllocationBlock(parentCodeMatch[1]);
		const { resolved: parentAllocations } = resolveAllocations(parentParsed.allocations, this.settings.categories);
		if (parentAllocations.length === 0) return [];

		const parentCache = this.app.metadataCache.getFileCache(parentFile);
		const parentHours: unknown = parentCache?.frontmatter?.[this.settings.properties.hoursAvailableProp];
		const totalParentHours = typeof parentHours === "number" ? parentHours : 0;
		if (totalParentHours <= 0) return [];

		const currentHours: unknown = cache.frontmatter?.[this.settings.properties.hoursAvailableProp];
		const totalCurrentHours = typeof currentHours === "number" ? currentHours : 0;
		if (totalCurrentHours <= 0) return [];

		return this.scaleAllocationsToTotal(parentAllocations, totalParentHours, totalCurrentHours);
	}

	private scaleAllocationsToTotal(
		parentAllocations: TimeAllocation[],
		totalParentHours: number,
		totalCurrentHours: number
	): TimeAllocation[] {
		const scaledAllocations = parentAllocations.map((alloc) => ({
			categoryId: alloc.categoryId,
			hours: roundHours((alloc.hours / totalParentHours) * totalCurrentHours),
		}));

		const sumScaled = scaledAllocations.reduce((sum, a) => sum + a.hours, 0);
		const roundedSum = roundHours(sumScaled);
		const targetSum = roundHours(totalCurrentHours);

		const parentSum = parentAllocations.reduce((sum, a) => sum + a.hours, 0);
		const parentWas100Percent = Math.abs(parentSum - totalParentHours) < 0.01;

		if (parentWas100Percent && Math.abs(roundedSum - targetSum) > 0.01) {
			const diff = Math.round((targetSum - roundedSum) * 10) / 10;

			let largestIndex = 0;
			let largestHours = 0;
			for (let i = 0; i < scaledAllocations.length; i++) {
				if (scaledAllocations[i].hours > largestHours) {
					largestHours = scaledAllocations[i].hours;
					largestIndex = i;
				}
			}

			scaledAllocations[largestIndex].hours = roundHours(scaledAllocations[largestIndex].hours + diff);
		}

		return scaledAllocations;
	}

	private resolveParentFileForInheritance(
		cache: { frontmatter?: Record<string, unknown> },
		parentPeriodType: PeriodType,
		properties: PropertySettings
	): TFile | null {
		const linkKey = PERIOD_CONFIG[parentPeriodType].linkKey;
		if (!linkKey) return null;

		const propKey = `${linkKey}Prop`;
		const propName = properties[propKey as keyof PropertySettings];
		if (typeof propName !== "string") return null;

		const linkValue: unknown = cache.frontmatter?.[propName];
		const linkPath = extractLinkTarget(linkValue);
		if (!linkPath) return null;

		return resolveNoteFile(this.app, linkPath);
	}

	private insertCodeBlockAfterFrontmatter(content: string, allocations: TimeAllocation[]): string {
		const allocContent = serializeAllocations(allocations, this.settings.categories);

		let blockContent = "";
		if (this.settings.generation.includePlanHeading && this.settings.generation.planHeadingContent) {
			blockContent += `${this.settings.generation.planHeadingContent}\n\n`;
		}
		blockContent += `\`\`\`periodic-planner\n${allocContent}\n\`\`\`\n\n`;

		const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n?/);
		if (frontmatterMatch) {
			const frontmatter = frontmatterMatch[0];
			const rest = content.slice(frontmatter.length);
			return `${frontmatter}\n${blockContent}${rest}`;
		}

		return blockContent + content;
	}

	private buildPeriodLinks(periodInfo: PeriodInfo): PeriodLinks {
		const { type, dateTime } = periodInfo;
		const prevDt = getPreviousPeriod(dateTime, type);
		const nextDt = getNextPeriod(dateTime, type);

		const links: PeriodLinks = {
			previous: this.getNoteLink(prevDt, type),
			next: this.getNoteLink(nextDt, type),
		};

		const parentType = PERIOD_CONFIG[type].parent;
		if (parentType) {
			links.parent = this.getNoteLink(dateTime, parentType);
		}

		for (const ancestorType of getAncestorPeriodTypes(type)) {
			const { linkKey } = PERIOD_CONFIG[ancestorType];
			if (linkKey) {
				links[linkKey] = this.getNoteLink(dateTime, ancestorType);
			}
		}

		return links;
	}

	private async writePdfContent(file: TFile, filePath: string): Promise<void> {
		const gen = this.settings.generation;
		if (!gen.includePdfContent) return;

		const pdfPath = getPdfPath(filePath);
		const content = `${gen.pdfContentHeader}\n\n![[${pdfPath}]]`;

		const currentContent = await this.app.vault.read(file);
		await this.app.vault.modify(file, currentContent + content);
	}
}
