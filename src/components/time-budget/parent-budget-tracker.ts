import type { TFile } from "obsidian";
import type { PeriodIndex } from "../../core/period-index";
import type { IndexedPeriodNote, PeriodicPlannerSettings, TimeAllocation } from "../../types";
import { resolveFilePath } from "../../utils/frontmatter-utils";
import { getEnabledParentPeriodType } from "../../utils/period-navigation";
import { calculateChildAllocatedForNode } from "./child-budget-calculator";

export interface CategoryBudgetInfo {
	categoryName: string;
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

	const parentAllocations: TimeAllocation[] = [];
	for (const [categoryName, hours] of parentNote.categoryAllocations) {
		parentAllocations.push({ categoryName, hours });
	}

	const childAllocatedBudgets = calculateChildAllocatedForNode(
		parentNote.file,
		parentNote.periodType,
		parentAllocations,
		periodIndex,
		settings.generation
	);

	const budgets = new Map<string, CategoryBudgetInfo>();
	let totalAllocatedInParent = 0;

	for (const [categoryName, hours] of parentNote.categoryAllocations) {
		const childAllocated = childAllocatedBudgets.get(categoryName);
		const allocated = childAllocated?.allocated ?? 0;
		totalAllocatedInParent += allocated;
		budgets.set(categoryName, {
			categoryName,
			total: hours,
			allocated,
			remaining: hours - allocated,
		});
	}

	return {
		parentFile: parentNote.file,
		budgets,
		totalParentHours: parentNote.hoursAvailable,
		totalAllocatedInParent,
	};
}
