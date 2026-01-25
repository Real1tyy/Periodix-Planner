import type { CategoryBudgetInfo } from "../components/time-budget/parent-budget-tracker";
import type { PeriodType } from "../constants";
import type { Category, TimeAllocation, TimeBudgetSettings } from "../types";

export function roundHours(hours: number): number {
	return Math.round(hours * 100) / 100;
}

export function formatHours(hours: number): string {
	return roundHours(hours).toFixed(2);
}

export function formatInputValue(hours: number): string {
	if (hours <= 0) {
		return "";
	}
	const rounded = Math.round(hours * 1000) / 1000;
	return rounded.toString();
}

export function formatSecondsToHours(seconds: number): string {
	return (seconds / 3600).toFixed(2);
}

export function formatSecondsToHoursMinutes(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	if (hours > 0 && minutes > 0) {
		return `${hours}h ${minutes}m`;
	}
	if (hours > 0) {
		return `${hours}h`;
	}
	return `${minutes}m`;
}

/**
 * Calculated hours for each period type based on settings
 */
interface CalculatedHours {
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

export function calculatePercentage(value: number, total: number): number {
	return total > 0 ? (value / total) * 100 : 0;
}

export function formatHoursWithPercentage(hours: number, percentage: number): string {
	return `${formatHours(hours)}h (${percentage.toFixed(1)}%)`;
}

export function formatBudgetDisplay(allocated: number, total: number, percentage: number): string {
	return `${formatHours(allocated)}h / ${formatHours(total)}h (${percentage.toFixed(1)}%)`;
}

type BudgetStatus = "under" | "warning" | "over";

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

interface AllocationSummary {
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

export function sortAllocationsByCategoryName(allocations: TimeAllocation[]): TimeAllocation[] {
	return [...allocations].sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}

export function fillAllocationsFromParent(
	parentBudgets: Map<string, CategoryBudgetInfo>,
	childTotalHours: number
): TimeAllocation[] {
	if (parentBudgets.size === 0 || childTotalHours <= 0) return [];

	const totalParentHours = Array.from(parentBudgets.values()).reduce((sum, b) => sum + b.total, 0);
	if (totalParentHours <= 0) return [];

	const totalCents = Math.round(childTotalHours * 100);

	const rows = Array.from(parentBudgets.values()).map(({ categoryName, total }) => {
		const raw = (total / totalParentHours) * totalCents;
		const floor = Math.floor(raw);
		return { categoryName, floor, frac: raw - floor };
	});

	const floorSum = rows.reduce((sum, r) => sum + r.floor, 0);
	let remaining = totalCents - floorSum;

	rows
		.slice()
		.sort((a, b) => b.frac - a.frac)
		.slice(0, Math.max(0, remaining))
		.forEach((r) => {
			r.floor += 1;
			remaining -= 1;
		});

	const allocations = rows.map(({ categoryName, floor }) => ({
		categoryName,
		hours: floor / 100,
	}));

	// CRITICAL: Defensive clamping to ensure sum never exceeds childTotalHours
	// This handles edge cases where floating point arithmetic might cause tiny overflows
	let sum = allocations.reduce((acc, a) => acc + a.hours, 0);

	// If sum exceeds childTotalHours (even by floating point error), clamp it down
	while (sum > childTotalHours) {
		// Find the largest allocation and reduce it by the smallest possible amount
		const sorted = [...allocations].sort((a, b) => b.hours - a.hours);
		if (sorted.length === 0) break;

		const largest = allocations.find((a) => a.categoryName === sorted[0].categoryName);
		if (!largest || largest.hours <= 0) break;

		// Reduce by 0.01 (smallest unit we work with)
		largest.hours = roundHours(largest.hours - 0.01);

		// Recalculate sum
		sum = allocations.reduce((acc, a) => acc + a.hours, 0);

		if (allocations.filter((a) => a.hours > 0).length === 0) break;
	}

	return allocations.filter((a) => a.hours > 0);
}
