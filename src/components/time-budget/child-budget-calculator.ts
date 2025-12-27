import type { TFile } from "obsidian";
import type { PeriodType } from "../../constants";
import type { PeriodIndex } from "../../core/period-index";
import type { Category, GenerationSettings, TimeAllocation } from "../../types";
import { getEnabledChildrenKey } from "../../utils/period-navigation";
import { buildCategoryNameToIdMap, type CategoryBudgetInfo } from "./parent-budget-tracker";

interface ChildBudgetResult {
	budgets: Map<string, CategoryBudgetInfo>;
	totalChildrenAllocated: number;
}

export function calculateChildAllocatedForNode(
	file: TFile,
	periodType: PeriodType,
	allocations: TimeAllocation[],
	periodIndex: PeriodIndex,
	categories: Category[],
	generationSettings: GenerationSettings
): Map<string, CategoryBudgetInfo> {
	const budgets = new Map<string, CategoryBudgetInfo>();

	if (periodType === "daily") {
		return budgets;
	}

	const children = periodIndex.getChildrenForFile(file);
	if (!children) {
		return budgets;
	}

	const directChildrenKey = getEnabledChildrenKey(periodType, generationSettings);
	if (!directChildrenKey) {
		return budgets;
	}

	const directChildren = children[directChildrenKey] ?? [];
	const categoryNameToId = buildCategoryNameToIdMap(categories);

	for (const allocation of allocations) {
		budgets.set(allocation.categoryId, {
			categoryId: allocation.categoryId,
			total: allocation.hours,
			allocated: 0,
			remaining: allocation.hours,
		});
	}

	for (const child of directChildren) {
		for (const [categoryName, hours] of child.categoryAllocations) {
			const categoryId = categoryNameToId.get(categoryName);
			if (categoryId) {
				const budget = budgets.get(categoryId);
				if (budget) {
					budget.allocated += hours;
				}
			}
		}
	}

	for (const budget of budgets.values()) {
		budget.remaining = budget.total - budget.allocated;
	}

	return budgets;
}

export function getChildBudgetsFromIndex(
	file: TFile,
	periodType: PeriodType,
	currentAllocations: TimeAllocation[],
	periodIndex: PeriodIndex,
	categories: Category[],
	generationSettings: GenerationSettings
): ChildBudgetResult {
	const budgets = calculateChildAllocatedForNode(
		file,
		periodType,
		currentAllocations,
		periodIndex,
		categories,
		generationSettings
	);

	const totalChildrenAllocated = Array.from(budgets.values()).reduce((sum, budget) => {
		return sum + budget.allocated;
	}, 0);

	return { budgets, totalChildrenAllocated };
}
