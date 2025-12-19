import type { PeriodType } from "../constants";
import { ORDERED_PERIOD_TYPES, PERIOD_CONFIG } from "../types/config";
import type { PeriodChildren } from "../types/period";
import type { GenerationSettings } from "../types/schemas";

export function getEnabledPeriodTypes(settings: GenerationSettings): PeriodType[] {
	return ORDERED_PERIOD_TYPES.filter((periodType) => isPeriodTypeEnabled(periodType, settings));
}

export function isPeriodTypeEnabled(periodType: PeriodType, settings: GenerationSettings): boolean {
	switch (periodType) {
		case "yearly":
			return settings.enableYearly;
		case "quarterly":
			return settings.enableQuarterly;
		case "monthly":
			return settings.enableMonthly;
		case "weekly":
			return settings.enableWeekly;
		case "daily":
			return settings.enableDaily;
		default:
			return false;
	}
}

/**
 * Get the direct neighbor period type (parent/child) for a given period type, skipping disabled periods.
 * Offset: use -1 for parent, +1 for child.
 * Returns null if no enabled neighbor exists.
 */
function getEnabledNeighborPeriodType(
	periodType: PeriodType,
	settings: GenerationSettings,
	offset: number
): PeriodType | null {
	const enabledTypes = getEnabledPeriodTypes(settings);
	const currentIndex = enabledTypes.indexOf(periodType);
	const neighborIndex = currentIndex + offset;

	if (currentIndex === -1 || neighborIndex < 0 || neighborIndex >= enabledTypes.length) {
		return null;
	}

	return enabledTypes[neighborIndex];
}

export function getEnabledParentPeriodType(periodType: PeriodType, settings: GenerationSettings): PeriodType | null {
	return getEnabledNeighborPeriodType(periodType, settings, -1);
}

export function getEnabledChildPeriodType(periodType: PeriodType, settings: GenerationSettings): PeriodType | null {
	return getEnabledNeighborPeriodType(periodType, settings, 1);
}

/**
 * Get a slice of enabled period types relative to the given period type.
 * Returns empty array if period type is not enabled.
 */
function getRelativePeriodTypesSlice(
	periodType: PeriodType,
	settings: GenerationSettings,
	startOffset: number,
	endOffset?: number
): PeriodType[] {
	const enabledTypes = getEnabledPeriodTypes(settings);
	const currentIndex = enabledTypes.indexOf(periodType);

	if (currentIndex === -1) {
		return [];
	}

	const sliceStart = currentIndex + startOffset;
	const sliceEnd = endOffset === undefined ? undefined : currentIndex + endOffset;

	return enabledTypes.slice(sliceStart, sliceEnd);
}

export function getEnabledAncestorPeriodTypes(periodType: PeriodType, settings: GenerationSettings): PeriodType[] {
	return getRelativePeriodTypesSlice(periodType, settings, -Infinity, 0);
}

export function getEnabledDescendantPeriodTypes(periodType: PeriodType, settings: GenerationSettings): PeriodType[] {
	return getRelativePeriodTypesSlice(periodType, settings, 1);
}

/**
 * Get the children key for the direct enabled child of a period type.
 * Returns null if no enabled child exists.
 */
export function getEnabledChildrenKey(
	periodType: PeriodType,
	settings: GenerationSettings
): keyof PeriodChildren | null {
	const childType = getEnabledChildPeriodType(periodType, settings);
	if (!childType) return null;

	return PERIOD_CONFIG[childType].childrenKey;
}

/**
 * Get the link key for a period type if it's enabled and has a link key.
 * Returns null if the period type is disabled or has no link key.
 */
export function getEnabledLinkKey(periodType: PeriodType, settings: GenerationSettings): string | null {
	if (!isPeriodTypeEnabled(periodType, settings)) {
		return null;
	}

	const linkKey = PERIOD_CONFIG[periodType].linkKey;
	return typeof linkKey === "string" ? linkKey : null;
}
