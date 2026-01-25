import { DateTime } from "luxon";
import type { App, TFile, Vault } from "obsidian";
import { parseAllocationBlock } from "../components/time-budget/allocation-parser";
import type { PeriodType } from "../constants";
import type { PeriodIndex } from "../core/period-index";
import type { IndexedPeriodNote, PeriodChildren, PeriodicPlannerSettings, PeriodLinks } from "../types";
import { PERIOD_CONFIG } from "../types";
import type { PropertySettings } from "../types/schemas";
import { FrontmatterSchema } from "../types/schemas";
import { createPeriodInfo, getNextPeriod, getPreviousPeriod } from "./date-utils";
import {
	assignPeriodPropertiesToFrontmatter,
	extractParentLinksFromFrontmatter,
	resolveFilePath,
} from "./frontmatter-utils";
import { getEnabledAncestorPeriodTypes, getEnabledParentPeriodType } from "./period-navigation";
import { getHoursForPeriodType } from "./time-budget-utils";

const TIME_BUDGET_CODE_FENCE = "periodic-planner";

/**
 * Extracts the content of a code block from a file.
 * Returns null if no code block with the specified fence is found.
 */
export async function extractCodeBlockContent(vault: Vault, file: TFile, codeFence: string): Promise<string | null> {
	try {
		const content = await vault.read(file);
		const regex = new RegExp(`\`\`\`${codeFence}\\n([\\s\\S]*?)\`\`\``, "");
		const match = content.match(regex);
		return match?.[1] ?? null;
	} catch (error) {
		console.debug(`Error reading file ${file.path}:`, error);
		return null;
	}
}

export async function extractCategoryAllocations(vault: Vault, file: TFile): Promise<Map<string, number>> {
	const blockContent = await extractCodeBlockContent(vault, file, TIME_BUDGET_CODE_FENCE);
	if (!blockContent) {
		return new Map<string, number>();
	}

	return parseAllocationBlock(blockContent).allocations.reduce((allocations, allocation) => {
		allocations.set(allocation.categoryName, allocation.hours);
		return allocations;
	}, new Map<string, number>());
}

export function detectPeriodTypeFromFilename(
	file: TFile,
	settings: PeriodicPlannerSettings
): { periodType: PeriodType; dateTime: DateTime } | null {
	const filename = file.basename;
	const periodTypes: PeriodType[] = ["daily", "weekly", "monthly", "quarterly", "yearly"];

	for (const periodType of periodTypes) {
		const folder = settings.directories[PERIOD_CONFIG[periodType].folderKey] as string;
		if (!file.path.startsWith(folder)) continue;

		const format = settings.naming[PERIOD_CONFIG[periodType].formatKey] as string;
		const dateTime = DateTime.fromFormat(filename, format);

		if (dateTime.isValid) {
			return { periodType, dateTime };
		}
	}

	return null;
}

export function buildPeriodLinksForNote(
	dateTime: DateTime,
	periodType: PeriodType,
	settings: PeriodicPlannerSettings
): PeriodLinks {
	const prevDt = getPreviousPeriod(dateTime, periodType);
	const nextDt = getNextPeriod(dateTime, periodType);

	const formatLink = (dt: DateTime, type: PeriodType): string => {
		const folder = settings.directories[PERIOD_CONFIG[type].folderKey] as string;
		const format = settings.naming[PERIOD_CONFIG[type].formatKey] as string;
		const name = dt.toFormat(format);
		return `[[${folder}/${name}|${name}]]`;
	};

	const links: PeriodLinks = {
		previous: formatLink(prevDt, periodType),
		next: formatLink(nextDt, periodType),
	};

	const parentType = getEnabledParentPeriodType(periodType, settings.generation);
	if (parentType) {
		links.parent = formatLink(dateTime, parentType);
	}

	for (const ancestorType of getEnabledAncestorPeriodTypes(periodType, settings.generation)) {
		const { linkKey } = PERIOD_CONFIG[ancestorType];
		if (linkKey) {
			links[linkKey] = formatLink(dateTime, ancestorType);
		}
	}

	return links;
}

