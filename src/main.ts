import { DateTime } from "luxon";
import { Notice, Plugin, TFile } from "obsidian";
import { PeriodChildrenBasesModal } from "./components/period-children-bases-modal";
import { TimeBudgetBlockRenderer } from "./components/time-budget";
import {
	parseAllocationBlock,
	resolveAllocations,
	serializeAllocations,
} from "./components/time-budget/allocation-parser";
import type { PeriodType } from "./constants";
import { AutoGenerator, formatAutoGenerationSummary } from "./core/auto-generator";
import { PeriodIndex } from "./core/period-index";
import { SettingsStore } from "./core/settings-store";
import { PeriodicPlannerSettingsTab } from "./settings/settings-tab";
import type { PeriodLinks, PropertySettings, TimeAllocation } from "./types";
import { PERIOD_CONFIG } from "./types";
import { createPeriodInfo, getAncestorPeriodTypes, getNextPeriod, getPreviousPeriod } from "./utils/date-utils";
import {
	getActiveFileCache,
	getLinkFromFrontmatter,
	getPeriodTypeFromFrontmatter,
	openNoteFile,
	resolveNoteFile,
} from "./utils/frontmatter-utils";
import { getHoursForPeriodType } from "./utils/time-budget-utils";

export default class PeriodicPlannerPlugin extends Plugin {
	settingsStore!: SettingsStore;
	autoGenerator!: AutoGenerator;
	periodIndex!: PeriodIndex;

	async onload() {
		this.settingsStore = new SettingsStore(this);
		await this.settingsStore.loadSettings();

		this.autoGenerator = new AutoGenerator(this.app, this.settingsStore.settings$);
		this.periodIndex = new PeriodIndex(this.app, this.settingsStore.settings$);

		this.addSettingTab(new PeriodicPlannerSettingsTab(this.app, this));
		this.registerCommands();
		this.registerVaultEvents();
		this.registerCodeBlockProcessor();

		this.app.workspace.onLayoutReady(() => {
			void this.initializeOnLayoutReady();
		});
	}

	onunload() {
		this.autoGenerator.destroy();
		this.periodIndex.destroy();
	}

	private async initializeOnLayoutReady(): Promise<void> {
		await this.periodIndex.buildIndex();

		if (this.autoGenerator.shouldAutoGenerate()) {
			await this.runAutoGeneration();
		}
	}

	private async runAutoGeneration(): Promise<void> {
		try {
			const summary = await this.autoGenerator.runAutoGeneration();
			console.debug(formatAutoGenerationSummary(summary));

			if (summary.created > 0) {
				new Notice(`Periodic Planner: Created ${summary.created} note(s)`);
				await this.periodIndex.buildIndex();
			}
		} catch (error) {
			console.error("Periodic Planner: Auto-generation failed", error);
		}
	}

