import type { TFile } from "obsidian";
import type { PeriodIndex } from "../../core/period-index";
import type { Category, IndexedPeriodNote, PeriodicPlannerSettings } from "../../types";
import { resolveFilePath } from "../../utils/frontmatter-utils";

export interface CategoryBudgetInfo {
	categoryId: string;
	total: number;
	allocated: number;
	remaining: number;
}

export interface ParentBudgetResult {
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

	const parentLink = entry.parentLinks.parent;
	if (!parentLink) {
		return emptyResult;
	}
	const parentFilePath = resolveFilePath(parentLink);
	const parentNote = periodIndex.getEntryByPath(parentFilePath);

	if (!parentNote) {
		return emptyResult;
	}

	const categoryNameToId = buildCategoryNameToIdMap(settings.categories);
	const budgets = new Map<string, CategoryBudgetInfo>();
	let totalAllocatedInParent = 0;

	for (const [categoryName, hours] of parentNote.categoryAllocations) {
		const categoryId = categoryNameToId.get(categoryName);
		if (categoryId) {
			totalAllocatedInParent += hours;
			budgets.set(categoryId, {
				categoryId,
				total: hours,
				allocated: 0,
				remaining: hours,
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
