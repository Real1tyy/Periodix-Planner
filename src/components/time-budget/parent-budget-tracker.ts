import { type App, type CachedMetadata, TFile } from "obsidian";
import type { PeriodType } from "../../constants";
import type { Category, PeriodicPlannerSettings, PropertySettings, TimeAllocation } from "../../types";
import { PERIOD_CONFIG } from "../../types";
import { parseAllocationBlock, resolveAllocations } from "./allocation-parser";

export interface CategoryBudgetInfo {
	categoryId: string;
	total: number;
	allocated: number;
	remaining: number;
}

export interface ParentBudgetResult {
	parentFile: TFile | null;
	parentPeriodType: PeriodType | null;
	budgets: Map<string, CategoryBudgetInfo>;
	totalParentHours: number;
	totalAllocatedInParent: number;
}

export async function getParentBudgets(
	app: App,
	file: TFile,
	periodType: PeriodType,
	settings: PeriodicPlannerSettings
): Promise<ParentBudgetResult> {
	const emptyResult: ParentBudgetResult = {
		parentFile: null,
		parentPeriodType: null,
		budgets: new Map(),
		totalParentHours: 0,
		totalAllocatedInParent: 0,
	};

	const parentPeriodType = PERIOD_CONFIG[periodType].parent;
	if (!parentPeriodType) {
		return emptyResult;
	}

	const cache = app.metadataCache.getFileCache(file);
	if (!cache?.frontmatter) {
		return emptyResult;
	}

	const parentFile = resolveParentFile(app, cache, parentPeriodType, settings.properties);
	if (!parentFile) {
		return emptyResult;
	}

	const parentAllocations = await extractAllocationsFromFile(app, parentFile, settings.categories);
	const parentCache = app.metadataCache.getFileCache(parentFile);
	const rawHours: unknown = parentCache?.frontmatter?.[settings.properties.hoursAvailableProp];
	const totalParentHours = typeof rawHours === "number" ? rawHours : 0;

	const budgets = new Map<string, CategoryBudgetInfo>();
	let totalAllocatedInParent = 0;

	for (const allocation of parentAllocations) {
		totalAllocatedInParent += allocation.hours;
		budgets.set(allocation.categoryId, {
			categoryId: allocation.categoryId,
			total: allocation.hours,
			allocated: 0,
			remaining: allocation.hours,
		});
	}

	const siblingAllocations = await getSiblingAllocations(app, file, parentFile, parentPeriodType, periodType, settings);

	for (const [categoryId, allocatedHours] of siblingAllocations) {
		const budget = budgets.get(categoryId);
		if (budget) {
			budget.allocated = allocatedHours;
			budget.remaining = budget.total - allocatedHours;
		}
	}

	return {
		parentFile,
		parentPeriodType,
		budgets,
		totalParentHours,
		totalAllocatedInParent,
	};
}

function resolveParentFile(
	app: App,
	cache: CachedMetadata,
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

	const linkPath = linkMatch[1];
	const file = app.metadataCache.getFirstLinkpathDest(linkPath, "");

	return file instanceof TFile ? file : null;
}

async function extractAllocationsFromFile(app: App, file: TFile, categories: Category[]): Promise<TimeAllocation[]> {
	const content = await app.vault.read(file);
	const codeBlockMatch = content.match(/```periodic-planner\n([\s\S]*?)```/);

	if (!codeBlockMatch) {
		return [];
	}

	const parsed = parseAllocationBlock(codeBlockMatch[1]);
	const { resolved } = resolveAllocations(parsed.allocations, categories);

	return resolved;
}

async function getSiblingAllocations(
	app: App,
	currentFile: TFile,
	parentFile: TFile,
	_parentPeriodType: PeriodType,
	childPeriodType: PeriodType,
	settings: PeriodicPlannerSettings
): Promise<Map<string, number>> {
	const aggregated = new Map<string, number>();

	const folder = settings.directories[PERIOD_CONFIG[childPeriodType].folderKey];
	const siblingFiles = app.vault.getMarkdownFiles().filter((f) => {
		if (f.path === currentFile.path) return false;
		if (!f.path.startsWith(folder)) return false;

		const cache = app.metadataCache.getFileCache(f);
		if (!cache?.frontmatter) return false;

		const linkKey = PERIOD_CONFIG[settings.properties.yearProp ? childPeriodType : childPeriodType].linkKey;
		if (!linkKey) return false;

		return isSiblingOfParent(app, f, parentFile, childPeriodType, settings.properties);
	});

	for (const sibling of siblingFiles) {
		const allocations = await extractAllocationsFromFile(app, sibling, settings.categories);
		for (const allocation of allocations) {
			const current = aggregated.get(allocation.categoryId) ?? 0;
			aggregated.set(allocation.categoryId, current + allocation.hours);
		}
	}

	return aggregated;
}

function isSiblingOfParent(
	_app: App,
	file: TFile,
	parentFile: TFile,
	childPeriodType: PeriodType,
	properties: PropertySettings
): boolean {
	const cache = _app.metadataCache.getFileCache(file);
	if (!cache?.frontmatter) return false;

	const parentType = PERIOD_CONFIG[childPeriodType].parent;
	if (!parentType) return false;

	const linkKey = PERIOD_CONFIG[parentType].linkKey;
	if (!linkKey) return false;

	const propKey = `${linkKey}Prop`;
	const propName = properties[propKey as keyof PropertySettings];
	if (typeof propName !== "string") return false;

	const linkValue: unknown = cache.frontmatter?.[propName];
	if (!linkValue || typeof linkValue !== "string") return false;

	const linkMatch = linkValue.match(/\[\[([^\]|]+)/);
	if (!linkMatch) return false;

	const linkedPath = linkMatch[1];
	const parentPath = parentFile.path.replace(/\.md$/, "");

	return linkedPath === parentPath || linkedPath === parentFile.basename;
}
