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

export function getHoursForPeriodType(settings: TimeBudgetSettings, periodType: PeriodType): number {
	const hours = calculateHoursForPeriods(settings);
	return hours[periodType];
}

export function calculateRemainingHours(totalHours: number, allocatedHours: number): number {
	return Math.max(0, totalHours - allocatedHours);
}

export function calculateAllocationPercentage(totalHours: number, allocatedHours: number): number {
	if (totalHours === 0) return 0;
	return Math.round((allocatedHours / totalHours) * 100);
}

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

export interface AllocationSummary {
	totalHours: number;
	allocatedHours: number;
	remainingHours: number;
	percentage: number;
	status: BudgetStatus;
}

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

export function fillAllocationsFromParent(
	parentBudgets: Map<string, { categoryId: string; total: number }>,
	childTotalHours: number
): TimeAllocation[] {
	if (parentBudgets.size === 0 || childTotalHours <= 0) return [];

	const totalParentHours = Array.from(parentBudgets.values()).reduce((sum, b) => sum + b.total, 0);
	if (totalParentHours <= 0) return [];

	// Work in cents to avoid floating point errors
	const totalCents = Math.round(childTotalHours * 100);

	// Calculate floor cents and fractional remainders for each category
	const rows = Array.from(parentBudgets.values()).map(({ categoryId, total }) => {
		const raw = (total / totalParentHours) * totalCents;
		const floor = Math.floor(raw);
		return { categoryId, floor, frac: raw - floor };
	});

	// Calculate remaining cents to distribute
	const floorSum = rows.reduce((sum, r) => sum + r.floor, 0);
	let remaining = totalCents - floorSum;

	// Distribute remaining cents to categories with largest fractional remainders
	rows
		.slice()
		.sort((a, b) => b.frac - a.frac)
		.slice(0, Math.max(0, remaining))
		.forEach((r) => {
			r.floor += 1;
			remaining -= 1;
		});

	// Convert back to hours and filter out zero allocations
	return rows.map(({ categoryId, floor }) => ({ categoryId, hours: floor / 100 })).filter((a) => a.hours > 0);
}
