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

			// CRITICAL: Sum must exactly equal child total (no rounding errors)
			const sum = result.reduce((acc, a) => acc + a.hours, 0);
			expect(roundHours(sum)).toBe(120);
		});

		it("CRITICAL: should ensure exact 100% distribution - no over-allocation", () => {
			// This is the critical test case that was failing
			const parentBudgets = new Map([
				["cat1", { categoryId: "cat1", total: 3.32 }],
				["cat2", { categoryId: "cat2", total: 1.12 }],
				["cat3", { categoryId: "cat3", total: 6.04 }],
				["cat4", { categoryId: "cat4", total: 6.04 }],
				["cat5", { categoryId: "cat5", total: 5.52 }],
				["cat6", { categoryId: "cat6", total: 1.64 }],
			]);

			const totalParent = 3.32 + 1.12 + 6.04 + 6.04 + 5.52 + 1.64; // 23.68
			const childTotal = 11.0;

			const result = fillAllocationsFromParent(parentBudgets, childTotal);

			// Sum must EXACTLY equal childTotal (rounded to 2 decimals to handle floating point)
			const sum = result.reduce((acc, a) => acc + a.hours, 0);
			expect(roundHours(sum)).toBe(childTotal);

			// Each allocation should maintain proper percentage
			for (const allocation of result) {
				const parentBudget = parentBudgets.get(allocation.categoryId);
				if (parentBudget) {
					const expectedPercentage = parentBudget.total / totalParent;
					const actualPercentage = allocation.hours / childTotal;
					// Allow tiny deviation due to rounding, but within 1%
					expect(Math.abs(actualPercentage - expectedPercentage)).toBeLessThan(0.01);
				}
			}
		});

		it("should ensure exact sum with challenging rounding scenarios", () => {
			// Test case with numbers that typically cause rounding issues
			const parentBudgets = new Map([
				["cat1", { categoryId: "cat1", total: 1 }],
				["cat2", { categoryId: "cat2", total: 1 }],
				["cat3", { categoryId: "cat3", total: 1 }],
			]);

			const result = fillAllocationsFromParent(parentBudgets, 10);

			// Each should get ~3.33h, but sum must equal exactly 10
			const sum = result.reduce((acc, a) => acc + a.hours, 0);
			expect(roundHours(sum)).toBe(10);

			// Allocations should be close to 3.33 each
			for (const allocation of result) {
				expect(allocation.hours).toBeGreaterThan(3.3);
				expect(allocation.hours).toBeLessThan(3.35);
			}
		});

		it("should handle uneven distribution perfectly", () => {
			const parentBudgets = new Map([
				["cat1", { categoryId: "cat1", total: 7 }],
				["cat2", { categoryId: "cat2", total: 11 }],
				["cat3", { categoryId: "cat3", total: 13 }],
			]);

			const result = fillAllocationsFromParent(parentBudgets, 100);

			// Sum must exactly equal 100 (rounded to 2 decimals to handle floating point)
			const sum = result.reduce((acc, a) => acc + a.hours, 0);
			expect(roundHours(sum)).toBe(100);
		});

		it("should handle single category (100% allocation)", () => {
			const parentBudgets = new Map([["cat1", { categoryId: "cat1", total: 40 }]]);

			const result = fillAllocationsFromParent(parentBudgets, 100);

			expect(result).toHaveLength(1);
			expect(result[0].hours).toBe(100);
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

		it("should handle very small child totals", () => {
			const parentBudgets = new Map([
				["cat1", { categoryId: "cat1", total: 50 }],
				["cat2", { categoryId: "cat2", total: 50 }],
			]);

			const result = fillAllocationsFromParent(parentBudgets, 1);

			// Sum must equal exactly 1
			const sum = result.reduce((acc, a) => acc + a.hours, 0);
			expect(roundHours(sum)).toBe(1);

			// Each should get 0.5
			expect(result).toHaveLength(2);
			for (const allocation of result) {
				expect(allocation.hours).toBe(0.5);
			}
		});

		it("should exclude categories with zero hours after calculation", () => {
			const parentBudgets = new Map([
				["cat1", { categoryId: "cat1", total: 100 }],
				["cat2", { categoryId: "cat2", total: 0.001 }], // Negligible amount
			]);

			const result = fillAllocationsFromParent(parentBudgets, 1);

			// Sum must equal exactly 1
			const sum = result.reduce((acc, a) => acc + a.hours, 0);
			expect(roundHours(sum)).toBe(1);
		});

		it("should handle many categories with precise distribution", () => {
			const parentBudgets = new Map([
				["cat1", { categoryId: "cat1", total: 10 }],
				["cat2", { categoryId: "cat2", total: 15 }],
				["cat3", { categoryId: "cat3", total: 20 }],
				["cat4", { categoryId: "cat4", total: 25 }],
				["cat5", { categoryId: "cat5", total: 30 }],
			]);

			const result = fillAllocationsFromParent(parentBudgets, 200);

			// Sum must equal exactly 200
			const sum = result.reduce((acc, a) => acc + a.hours, 0);
			expect(roundHours(sum)).toBe(200);

			// All categories should have allocations
			expect(result).toHaveLength(5);
		});
	});
});
