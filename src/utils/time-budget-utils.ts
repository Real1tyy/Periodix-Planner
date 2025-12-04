import type { PeriodType } from "../constants";
import type { TimeBudgetSettings } from "../types";

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
 * Uses the hoursPerWeek as the base and calculates others,
 * unless overrides are specified.
 */
export function calculateHoursForPeriods(settings: TimeBudgetSettings): CalculatedHours {
	const { hoursPerWeek } = settings;

	// Calculate base values from weekly hours
	const calculatedDaily = Math.round(hoursPerWeek / 7);
	const calculatedMonthly = Math.round((hoursPerWeek * 52) / 12);
	const calculatedQuarterly = Math.round((hoursPerWeek * 52) / 4);
	const calculatedYearly = hoursPerWeek * 52;

	return {
		daily: settings.hoursPerDayOverride ?? calculatedDaily,
		weekly: hoursPerWeek,
		monthly: settings.hoursPerMonthOverride ?? calculatedMonthly,
		quarterly: settings.hoursPerQuarterOverride ?? calculatedQuarterly,
		yearly: settings.hoursPerYearOverride ?? calculatedYearly,
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
