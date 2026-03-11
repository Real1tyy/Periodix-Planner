import type { DateTime } from "luxon";

import type { PeriodType } from "../constants";
import type { PrismaCalendarData } from "../types/prisma-calendar";
import { generateCodeBlock } from "../utils/integration-shared";
import { formatSecondsToHoursMinutes } from "../utils/time-budget-utils";

interface PrismaStatEntry {
	name: string;
	duration: number;
	durationFormatted: string;
	percentage: string;
	count: number;
	isRecurring: boolean;
}

interface PrismaStatisticsOutput {
	periodStart: string;
	periodEnd: string;
	interval: "day" | "week" | "month";
	mode: "name" | "category";
	totalDuration: number;
	totalDurationFormatted: string;
	totalEvents: number;
	timedEvents: number;
	allDayEvents: number;
	skippedEvents: number;
	doneEvents: number;
	undoneEvents: number;
	entries: PrismaStatEntry[];
}

interface PrismaCalendarApi {
	isPro?: () => boolean;
	getStatistics(input?: {
		date?: string;
		interval?: "day" | "week" | "month";
		mode?: "name" | "category";
	}): Promise<PrismaStatisticsOutput | null>;
}

const PERIOD_TYPE_TO_INTERVAL: Record<string, "day" | "week" | "month" | null> = {
	daily: "day",
	weekly: "week",
	monthly: "month",
	quarterly: null,
	yearly: null,
};

export class PrismaCalendarService {
	private getApi(): PrismaCalendarApi | null {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const api = (window as any).PrismaCalendar as PrismaCalendarApi | undefined;
		if (!api) {
			return null;
		}
		return api;
	}

	static isPrismaAvailable(): boolean {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return !!(window as any).PrismaCalendar;
	}

	static isPrismaPro(): boolean {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const api = (window as any).PrismaCalendar as PrismaCalendarApi | undefined;
		return !!api?.isPro?.();
	}

	async getStatisticsForPeriod(
		periodStart: DateTime,
		periodEnd: DateTime,
		periodType: PeriodType,
		mode: "name" | "category"
	): Promise<PrismaCalendarData | null> {
		const api = this.getApi();
		if (!api) {
			throw new Error("Prisma Calendar plugin is not installed or not enabled");
		}

		if (typeof api.getStatistics !== "function") {
			throw new Error(
				"Prisma Calendar integration requires Prisma Calendar Pro. Visit https://matejvavroproductivity.com/tools/prisma-calendar/ to upgrade."
			);
		}

		const interval = PERIOD_TYPE_TO_INTERVAL[periodType];

		if (interval) {
			return this.querySingleInterval(api, periodStart, interval, mode);
		}

		return this.queryAggregatedMonths(api, periodStart, periodEnd, mode);
	}

	private async querySingleInterval(
		api: PrismaCalendarApi,
		date: DateTime,
		interval: "day" | "week" | "month",
		mode: "name" | "category"
	): Promise<PrismaCalendarData | null> {
		const result = await api.getStatistics({
			date: date.toISODate()!,
			interval,
			mode,
		});

		if (!result) return null;
		return this.toStoredData(result, mode);
	}

	private async queryAggregatedMonths(
		api: PrismaCalendarApi,
		periodStart: DateTime,
		periodEnd: DateTime,
		mode: "name" | "category"
	): Promise<PrismaCalendarData | null> {
		const results: PrismaStatisticsOutput[] = [];
		let current = periodStart.startOf("month");

		while (current < periodEnd) {
			const result = await api.getStatistics({
				date: current.toISODate()!,
				interval: "month",
				mode,
			});
			if (result) results.push(result);
			current = current.plus({ months: 1 });
		}

		if (results.length === 0) return null;
		return this.mergeResults(results, mode);
	}

	private mergeResults(results: PrismaStatisticsOutput[], mode: "name" | "category"): PrismaCalendarData {
		const entryMap = new Map<string, { duration: number; count: number }>();

		let totalDuration = 0;
		let totalEvents = 0;
		let timedEvents = 0;
		let allDayEvents = 0;
		let skippedEvents = 0;
		let doneEvents = 0;
		let undoneEvents = 0;

		for (const result of results) {
			totalDuration += result.totalDuration;
			totalEvents += result.totalEvents;
			timedEvents += result.timedEvents;
			allDayEvents += result.allDayEvents;
			skippedEvents += result.skippedEvents;
			doneEvents += result.doneEvents;
			undoneEvents += result.undoneEvents;

			for (const entry of result.entries) {
				const existing = entryMap.get(entry.name);
				if (existing) {
					existing.duration += entry.duration;
					existing.count += entry.count;
				} else {
					entryMap.set(entry.name, { duration: entry.duration, count: entry.count });
				}
			}
		}

		const entries = Array.from(entryMap.entries())
			.map(([name, { duration, count }]) => ({
				name,
				duration,
				durationFormatted: formatSecondsToHoursMinutes(duration / 1000),
				percentage: totalDuration > 0 ? `${((duration / totalDuration) * 100).toFixed(1)}%` : "0.0%",
				count,
			}))
			.sort((a, b) => b.duration - a.duration);

		return {
			totalDuration,
			totalDurationFormatted: formatSecondsToHoursMinutes(totalDuration / 1000),
			totalEvents,
			timedEvents,
			allDayEvents,
			skippedEvents,
			doneEvents,
			undoneEvents,
			mode,
			entries,
		};
	}

	private toStoredData(result: PrismaStatisticsOutput, mode: "name" | "category"): PrismaCalendarData {
		return {
			totalDuration: result.totalDuration,
			totalDurationFormatted: result.totalDurationFormatted,
			totalEvents: result.totalEvents,
			timedEvents: result.timedEvents,
			allDayEvents: result.allDayEvents,
			skippedEvents: result.skippedEvents,
			doneEvents: result.doneEvents,
			undoneEvents: result.undoneEvents,
			mode,
			entries: result.entries.map((e) => ({
				name: e.name,
				duration: e.duration,
				durationFormatted: e.durationFormatted,
				percentage: e.percentage,
				count: e.count,
			})),
		};
	}

	static generateCodeBlock(data: PrismaCalendarData, codeFenceName: string): string {
		return generateCodeBlock(data, codeFenceName);
	}
}