	private registerVaultEvents(): void {
		this.registerEvent(
			this.app.vault.on("create", (file) => {
				if (file instanceof TFile && file.extension === "md") {
					void this.periodIndex.indexFile(file);
				}
			})
		);

		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (file instanceof TFile && file.extension === "md") {
					void this.periodIndex.indexFile(file);
				}
			})
		);

		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (file instanceof TFile) {
					this.periodIndex.removeFile(file);
				}
			})
		);

		this.registerEvent(
			this.app.vault.on("rename", (file, _oldPath) => {
				if (file instanceof TFile && file.extension === "md") {
					void this.periodIndex.indexFile(file);
				}
			})
		);

		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				if (file instanceof TFile && file.extension === "md") {
					void this.ensurePeriodicNoteComplete(file);
				}
			})
		);
	}

	private async ensurePeriodicNoteComplete(file: TFile): Promise<void> {
		const entry = this.periodIndex.getEntryForFile(file);
		if (!entry) return;

		await this.ensureFrontmatterProperties(file, entry.periodType, entry.periodStart);
		await this.ensureTimeBudgetBlock(file, entry.periodType);
	}

	private async ensureFrontmatterProperties(file: TFile, periodType: PeriodType, dateTime: DateTime): Promise<void> {
		const settings = this.settingsStore.currentSettings;
		const props = settings.properties;
		const format = settings.naming[PERIOD_CONFIG[periodType].formatKey];
		const periodInfo = createPeriodInfo(dateTime, periodType, format);
		const links = this.buildPeriodLinks(dateTime, periodType);
		const hoursAvailable = getHoursForPeriodType(settings.timeBudget, periodType);

		await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
			if (fm[props.periodTypeProp] === undefined) {
				fm[props.periodTypeProp] = periodType;
			}
			if (fm[props.periodStartProp] === undefined) {
				fm[props.periodStartProp] = periodInfo.start;
			}
			if (fm[props.periodEndProp] === undefined) {
				fm[props.periodEndProp] = periodInfo.end;
			}
			if (fm[props.previousProp] === undefined && links.previous) {
				fm[props.previousProp] = `[[${links.previous}]]`;
			}
			if (fm[props.nextProp] === undefined && links.next) {
				fm[props.nextProp] = `[[${links.next}]]`;
			}
			if (fm[props.parentProp] === undefined && links.parent) {
				fm[props.parentProp] = `[[${links.parent}]]`;
			}
			if (fm[props.weekProp] === undefined && links.week) {
				fm[props.weekProp] = `[[${links.week}]]`;
			}
			if (fm[props.monthProp] === undefined && links.month) {
				fm[props.monthProp] = `[[${links.month}]]`;
			}
			if (fm[props.quarterProp] === undefined && links.quarter) {
				fm[props.quarterProp] = `[[${links.quarter}]]`;
			}
			if (fm[props.yearProp] === undefined && links.year) {
				fm[props.yearProp] = `[[${links.year}]]`;
			}
			if (fm[props.hoursAvailableProp] === undefined) {
				fm[props.hoursAvailableProp] = hoursAvailable;
			}
		});
	}

	private buildPeriodLinks(dateTime: DateTime, periodType: PeriodType): PeriodLinks {
		const settings = this.settingsStore.currentSettings;
		const prevDt = getPreviousPeriod(dateTime, periodType);
		const nextDt = getNextPeriod(dateTime, periodType);

		const formatLink = (dt: DateTime, type: PeriodType): string => {
			const format = settings.naming[PERIOD_CONFIG[type].formatKey];
			return dt.toFormat(format);
		};

		const links: PeriodLinks = {
			previous: formatLink(prevDt, periodType),
			next: formatLink(nextDt, periodType),
		};

		const parentType = PERIOD_CONFIG[periodType].parent;
		if (parentType) {
			links.parent = formatLink(dateTime, parentType);
		}

		for (const ancestorType of getAncestorPeriodTypes(periodType)) {
			const { linkKey } = PERIOD_CONFIG[ancestorType];
			if (linkKey) {
				links[linkKey] = formatLink(dateTime, ancestorType);
			}
		}

		return links;
	}

	private async ensureTimeBudgetBlock(file: TFile, periodType: PeriodType): Promise<void> {
		const content = await this.app.vault.read(file);
		if (content.includes("```periodic-planner")) return;

		const inheritedAllocations = await this.getInheritedAllocations(file, periodType);
		const updatedContent = this.insertCodeBlockAfterFrontmatter(content, inheritedAllocations);
		if (updatedContent !== content) {
			await this.app.vault.modify(file, updatedContent);
		}
	}

	private async getInheritedAllocations(file: TFile, periodType: PeriodType): Promise<TimeAllocation[]> {
		const settings = this.settingsStore.currentSettings;
		const parentPeriodType = PERIOD_CONFIG[periodType].parent;
		if (!parentPeriodType) return [];

		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) return [];

		const parentFile = this.resolveParentFileForInheritance(cache, parentPeriodType, settings.properties);
		if (!parentFile) return [];

		const parentContent = await this.app.vault.read(parentFile);
		const parentCodeMatch = parentContent.match(/```periodic-planner\n([\s\S]*?)```/);
		if (!parentCodeMatch) return [];

		const parentParsed = parseAllocationBlock(parentCodeMatch[1]);
		const { resolved: parentAllocations } = resolveAllocations(parentParsed.allocations, settings.categories);
		if (parentAllocations.length === 0) return [];

		const parentCache = this.app.metadataCache.getFileCache(parentFile);
		const parentHours: unknown = parentCache?.frontmatter?.[settings.properties.hoursAvailableProp];
		const totalParentHours = typeof parentHours === "number" ? parentHours : 0;
		if (totalParentHours <= 0) return [];

		const currentHours: unknown = cache.frontmatter?.[settings.properties.hoursAvailableProp];
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
			hours: Math.round((alloc.hours / totalParentHours) * totalCurrentHours * 10) / 10,
		}));

		const sumScaled = scaledAllocations.reduce((sum, a) => sum + a.hours, 0);
		const roundedSum = Math.round(sumScaled * 10) / 10;
		const targetSum = Math.round(totalCurrentHours * 10) / 10;

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

			scaledAllocations[largestIndex].hours = Math.round((scaledAllocations[largestIndex].hours + diff) * 10) / 10;
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
		if (!linkValue || typeof linkValue !== "string") return null;

		const linkMatch = linkValue.match(/\[\[([^\]|]+)/);
		if (!linkMatch) return null;

		const file = this.app.metadataCache.getFirstLinkpathDest(linkMatch[1], "");
		return file instanceof TFile ? file : null;
	}

	private insertCodeBlockAfterFrontmatter(content: string, allocations: TimeAllocation[]): string {
		const settings = this.settingsStore.currentSettings;
		const allocContent = serializeAllocations(allocations, settings.categories);
		const codeBlock = `\`\`\`periodic-planner\n${allocContent}\n\`\`\`\n\n`;

		const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n?/);
		if (frontmatterMatch) {
			const frontmatter = frontmatterMatch[0];
			const rest = content.slice(frontmatter.length);
			return `${frontmatter}\n${codeBlock}${rest}`;
		}

		return codeBlock + content;
	}

	private registerCommands(): void {
		this.addCommand({
			id: "generate-today",
			name: "Generate all periods for today",
			callback: async () => {
				const summary = await this.autoGenerator.generateAllForDate(DateTime.now());
				const created = [...summary.values()].filter((r) => r.success && !r.alreadyExists).length;
				const existing = [...summary.values()].filter((r) => r.alreadyExists).length;

				if (created > 0) {
					new Notice(`Created ${created} note(s), ${existing} already existed`);
					await this.periodIndex.buildIndex();
				} else {
					new Notice(`All ${existing} notes already exist`);
				}
			},
		});

		this.addCommand({
			id: "generate-periods-ahead",
			name: "Generate future periods",
			callback: async () => {
				const summary = await this.autoGenerator.runAutoGeneration();
				new Notice(`Generated: ${summary.created} created, ${summary.existing} existing, ${summary.failed} failed`);
				if (summary.created > 0) {
					await this.periodIndex.buildIndex();
				}
			},
		});

		this.registerNavigationCommand("go-to-previous", "Go to previous period", "previousProp");
		this.registerNavigationCommand("go-to-next", "Go to next period", "nextProp");
		this.registerNavigationCommand("go-to-parent", "Go to parent period", "parentProp");

		this.addCommand({
			id: "show-children",
			name: "Show child periods",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				const entry = this.periodIndex.getEntryForFile(file);
				if (!entry || entry.periodType === "daily") return false;
				if (!checking) {
					const settings = this.settingsStore.currentSettings;
					new PeriodChildrenBasesModal(this.app, entry, settings.directories, settings.properties).open();
				}
				return true;
			},
		});
	}

	private registerNavigationCommand(
		id: string,
		name: string,
		propKey: "previousProp" | "nextProp" | "parentProp"
	): void {
		this.addCommand({
			id,
			name,
			checkCallback: (checking) => {
				const context = getActiveFileCache(this.app);
				if (!context) return false;

				const props = this.settingsStore.currentSettings.properties;
				const link = getLinkFromFrontmatter(context.cache, props[propKey]);
				const periodType = getPeriodTypeFromFrontmatter(context.cache, props);
				if (!link || !periodType) return false;

				const targetType = propKey === "parentProp" ? PERIOD_CONFIG[periodType].parent : periodType;
				if (!targetType) return false;

				if (!checking) void this.navigateOrCreate(link, targetType);
				return true;
			},
		});
	}

	private async navigateOrCreate(linkTarget: string, periodType: PeriodType): Promise<void> {
		const existingFile = resolveNoteFile(this.app, linkTarget);
		if (existingFile) {
			await openNoteFile(this.app, existingFile);
			return;
		}

		const dt = this.parseLinkToDateTime(linkTarget, periodType);
		if (!dt) {
			new Notice(`Cannot parse date from: ${linkTarget}`);
			return;
		}

		const result = await this.autoGenerator.generateSingleNote(dt, periodType);
		if (result.success) {
			const file = this.app.vault.getAbstractFileByPath(result.filePath);
			if (file instanceof TFile) {
				await openNoteFile(this.app, file);
				await this.periodIndex.indexFile(file);
			}
		} else {
			new Notice(`Failed to create note: ${result.error}`);
		}
	}

	private parseLinkToDateTime(linkTarget: string, periodType: PeriodType): DateTime | null {
		const format = this.settingsStore.currentSettings.naming[PERIOD_CONFIG[periodType].formatKey];
		const parsed = DateTime.fromFormat(linkTarget, format);
		return parsed.isValid ? parsed : null;
	}

	private registerCodeBlockProcessor(): void {
		this.registerMarkdownCodeBlockProcessor("periodic-planner", async (source, el, ctx) => {
			const renderer = new TimeBudgetBlockRenderer(this.app, this.settingsStore.currentSettings);
			await renderer.render(source, el, ctx);
		});
	}
}
