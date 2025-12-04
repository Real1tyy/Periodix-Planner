import { DateTime } from "luxon";
import type { PeriodType } from "../constants";
import { PERIOD_CONFIG } from "../types";

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

export function generatePeriodSequence(
	startDt: DateTime,
	periodType: PeriodType,
	format: string,
	count: number
): PeriodInfo[] {
	const periods: PeriodInfo[] = [];
	let current = getStartOfPeriod(startDt, periodType);

	for (let i = 0; i < count; i++) {
		periods.push(createPeriodInfo(current, periodType, format));
		current = getNextPeriod(current, periodType);
	}

	return periods;
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
