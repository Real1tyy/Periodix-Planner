import { DateTime } from "luxon";
import type { PeriodType } from "../constants";
import { PERIOD_CONFIG } from "../types";
import { extractFilenameFromPath } from "./frontmatter-utils";

export interface PeriodInfo {
	type: PeriodType;
	name: string;
	start: string;
	end: string;
	dateTime: DateTime;
}

export function formatPeriodName(dt: DateTime, format: string): string {
	return dt.toFormat(format);
}

export function getStartOfPeriod(dt: DateTime, periodType: PeriodType): DateTime {
	return dt.startOf(PERIOD_CONFIG[periodType].luxonUnit);
}

export function getEndOfPeriod(dt: DateTime, periodType: PeriodType): DateTime {
	return dt.endOf(PERIOD_CONFIG[periodType].luxonUnit);
}

export function getNextPeriod(dt: DateTime, periodType: PeriodType): DateTime {
	return dt.plus(PERIOD_CONFIG[periodType].duration);
}

export function getPreviousPeriod(dt: DateTime, periodType: PeriodType): DateTime {
	return dt.minus(PERIOD_CONFIG[periodType].duration);
}

export function createPeriodInfo(dt: DateTime, periodType: PeriodType, format: string): PeriodInfo {
	const periodStart = getStartOfPeriod(dt, periodType);
	const periodEnd = getEndOfPeriod(dt, periodType);

	return {
		type: periodType,
		name: formatPeriodName(periodStart, format),
		start: periodStart.toISO()!,
		end: periodEnd.toISO()!,
		dateTime: periodStart,
	};
}

export function getParentPeriodType(periodType: PeriodType): PeriodType | null {
	return PERIOD_CONFIG[periodType].parent;
}

export function getAncestorPeriodTypes(periodType: PeriodType): PeriodType[] {
	const ancestors: PeriodType[] = [];
	let current: PeriodType | null = periodType;

	while (current !== null) {
		const parent = getParentPeriodType(current);
		if (parent !== null) {
			ancestors.push(parent);
		}
		current = parent;
	}

	return ancestors;
}

export function isSamePeriod(dt1: DateTime, dt2: DateTime, periodType: PeriodType): boolean {
	const start1 = getStartOfPeriod(dt1, periodType);
	const start2 = getStartOfPeriod(dt2, periodType);
	return start1.equals(start2);
}

export function now(): DateTime {
	return DateTime.now();
}

export function parsePeriodName(name: string, format: string): DateTime | null {
	const parsed = DateTime.fromFormat(name, format);
	return parsed.isValid ? parsed : null;
}

export function formatPeriodDateRange(periodType: PeriodType, periodStart: DateTime, periodEnd: DateTime): string {
	switch (periodType) {
		case "daily":
			return periodStart.toFormat("EEE, MMM d");
		case "weekly":
			return `${periodStart.toFormat("MMM d")} - ${periodEnd.toFormat("MMM d")}`;
		case "monthly":
			return periodStart.toFormat("MMMM yyyy");
		case "quarterly":
			return `Q${periodStart.quarter} ${periodStart.year}`;
		case "yearly":
			return periodStart.toFormat("yyyy");
		default:
			return "";
	}
}

export function parseLinkToDateTime(linkTarget: string, format: string): DateTime | null {
	const filename = extractFilenameFromPath(linkTarget);
	return parsePeriodName(filename, format);
}
