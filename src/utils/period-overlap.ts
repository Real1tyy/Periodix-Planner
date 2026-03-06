import type { DateTime } from "luxon";
import type { IndexedPeriodNote } from "../types";

interface PeriodOverlap {
	overlapDays: number;
	totalDays: number;
	proportion: number;
}

export function calculatePeriodOverlap(
	childStart: DateTime,
	childEnd: DateTime,
	parentStart: DateTime,
	parentEnd: DateTime
): PeriodOverlap {
	const cStart = childStart.toUTC().startOf("day");
	const cEnd = childEnd.toUTC().startOf("day");
	const pStart = parentStart.toUTC().startOf("day");
	const pEnd = parentEnd.toUTC().startOf("day");

	const totalDays = Math.round(cEnd.diff(cStart, "days").days) + 1;

	const overlapStart = cStart > pStart ? cStart : pStart;
	const overlapEnd = cEnd < pEnd ? cEnd : pEnd;

	if (overlapStart > overlapEnd) {
		return { overlapDays: 0, totalDays, proportion: 0 };
	}

	const overlapDays = Math.round(overlapEnd.diff(overlapStart, "days").days) + 1;
	const proportion = overlapDays / totalDays;

	return { overlapDays, totalDays, proportion };
}

export function weekSpansTwoMonths(weekStart: DateTime, weekEnd: DateTime): boolean {
	return weekStart.month !== weekEnd.month;
}

export function getSecondaryMonthPath(weekEnd: DateTime, monthlyFolder: string, monthlyFormat: string): string {
	const monthStart = weekEnd.startOf("month");
	const monthName = monthStart.toFormat(monthlyFormat);
	return `${monthlyFolder}/${monthName}`;
}

export function getChildWeight(child: IndexedPeriodNote, parentNote: IndexedPeriodNote): number {
	if (child.periodType !== "weekly" || parentNote.periodType !== "monthly") {
		return 1;
	}

	if (!weekSpansTwoMonths(child.periodStart, child.periodEnd)) {
		return 1;
	}

	const { proportion } = calculatePeriodOverlap(
		child.periodStart,
		child.periodEnd,
		parentNote.periodStart,
		parentNote.periodEnd
	);

	return proportion;
}
