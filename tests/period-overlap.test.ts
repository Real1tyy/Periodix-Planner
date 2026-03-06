import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import type { PeriodType } from "../src/constants";
import type { IndexedPeriodNote } from "../src/types";
import {
	calculatePeriodOverlap,
	getChildWeight,
	getSecondaryMonthPath,
	weekSpansTwoMonths,
} from "../src/utils/period-overlap";
import { TFile as MockTFile } from "./mocks/obsidian";

const createMockNote = (periodType: PeriodType, start: string, end: string): IndexedPeriodNote => {
	const file = new MockTFile("test.md");
	(file as { stat?: { mtime: number } }).stat = { mtime: Date.now() };
	return {
		file: file as unknown as import("obsidian").TFile,
		filePath: file.path,
		periodType,
		periodStart: DateTime.fromISO(start),
		periodEnd: DateTime.fromISO(end),
		noteName: "test",
		mtime: Date.now(),
		hoursAvailable: 40,
		hoursSpent: 0,
		parentLinks: {},
		categoryAllocations: new Map(),
	};
};

describe("Period Overlap Utilities", () => {
	describe("calculatePeriodOverlap", () => {
		it("should return full overlap when child is entirely within parent", () => {
			const childStart = DateTime.fromISO("2026-01-05");
			const childEnd = DateTime.fromISO("2026-01-11");
			const parentStart = DateTime.fromISO("2026-01-01");
			const parentEnd = DateTime.fromISO("2026-01-31");

			const result = calculatePeriodOverlap(childStart, childEnd, parentStart, parentEnd);

			expect(result.overlapDays).toBe(7);
			expect(result.totalDays).toBe(7);
			expect(result.proportion).toBe(1);
		});

		it("should return proportional overlap for week spanning two months", () => {
			const childStart = DateTime.fromISO("2026-01-28");
			const childEnd = DateTime.fromISO("2026-02-03");
			const parentStart = DateTime.fromISO("2026-01-01");
			const parentEnd = DateTime.fromISO("2026-01-31");

			const result = calculatePeriodOverlap(childStart, childEnd, parentStart, parentEnd);

			expect(result.overlapDays).toBe(4);
			expect(result.totalDays).toBe(7);
			expect(result.proportion).toBeCloseTo(4 / 7);
		});

		it("should return complementary overlap for the second month", () => {
			const childStart = DateTime.fromISO("2026-01-28");
			const childEnd = DateTime.fromISO("2026-02-03");
			const parentStart = DateTime.fromISO("2026-02-01");
			const parentEnd = DateTime.fromISO("2026-02-28");

			const result = calculatePeriodOverlap(childStart, childEnd, parentStart, parentEnd);

			expect(result.overlapDays).toBe(3);
			expect(result.totalDays).toBe(7);
			expect(result.proportion).toBeCloseTo(3 / 7);
		});

		it("should return zero overlap when child is outside parent", () => {
			const childStart = DateTime.fromISO("2026-03-02");
			const childEnd = DateTime.fromISO("2026-03-08");
			const parentStart = DateTime.fromISO("2026-01-01");
			const parentEnd = DateTime.fromISO("2026-01-31");

			const result = calculatePeriodOverlap(childStart, childEnd, parentStart, parentEnd);

			expect(result.overlapDays).toBe(0);
			expect(result.totalDays).toBe(7);
			expect(result.proportion).toBe(0);
		});
	});

	describe("weekSpansTwoMonths", () => {
		it("should return true when week spans two months", () => {
			const start = DateTime.fromISO("2026-01-28");
			const end = DateTime.fromISO("2026-02-03");
			expect(weekSpansTwoMonths(start, end)).toBe(true);
		});

		it("should return false when week is within a single month", () => {
			const start = DateTime.fromISO("2026-01-05");
			const end = DateTime.fromISO("2026-01-11");
			expect(weekSpansTwoMonths(start, end)).toBe(false);
		});

		it("should return true for year boundary", () => {
			const start = DateTime.fromISO("2025-12-29");
			const end = DateTime.fromISO("2026-01-04");
			expect(weekSpansTwoMonths(start, end)).toBe(true);
		});
	});

	describe("getSecondaryMonthPath", () => {
		it("should return the path for the month containing weekEnd", () => {
			const weekEnd = DateTime.fromISO("2026-02-03");
			const result = getSecondaryMonthPath(weekEnd, "Periodic/Monthly", "M-yyyy");
			expect(result).toBe("Periodic/Monthly/2-2026");
		});

		it("should handle year boundary", () => {
			const weekEnd = DateTime.fromISO("2026-01-04");
			const result = getSecondaryMonthPath(weekEnd, "Periodic/Monthly", "M-yyyy");
			expect(result).toBe("Periodic/Monthly/1-2026");
		});
	});

	describe("getChildWeight", () => {
		it("should return 1 for non-weekly children", () => {
			const child = createMockNote("daily", "2026-01-05T00:00:00.000Z", "2026-01-05T23:59:59.999Z");
			const parent = createMockNote("weekly", "2026-01-05T00:00:00.000Z", "2026-01-11T23:59:59.999Z");

			expect(getChildWeight(child, parent)).toBe(1);
		});

		it("should return 1 for non-monthly parents", () => {
			const child = createMockNote("weekly", "2026-01-05T00:00:00.000Z", "2026-01-11T23:59:59.999Z");
			const parent = createMockNote("quarterly", "2026-01-01T00:00:00.000Z", "2026-03-31T23:59:59.999Z");

			expect(getChildWeight(child, parent)).toBe(1);
		});

		it("should return 1 for week fully within month", () => {
			const child = createMockNote("weekly", "2026-01-05T00:00:00.000Z", "2026-01-11T23:59:59.999Z");
			const parent = createMockNote("monthly", "2026-01-01T00:00:00.000Z", "2026-01-31T23:59:59.999Z");

			expect(getChildWeight(child, parent)).toBe(1);
		});

		it("should return proportional weight for cross-month week (start month)", () => {
			const child = createMockNote("weekly", "2026-01-28T00:00:00.000Z", "2026-02-03T23:59:59.999Z");
			const parent = createMockNote("monthly", "2026-01-01T00:00:00.000Z", "2026-01-31T23:59:59.999Z");

			expect(getChildWeight(child, parent)).toBeCloseTo(4 / 7);
		});

		it("should return proportional weight for cross-month week (end month)", () => {
			const child = createMockNote("weekly", "2026-01-28T00:00:00.000Z", "2026-02-03T23:59:59.999Z");
			const parent = createMockNote("monthly", "2026-02-01T00:00:00.000Z", "2026-02-28T23:59:59.999Z");

			expect(getChildWeight(child, parent)).toBeCloseTo(3 / 7);
		});
	});
});
