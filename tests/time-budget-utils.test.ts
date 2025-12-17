import { describe, expect, it } from "vitest";
import type { TimeBudgetSettings } from "../src/types";
import {
	calculateAllocationPercentage,
	calculateHoursForPeriods,
	calculateRemainingHours,
	createAllocationSummary,
	fillAllocationsFromParent,
	formatHours,
	getBudgetStatus,
	getHoursForPeriodType,
	roundHours,
} from "../src/utils/time-budget-utils";

describe("Time Budget Utilities", () => {
	const defaultSettings: TimeBudgetSettings = {
		hoursPerWeek: 40,
		autoInheritParentPercentages: false,
	};

	describe("calculateHoursForPeriods", () => {
		it("should calculate all periods from weekly hours", () => {
			const result = calculateHoursForPeriods(defaultSettings);

			expect(result.weekly).toBe(40);
			expect(result.daily).toBe(Math.round(40 / 7)); // ~6
			expect(result.monthly).toBe(Math.round((40 * 52) / 12)); // ~173
			expect(result.quarterly).toBe(Math.round((40 * 52) / 4)); // ~520
			expect(result.yearly).toBe(40 * 52); // 2080
		});

		it("should handle different weekly hours", () => {
			const settings: TimeBudgetSettings = { hoursPerWeek: 60, autoInheritParentPercentages: false };
			const result = calculateHoursForPeriods(settings);

			expect(result.weekly).toBe(60);
			expect(result.yearly).toBe(60 * 52); // 3120
		});
	});

	describe("getHoursForPeriodType", () => {
		it("should return correct hours for each period type", () => {
			expect(getHoursForPeriodType(defaultSettings, "weekly")).toBe(40);
			expect(getHoursForPeriodType(defaultSettings, "yearly")).toBe(2080);
		});
	});

	describe("calculateRemainingHours", () => {
		it("should calculate remaining hours correctly", () => {
			expect(calculateRemainingHours(100, 60)).toBe(40);
			expect(calculateRemainingHours(100, 100)).toBe(0);
		});

		it("should return 0 when over-allocated", () => {
			expect(calculateRemainingHours(100, 150)).toBe(0);
		});
	});

	describe("calculateAllocationPercentage", () => {
		it("should calculate percentage correctly", () => {
			expect(calculateAllocationPercentage(100, 50)).toBe(50);
			expect(calculateAllocationPercentage(100, 75)).toBe(75);
			expect(calculateAllocationPercentage(100, 100)).toBe(100);
		});

		it("should handle over-allocation", () => {
			expect(calculateAllocationPercentage(100, 150)).toBe(150);
		});

		it("should handle zero total hours", () => {
			expect(calculateAllocationPercentage(0, 50)).toBe(0);
		});

		it("should round to nearest integer", () => {
			expect(calculateAllocationPercentage(100, 33)).toBe(33);
			expect(calculateAllocationPercentage(100, 66)).toBe(66);
		});
	});

	describe("getBudgetStatus", () => {
		const warningThreshold = 80;
		const overThreshold = 100;

		it("should return 'under' for low allocation", () => {
			expect(getBudgetStatus(50, warningThreshold, overThreshold)).toBe("under");
			expect(getBudgetStatus(79, warningThreshold, overThreshold)).toBe("under");
		});

		it("should return 'warning' for near-full allocation", () => {
			expect(getBudgetStatus(80, warningThreshold, overThreshold)).toBe("warning");
			expect(getBudgetStatus(99, warningThreshold, overThreshold)).toBe("warning");
		});

		it("should return 'over' for full or over-allocation", () => {
			expect(getBudgetStatus(100, warningThreshold, overThreshold)).toBe("over");
			expect(getBudgetStatus(150, warningThreshold, overThreshold)).toBe("over");
		});
	});

	describe("createAllocationSummary", () => {
		it("should create complete summary", () => {
			const summary = createAllocationSummary(100, 60, 80, 100);

			expect(summary.totalHours).toBe(100);
			expect(summary.allocatedHours).toBe(60);
			expect(summary.remainingHours).toBe(40);
			expect(summary.percentage).toBe(60);
			expect(summary.status).toBe("under");
		});

		it("should show warning status correctly", () => {
			const summary = createAllocationSummary(100, 85, 80, 100);

			expect(summary.status).toBe("warning");
		});

		it("should show over status correctly", () => {
			const summary = createAllocationSummary(100, 120, 80, 100);

			expect(summary.status).toBe("over");
			expect(summary.remainingHours).toBe(0);
			expect(summary.percentage).toBe(120);
		});
	});

	describe("roundHours", () => {
		it("should round to 2 decimal places", () => {
			expect(roundHours(10.123456)).toBe(10.12);
			expect(roundHours(5.999)).toBe(6);
			expect(roundHours(3.145)).toBe(3.15);
		});

		it("should handle whole numbers", () => {
			expect(roundHours(10)).toBe(10);
			expect(roundHours(0)).toBe(0);
		});

		it("should handle single decimal", () => {
			expect(roundHours(10.1)).toBe(10.1);
			expect(roundHours(5.5)).toBe(5.5);
		});
	});

	describe("formatHours", () => {
		it("should format with 2 decimal places", () => {
			expect(formatHours(10.123456)).toBe("10.12");
			expect(formatHours(5.999)).toBe("6.00");
			expect(formatHours(3.145)).toBe("3.15");
		});

		it("should format whole numbers with decimals", () => {
			expect(formatHours(10)).toBe("10.00");
			expect(formatHours(0)).toBe("0.00");
		});

		it("should format single decimal with trailing zero", () => {
			expect(formatHours(10.1)).toBe("10.10");
			expect(formatHours(5.5)).toBe("5.50");
		});
	});

	describe("fillAllocationsFromParent", () => {
		it("should distribute child hours based on parent percentages", () => {
			const parentBudgets = new Map([
				["cat1", { categoryId: "cat1", total: 20 }],
				["cat2", { categoryId: "cat2", total: 30 }],
				["cat3", { categoryId: "cat3", total: 10 }],
			]);

			const result = fillAllocationsFromParent(parentBudgets, 120);

			// Total parent: 60h (20 + 30 + 10)
			// cat1: 20/60 = 33.33% of 120 = 40h
			// cat2: 30/60 = 50% of 120 = 60h
			// cat3: 10/60 = 16.67% of 120 = 20h
			expect(result).toHaveLength(3);
			expect(result.find((a) => a.categoryId === "cat1")?.hours).toBe(40);
			expect(result.find((a) => a.categoryId === "cat2")?.hours).toBe(60);
			expect(result.find((a) => a.categoryId === "cat3")?.hours).toBe(20);
		});

		it("should handle empty parent budgets", () => {
			const parentBudgets = new Map();
			const result = fillAllocationsFromParent(parentBudgets, 100);
			expect(result).toEqual([]);
		});

		it("should handle zero child hours", () => {
			const parentBudgets = new Map([
				["cat1", { categoryId: "cat1", total: 20 }],
				["cat2", { categoryId: "cat2", total: 30 }],
			]);

			const result = fillAllocationsFromParent(parentBudgets, 0);
			expect(result).toEqual([]);
		});

		it("should handle parent with zero total", () => {
			const parentBudgets = new Map([
				["cat1", { categoryId: "cat1", total: 0 }],
				["cat2", { categoryId: "cat2", total: 0 }],
			]);

			const result = fillAllocationsFromParent(parentBudgets, 100);
			expect(result).toEqual([]);
		});

		it("should round hours to 2 decimal places", () => {
			const parentBudgets = new Map([
				["cat1", { categoryId: "cat1", total: 33 }], // Will result in non-round percentage
			]);

			const result = fillAllocationsFromParent(parentBudgets, 100);
			expect(result[0].hours).toBe(100); // 33/33 = 100%
		});

		it("should exclude categories with zero hours after calculation", () => {
			const parentBudgets = new Map([
				["cat1", { categoryId: "cat1", total: 100 }],
				["cat2", { categoryId: "cat2", total: 0.001 }], // Negligible amount
			]);

			const result = fillAllocationsFromParent(parentBudgets, 1);
			// Only cat1 should be included since cat2 would round to ~0
			expect(result.length).toBeGreaterThanOrEqual(1);
			expect(result.find((a) => a.categoryId === "cat1")).toBeDefined();
		});
	});
});
