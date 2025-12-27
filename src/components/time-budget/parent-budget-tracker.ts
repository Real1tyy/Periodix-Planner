import type { TFile } from "obsidian";
import type { PeriodIndex } from "../../core/period-index";
import type { Category, IndexedPeriodNote, PeriodicPlannerSettings, TimeAllocation } from "../../types";
import { resolveFilePath } from "../../utils/frontmatter-utils";
import { getEnabledParentPeriodType } from "../../utils/period-navigation";
import { calculateChildAllocatedForNode } from "./child-budget-calculator";

export interface CategoryBudgetInfo {
	categoryId: string;
	total: number;
	allocated: number;
	remaining: number;
}

interface ParentBudgetResult {
	parentFile: TFile | null;
	budgets: Map<string, CategoryBudgetInfo>;
	totalParentHours: number;
	totalAllocatedInParent: number;
}

export async function getParentBudgets(
	entry: IndexedPeriodNote,
	settings: PeriodicPlannerSettings,
	periodIndex: PeriodIndex
): Promise<ParentBudgetResult> {
	const emptyResult: ParentBudgetResult = {
		parentFile: null,
		budgets: new Map(),
		totalParentHours: 0,
		totalAllocatedInParent: 0,
	};

	const enabledParentType = getEnabledParentPeriodType(entry.periodType, settings.generation);
	const parentLink = entry.parentLinks.parent;
	if (!parentLink || !enabledParentType) {
		return emptyResult;
	}
	const parentFilePath = resolveFilePath(parentLink);
	const parentNote = periodIndex.getEntryByPath(parentFilePath);

	if (!parentNote) {
		return emptyResult;
	}

	const categoryNameToId = buildCategoryNameToIdMap(settings.categories);
	const parentAllocations: TimeAllocation[] = [];
	for (const [categoryName, hours] of parentNote.categoryAllocations) {
		const categoryId = categoryNameToId.get(categoryName);
		if (categoryId) {
			parentAllocations.push({ categoryId, hours });
		}
	}

	const childAllocatedBudgets = calculateChildAllocatedForNode(
		parentNote.file,
		parentNote.periodType,
		parentAllocations,
		periodIndex,
		settings.categories,
		settings.generation
	);

	const budgets = new Map<string, CategoryBudgetInfo>();
	let totalAllocatedInParent = 0;

	for (const [categoryName, hours] of parentNote.categoryAllocations) {
		const categoryId = categoryNameToId.get(categoryName);
		if (categoryId) {
			const childAllocated = childAllocatedBudgets.get(categoryId);
			const allocated = childAllocated?.allocated ?? 0;
			totalAllocatedInParent += allocated;
			budgets.set(categoryId, {
				categoryId,
				total: hours,
				allocated,
				remaining: hours - allocated,
			});
		}
	}

	return {
		parentFile: parentNote.file,
		budgets,
		totalParentHours: parentNote.hoursAvailable,
		totalAllocatedInParent,
	};
}

export const buildCategoryNameToIdMap = (categories: Category[]): Map<string, string> => {
	const categoryNameToId = new Map<string, string>();
	for (const category of categories) {
		categoryNameToId.set(category.name, category.id);
	}
	return categoryNameToId;
};