async function ensureFrontmatterPropertiesForFile(
	app: App,
	file: TFile,
	periodType: PeriodType,
	dateTime: DateTime,
	settings: PeriodicPlannerSettings
): Promise<void> {
	const props = settings.properties;
	const format = settings.naming[PERIOD_CONFIG[periodType].formatKey] as string;
	const periodInfo = createPeriodInfo(dateTime, periodType, format);
	const links = buildPeriodLinksForNote(dateTime, periodType, settings);
	const hoursAvailable = getHoursForPeriodType(settings.timeBudget, periodType);

	await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
		assignPeriodPropertiesToFrontmatter(fm, props, periodType, periodInfo, links, hoursAvailable, true);
	});
}

function extractPeriodData(frontmatter: Record<string, unknown>, props: PropertySettings) {
	return {
		periodType: frontmatter[props.periodTypeProp],
		periodStart: frontmatter[props.periodStartProp],
		periodEnd: frontmatter[props.periodEndProp],
	};
}

async function buildIndexedNote(
	file: TFile,
	frontmatter: Record<string, unknown>,
	vault: Vault,
	settings: PeriodicPlannerSettings,
	validatedData: {
		periodType: PeriodType;
		periodStart: DateTime;
		periodEnd: DateTime;
	}
): Promise<IndexedPeriodNote> {
	const props = settings.properties;
	const parentLinks = extractParentLinksFromFrontmatter(frontmatter, props);

	const rawHours: unknown = frontmatter[props.hoursAvailableProp];
	const hoursAvailable =
		typeof rawHours === "number" ? rawHours : getHoursForPeriodType(settings.timeBudget, validatedData.periodType);

	const categoryAllocations = await extractCategoryAllocations(vault, file);
	const totalHoursSpent = Array.from(categoryAllocations.values()).reduce((sum, hours) => sum + hours, 0);
	const roundedHoursSpent = Math.round(totalHoursSpent * 10) / 10;

	return {
		file,
		filePath: file.path,
		periodType: validatedData.periodType,
		periodStart: validatedData.periodStart,
		periodEnd: validatedData.periodEnd,
		noteName: file.basename,
		mtime: file.stat.mtime,
		hoursAvailable,
		hoursSpent: roundedHoursSpent,
		parentLinks,
		categoryAllocations,
	};
}

export async function updateHoursSpentInFrontmatter(
	app: App,
	file: TFile,
	hoursSpent: number,
	hoursSpentProp: string
): Promise<void> {
	await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
		if (hoursSpentProp) {
			fm[hoursSpentProp] = hoursSpent;
		}
	});
}

export async function parseFileToNote(
	file: TFile,
	frontmatter: Record<string, unknown>,
	vault: Vault,
	settings: PeriodicPlannerSettings,
	app?: App
): Promise<IndexedPeriodNote | null> {
	const props = settings.properties;
	const extracted = extractPeriodData(frontmatter, props);
	const result = FrontmatterSchema.safeParse(extracted);

	if (!result.success) {
		const detected = detectPeriodTypeFromFilename(file, settings);
		if (detected && app) {
			await ensureFrontmatterPropertiesForFile(app, file, detected.periodType, detected.dateTime, settings);

			const cache = app.metadataCache.getFileCache(file);
			if (cache?.frontmatter) {
				const retryExtracted = extractPeriodData(cache.frontmatter, props);
				const retryResult = FrontmatterSchema.safeParse(retryExtracted);
				if (retryResult.success) {
					return await buildIndexedNote(file, cache.frontmatter, vault, settings, retryResult.data);
				}
			}
		}

		return null;
	}

	return await buildIndexedNote(file, frontmatter, vault, settings, result.data);
}

export function getParentFilePathsFromLinks(
	note: IndexedPeriodNote
): Array<{ parentFilePath: string; childrenKey: keyof PeriodChildren }> {
	const results: Array<{
		parentFilePath: string;
		childrenKey: keyof PeriodChildren;
	}> = [];
	const childrenKey = PERIOD_CONFIG[note.periodType].childrenKey;
	if (!childrenKey) return results;

	const links = note.parentLinks;
	const parentLinkKeys = ["parent", "week", "month", "quarter", "year"] as const;

	for (const linkKey of parentLinkKeys) {
		const linkValue = links[linkKey];
		if (linkValue) {
			results.push({
				parentFilePath: resolveFilePath(linkValue),
				childrenKey,
			});
		}
	}

	return results;
}

export function getNotesByPeriodType(periodIndex: PeriodIndex, periodType: PeriodType): IndexedPeriodNote[] {
	return periodIndex.getNotesByPeriodType(periodType);
}
