import type { PeriodType } from "../constants";
import type { Category, TimeAllocation, TimeBudgetSettings } from "../types";

export function roundHours(hours: number): number {
	return Math.round(hours * 100) / 100;
}

export function formatHours(hours: number): string {
	return roundHours(hours).toFixed(2);
}

/**
 * Calculated hours for each period type based on settings
 */
export interface CalculatedHours {
	daily: number;
	weekly: number;
	monthly: number;
	quarterly: number;
	yearly: number;
}

/**
 * Calculates hours for all period types from time budget settings.
 * Always calculates from weekly hours as the base.
 */
export function calculateHoursForPeriods(settings: TimeBudgetSettings): CalculatedHours {
	const { hoursPerWeek } = settings;

	return {
		daily: Math.round(hoursPerWeek / 7),
		weekly: hoursPerWeek,
		monthly: Math.round((hoursPerWeek * 52) / 12),
		quarterly: Math.round((hoursPerWeek * 52) / 4),
		yearly: hoursPerWeek * 52,
	};
}

/**
 * Gets the hours available for a specific period type
 */
export function getHoursForPeriodType(settings: TimeBudgetSettings, periodType: PeriodType): number {
	const hours = calculateHoursForPeriods(settings);
	return hours[periodType];
}

/**
 * Calculates remaining hours after allocations
 */
export function calculateRemainingHours(totalHours: number, allocatedHours: number): number {
	return Math.max(0, totalHours - allocatedHours);
}

/**
 * Calculates the percentage of hours allocated
 */
export function calculateAllocationPercentage(totalHours: number, allocatedHours: number): number {
	if (totalHours === 0) return 0;
	return Math.round((allocatedHours / totalHours) * 100);
}

/**
 * Determines the budget status based on allocation percentage
 */
export type BudgetStatus = "under" | "warning" | "over";

export function getBudgetStatus(
	allocationPercentage: number,
	warningThreshold: number,
	overThreshold: number
): BudgetStatus {
	if (allocationPercentage >= overThreshold) {
		return "over";
	}
	if (allocationPercentage >= warningThreshold) {
		return "warning";
	}
	return "under";
}

/**
 * Summary of time allocation for a period
 */
export interface AllocationSummary {
	totalHours: number;
	allocatedHours: number;
	remainingHours: number;
	percentage: number;
	status: BudgetStatus;
}

/**
 * Creates an allocation summary for a period
 */
export function createAllocationSummary(
	totalHours: number,
	allocatedHours: number,
	warningThreshold: number,
	overThreshold: number
): AllocationSummary {
	const remainingHours = calculateRemainingHours(totalHours, allocatedHours);
	const percentage = calculateAllocationPercentage(totalHours, allocatedHours);
	const status = getBudgetStatus(percentage, warningThreshold, overThreshold);

	return {
		totalHours,
		allocatedHours,
		remainingHours,
		percentage,
		status,
	};
}

export function sortCategoriesByName(categories: Category[]): Category[] {
	return [...categories].sort((a, b) => a.name.localeCompare(b.name));
}

export function sortAllocationsByCategoryName(allocations: TimeAllocation[], categories: Category[]): TimeAllocation[] {
	const categoryMap = new Map(categories.map((c) => [c.id, c]));
	return [...allocations].sort((a, b) => {
		const categoryA = categoryMap.get(a.categoryId);
		const categoryB = categoryMap.get(b.categoryId);
		const nameA = categoryA?.name ?? "";
		const nameB = categoryB?.name ?? "";
		return nameA.localeCompare(nameB);
	});
}

/**
 * Fills child allocations based on parent allocation percentages.
 * Uses integer arithmetic (cents) to ensure the sum of child allocations
 * exactly equals the child's total hours with ZERO rounding errors.
 *
 * Algorithm (Largest Remainder Method):
 * 1. Convert everything to cents (multiply by 100) to work with integers
 * 2. Calculate raw allocation in cents for each category
 * 3. Floor each allocation to get initial cents
 * 4. Distribute remaining cents to categories with largest remainders
 * 5. Convert back to hours (divide by 100)
 *
 * This guarantees: sum of allocations === childTotalHours (exact equality)
 *
 * @param parentBudgets - Parent budget information per category
 * @param childTotalHours - Total hours available in the child period
 * @returns Array of time allocations matching parent percentages exactly
 */
export function fillAllocationsFromParent(
	parentBudgets: Map<string, { categoryId: string; total: number }>,
	childTotalHours: number
): TimeAllocation[] {
	if (parentBudgets.size === 0 || childTotalHours <= 0) {
		return [];
	}

	// Calculate total parent allocated hours
	let totalParentHours = 0;
	for (const budget of parentBudgets.values()) {
		totalParentHours += budget.total;
	}

	if (totalParentHours === 0) {
		return [];
	}

	// Work in cents to avoid floating point errors
	const childTotalCents = Math.round(childTotalHours * 100);

	interface AllocationData {
		categoryId: string;
		rawCents: number;
		floorCents: number;
		remainder: number;
	}

	const allocationData: AllocationData[] = [];
	let totalFloorCents = 0;

	// Calculate allocations in cents
	for (const budget of parentBudgets.values()) {
		const percentage = budget.total / totalParentHours;
		const rawCents = percentage * childTotalCents;
		const floorCents = Math.floor(rawCents);
		const remainder = rawCents - floorCents;

		allocationData.push({
			categoryId: budget.categoryId,
			rawCents,
			floorCents,
			remainder,
		});

		totalFloorCents += floorCents;
	}

	// Sort by remainder (descending) for largest remainder method
	allocationData.sort((a, b) => b.remainder - a.remainder);

	// Distribute the remaining cents to categories with largest remainders
	let remainingCents = childTotalCents - totalFloorCents;

	const allocations: TimeAllocation[] = [];
	for (const data of allocationData) {
		let finalCents = data.floorCents;

		// Add 1 cent if we still have remaining cents to distribute
		if (remainingCents > 0) {
			finalCents += 1;
			remainingCents -= 1;
		}

		// Convert back to hours
		const hours = finalCents / 100;

		if (hours > 0) {
			allocations.push({
				categoryId: data.categoryId,
				hours,
			});
		}
	}

	return allocations;
}
