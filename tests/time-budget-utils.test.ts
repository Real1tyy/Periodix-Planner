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
		hideUnusedCategoriesInEditor: true,
		sortBy: "hours-desc",
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
			const settings: TimeBudgetSettings = {
				hoursPerWeek: 60,
				autoInheritParentPercentages: false,
				hideUnusedCategoriesInEditor: true,
				sortBy: "hours-desc",
			};
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
				["cat1", { categoryName: "cat1", total: 20, allocated: 0, remaining: 20 }],
				["cat2", { categoryName: "cat2", total: 30, allocated: 0, remaining: 30 }],
				["cat3", { categoryName: "cat3", total: 10, allocated: 0, remaining: 10 }],
			]);

			const result = fillAllocationsFromParent(parentBudgets, 120);

			// Total parent: 60h (20 + 30 + 10)
			// cat1: 20/60 = 33.33% of 120 = 40h
			// cat2: 30/60 = 50% of 120 = 60h
			// cat3: 10/60 = 16.67% of 120 = 20h
			expect(result).toHaveLength(3);
			expect(result.find((a) => a.categoryName === "cat1")?.hours).toBe(40);
			expect(result.find((a) => a.categoryName === "cat2")?.hours).toBe(60);
			expect(result.find((a) => a.categoryName === "cat3")?.hours).toBe(20);

			// CRITICAL: Sum must exactly equal child total (no rounding errors)
			const sum = result.reduce((acc, a) => acc + a.hours, 0);
			expect(roundHours(sum)).toBe(120);
		});

		it("CRITICAL: should never exceed 100% even when parent is at 100%", () => {
			// Real-world scenario: Parent has 40h allocated at 100%, child has 40h available
			const parentBudgets = new Map([
				["Development", { categoryName: "Development", total: 20, allocated: 20, remaining: 0 }],
				["Design", { categoryName: "Design", total: 10, allocated: 10, remaining: 0 }],
				["Meetings", { categoryName: "Meetings", total: 10, allocated: 10, remaining: 0 }],
			]);

			const childTotal = 40;
			const result = fillAllocationsFromParent(parentBudgets, childTotal);

			// Sum must NEVER exceed childTotal
			const sum = result.reduce((acc, a) => acc + a.hours, 0);
			expect(sum).toBeLessThanOrEqual(childTotal);
			expect(roundHours(sum)).toBeLessThanOrEqual(childTotal);

			// Should equal exactly 100% (not 100.01% or 100.1%)
			expect(roundHours(sum)).toBe(childTotal);

			// Percentage should be exactly 100%, not 100.x%
			const percentage = (sum / childTotal) * 100;
			expect(percentage).toBeLessThanOrEqual(100);
		});

		it("CRITICAL: should clamp total when rounding would cause overflow", () => {
			// Scenario that commonly causes overflow due to rounding
			const parentBudgets = new Map([
				["cat1", { categoryName: "cat1", total: 13.33, allocated: 0, remaining: 13.33 }],
				["cat2", { categoryName: "cat2", total: 13.33, allocated: 0, remaining: 13.33 }],
				["cat3", { categoryName: "cat3", total: 13.34, allocated: 0, remaining: 13.34 }],
			]);

			const childTotal = 40;
			const result = fillAllocationsFromParent(parentBudgets, childTotal);

			// Must not exceed total
			const sum = result.reduce((acc, a) => acc + a.hours, 0);
			expect(sum).toBeLessThanOrEqual(childTotal);
			expect(roundHours(sum)).toBeLessThanOrEqual(childTotal);
			expect(roundHours(sum)).toBe(childTotal);
		});

		it("CRITICAL: should handle floating point precision issues", () => {
			// Numbers that commonly cause floating point issues
			const parentBudgets = new Map([
				["cat1", { categoryName: "cat1", total: 10.1, allocated: 0, remaining: 10.1 }],
				["cat2", { categoryName: "cat2", total: 20.2, allocated: 0, remaining: 20.2 }],
				["cat3", { categoryName: "cat3", total: 9.7, allocated: 0, remaining: 9.7 }],
			]);

			const childTotal = 100;
			const result = fillAllocationsFromParent(parentBudgets, childTotal);

			const sum = result.reduce((acc, a) => acc + a.hours, 0);

			// Must never exceed total (even by 0.01)
			expect(sum).toBeLessThanOrEqual(childTotal);
			expect(roundHours(sum)).toBeLessThanOrEqual(childTotal);
			expect(roundHours(sum)).toBe(childTotal);
		});

		it("CRITICAL: should clamp when sum would trigger red warning (>100%)", () => {
			// Test the exact scenario: parent at 100%, child gets filled but goes slightly over
			const parentBudgets = new Map([
				["Work", { categoryName: "Work", total: 6.5, allocated: 6.5, remaining: 0 }],
				["Email", { categoryName: "Email", total: 1.5, allocated: 1.5, remaining: 0 }],
				["Meetings", { categoryName: "Meetings", total: 2.0, allocated: 2.0, remaining: 0 }],
			]);

			const childTotal = 10; // Weekly has 10h available
			const result = fillAllocationsFromParent(parentBudgets, childTotal);

			const sum = result.reduce((acc, a) => acc + a.hours, 0);
			const percentage = (sum / childTotal) * 100;

			// CRITICAL: Percentage must be ≤ 100% to avoid red warning
			expect(percentage).toBeLessThanOrEqual(100);

			// Sum must not exceed childTotal (even by tiny amount)
			expect(sum).toBeLessThanOrEqual(childTotal);

			// Rounded sum must equal childTotal exactly
			expect(roundHours(sum)).toBe(childTotal);
		});

		it("CRITICAL: edge case with prime number divisions", () => {
			// Prime numbers that commonly cause distribution issues
			const parentBudgets = new Map([
				["cat1", { categoryName: "cat1", total: 7, allocated: 0, remaining: 7 }],
				["cat2", { categoryName: "cat2", total: 11, allocated: 0, remaining: 11 }],
				["cat3", { categoryName: "cat3", total: 13, allocated: 0, remaining: 13 }],
				["cat4", { categoryName: "cat4", total: 17, allocated: 0, remaining: 17 }],
			]);

			const childTotal = 100;
			const result = fillAllocationsFromParent(parentBudgets, childTotal);

			const sum = result.reduce((acc, a) => acc + a.hours, 0);
			const percentage = (sum / childTotal) * 100;

			// Must not exceed 100%
			expect(percentage).toBeLessThanOrEqual(100);
			expect(sum).toBeLessThanOrEqual(childTotal);
			expect(roundHours(sum)).toBe(childTotal);
		});

		it("CRITICAL: should handle the reported bug scenario exactly", () => {
			// Simulating: parent has some allocation, child should be filled without exceeding
			// This tests the specific case where "Fill from parent" causes red warning
			const parentBudgets = new Map([
				["Development", { categoryName: "Development", total: 16.67, allocated: 10, remaining: 6.67 }],
				["Design", { categoryName: "Design", total: 8.33, allocated: 5, remaining: 3.33 }],
				["Admin", { categoryName: "Admin", total: 5.0, allocated: 3, remaining: 2.0 }],
			]);

			const childTotal = 30;
			const result = fillAllocationsFromParent(parentBudgets, childTotal);

			const sum = result.reduce((acc, a) => acc + a.hours, 0);
			const percentage = (sum / childTotal) * 100;

			// The bug: this would show >100% and trigger red warning
			// After fix: should be exactly 100%
			expect(percentage).toBeLessThanOrEqual(100);
			expect(sum).toBeLessThanOrEqual(childTotal);
			expect(roundHours(sum)).toBe(childTotal);

			// Verify each category maintains correct proportion
			const totalParent = 16.67 + 8.33 + 5.0;
			for (const allocation of result) {
				const parentBudget = parentBudgets.get(allocation.categoryName);
				if (parentBudget) {
					const expectedRatio = parentBudget.total / totalParent;
					const actualRatio = allocation.hours / childTotal;
					// Allow 1% deviation for rounding
					expect(Math.abs(actualRatio - expectedRatio)).toBeLessThan(0.01);
				}
			}
		});

		it("STRESS TEST: should never exceed 100% with random values", () => {
			// Generate 10 random test cases
			for (let test = 0; test < 10; test++) {
				const categoryCount = Math.floor(Math.random() * 10) + 3; // 3-12 categories
				const parentBudgets = new Map<
					string,
					{ categoryName: string; total: number; allocated: number; remaining: number }
				>();

				for (let i = 0; i < categoryCount; i++) {
					const total = Math.round((Math.random() * 50 + 1) * 100) / 100; // 0.01 to 50.00
					parentBudgets.set(`cat${i}`, {
						categoryName: `cat${i}`,
						total,
						allocated: 0,
						remaining: total,
					});
				}

				const childTotal = Math.round((Math.random() * 200 + 10) * 100) / 100; // 10.00 to 210.00
				const result = fillAllocationsFromParent(parentBudgets, childTotal);

				const sum = result.reduce((acc, a) => acc + a.hours, 0);
				const percentage = (sum / childTotal) * 100;

				// CRITICAL: Must never exceed 100%
				expect(percentage).toBeLessThanOrEqual(100);
				expect(sum).toBeLessThanOrEqual(childTotal);
				expect(roundHours(sum)).toBeLessThanOrEqual(childTotal);
			}
		});

		it("STRESS TEST: pathological floating point edge cases", () => {
			// Test with numbers known to cause floating point issues
			const problematicValues = [
				{ parent: 0.1 + 0.2, child: 1 }, // Classic 0.30000000000000004
				{ parent: 0.57, child: 10 },
				{ parent: 0.33 + 0.33 + 0.34, child: 100 },
				{ parent: 1.23 + 4.56 + 7.89, child: 50 },
			];

			for (const { parent, child } of problematicValues) {
				const parentBudgets = new Map([
					["cat1", { categoryName: "cat1", total: parent / 3, allocated: 0, remaining: parent / 3 }],
					["cat2", { categoryName: "cat2", total: parent / 3, allocated: 0, remaining: parent / 3 }],
					["cat3", { categoryName: "cat3", total: parent / 3, allocated: 0, remaining: parent / 3 }],
				]);

				const result = fillAllocationsFromParent(parentBudgets, child);
				const sum = result.reduce((acc, a) => acc + a.hours, 0);
				const percentage = (sum / child) * 100;

				expect(percentage).toBeLessThanOrEqual(100);
				expect(sum).toBeLessThanOrEqual(child);
				expect(roundHours(sum)).toBeLessThanOrEqual(child);
			}
		});

		it("CRITICAL: should ensure exact 100% distribution - no over-allocation", () => {
			// This is the critical test case that was failing
			const parentBudgets = new Map([
				["cat1", { categoryName: "cat1", total: 3.32, allocated: 0, remaining: 3.32 }],
				["cat2", { categoryName: "cat2", total: 1.12, allocated: 0, remaining: 1.12 }],
				["cat3", { categoryName: "cat3", total: 6.04, allocated: 0, remaining: 6.04 }],
				["cat4", { categoryName: "cat4", total: 6.04, allocated: 0, remaining: 6.04 }],
				["cat5", { categoryName: "cat5", total: 5.52, allocated: 0, remaining: 5.52 }],
				["cat6", { categoryName: "cat6", total: 1.64, allocated: 0, remaining: 1.64 }],
			]);

			const totalParent = 3.32 + 1.12 + 6.04 + 6.04 + 5.52 + 1.64; // 23.68
			const childTotal = 11.0;

			const result = fillAllocationsFromParent(parentBudgets, childTotal);

			// Sum must EXACTLY equal childTotal (rounded to 2 decimals to handle floating point)
			const sum = result.reduce((acc, a) => acc + a.hours, 0);
			expect(roundHours(sum)).toBe(childTotal);

			// Each allocation should maintain proper percentage
			for (const allocation of result) {
				const parentBudget = parentBudgets.get(allocation.categoryName);
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
				["cat1", { categoryName: "cat1", total: 1, allocated: 0, remaining: 1 }],
				["cat2", { categoryName: "cat2", total: 1, allocated: 0, remaining: 1 }],
				["cat3", { categoryName: "cat3", total: 1, allocated: 0, remaining: 1 }],
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
				["cat1", { categoryName: "cat1", total: 7, allocated: 0, remaining: 7 }],
				["cat2", { categoryName: "cat2", total: 11, allocated: 0, remaining: 11 }],
				["cat3", { categoryName: "cat3", total: 13, allocated: 0, remaining: 13 }],
			]);

			const result = fillAllocationsFromParent(parentBudgets, 100);

			// Sum must exactly equal 100 (rounded to 2 decimals to handle floating point)
			const sum = result.reduce((acc, a) => acc + a.hours, 0);
			expect(roundHours(sum)).toBe(100);
		});

		it("should handle single category (100% allocation)", () => {
			const parentBudgets = new Map([["cat1", { categoryName: "cat1", total: 40, allocated: 0, remaining: 40 }]]);

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
				["cat1", { categoryName: "cat1", total: 20, allocated: 0, remaining: 20 }],
				["cat2", { categoryName: "cat2", total: 30, allocated: 0, remaining: 30 }],
			]);

			const result = fillAllocationsFromParent(parentBudgets, 0);
			expect(result).toEqual([]);
		});

		it("should handle parent with zero total", () => {
			const parentBudgets = new Map([
				["cat1", { categoryName: "cat1", total: 0, allocated: 0, remaining: 0 }],
				["cat2", { categoryName: "cat2", total: 0, allocated: 0, remaining: 0 }],
			]);

			const result = fillAllocationsFromParent(parentBudgets, 100);
			expect(result).toEqual([]);
		});

		it("should handle very small child totals", () => {
			const parentBudgets = new Map([
				["cat1", { categoryName: "cat1", total: 50, allocated: 0, remaining: 50 }],
				["cat2", { categoryName: "cat2", total: 50, allocated: 0, remaining: 50 }],
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
				["cat1", { categoryName: "cat1", total: 100, allocated: 0, remaining: 100 }],
				["cat2", { categoryName: "cat2", total: 0.001, allocated: 0, remaining: 0.001 }], // Negligible amount
			]);

			const result = fillAllocationsFromParent(parentBudgets, 1);

			// Sum must equal exactly 1
			const sum = result.reduce((acc, a) => acc + a.hours, 0);
			expect(roundHours(sum)).toBe(1);
		});

		it("should handle many categories with precise distribution", () => {
			const parentBudgets = new Map([
				["cat1", { categoryName: "cat1", total: 10, allocated: 0, remaining: 10 }],
				["cat2", { categoryName: "cat2", total: 15, allocated: 0, remaining: 15 }],
				["cat3", { categoryName: "cat3", total: 20, allocated: 0, remaining: 20 }],
				["cat4", { categoryName: "cat4", total: 25, allocated: 0, remaining: 25 }],
				["cat5", { categoryName: "cat5", total: 30, allocated: 0, remaining: 30 }],
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
