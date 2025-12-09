import { describe, expect, it } from "vitest";
import { SETTINGS_DEFAULTS } from "../src/constants";
import {
	CategorySchema,
	DirectorySettingsSchema,
	NamingSettingsSchema,
	PeriodicPlannerSettingsSchema,
	TimeBudgetSettingsSchema,
} from "../src/types/schemas";

describe("Schema Validation", () => {
	describe("DirectorySettingsSchema", () => {
		it("should parse empty object with defaults", () => {
			const result = DirectorySettingsSchema.parse({});
			expect(result.dailyFolder).toBe(SETTINGS_DEFAULTS.DAILY_FOLDER);
			expect(result.weeklyFolder).toBe(SETTINGS_DEFAULTS.WEEKLY_FOLDER);
			expect(result.monthlyFolder).toBe(SETTINGS_DEFAULTS.MONTHLY_FOLDER);
			expect(result.quarterlyFolder).toBe(SETTINGS_DEFAULTS.QUARTERLY_FOLDER);
			expect(result.yearlyFolder).toBe(SETTINGS_DEFAULTS.YEARLY_FOLDER);
		});

		it("should accept custom folder paths", () => {
			const result = DirectorySettingsSchema.parse({
				dailyFolder: "Custom/Daily",
				weeklyFolder: "Custom/Weekly",
			});
			expect(result.dailyFolder).toBe("Custom/Daily");
			expect(result.weeklyFolder).toBe("Custom/Weekly");
		});
	});

	describe("NamingSettingsSchema", () => {
		it("should parse empty object with defaults", () => {
			const result = NamingSettingsSchema.parse({});
			expect(result.dailyFormat).toBe(SETTINGS_DEFAULTS.DAILY_FORMAT);
			expect(result.weeklyFormat).toBe(SETTINGS_DEFAULTS.WEEKLY_FORMAT);
		});

		it("should accept custom formats", () => {
			const result = NamingSettingsSchema.parse({
				dailyFormat: "dd-MM-yyyy",
			});
			expect(result.dailyFormat).toBe("dd-MM-yyyy");
		});
	});

	describe("TimeBudgetSettingsSchema", () => {
		it("should parse empty object with defaults", () => {
			const result = TimeBudgetSettingsSchema.parse({});
			expect(result.hoursPerWeek).toBe(SETTINGS_DEFAULTS.HOURS_PER_WEEK);
		});

		it("should accept custom hours per week", () => {
			const result = TimeBudgetSettingsSchema.parse({
				hoursPerWeek: 60,
			});
			expect(result.hoursPerWeek).toBe(60);
		});
	});

	describe("CategorySchema", () => {
		it("should validate a valid category", () => {
			const result = CategorySchema.parse({
				id: "cat-1",
				name: "Work",
				color: "#3B82F6",
				createdAt: Date.now(),
			});
			expect(result.name).toBe("Work");
			expect(result.color).toBe("#3B82F6");
		});

		it("should reject invalid hex color", () => {
			expect(() =>
				CategorySchema.parse({
					id: "cat-1",
					name: "Work",
					color: "not-a-color",
					createdAt: Date.now(),
				})
			).toThrow();
		});

		it("should reject empty name", () => {
			expect(() =>
				CategorySchema.parse({
					id: "cat-1",
					name: "",
					color: "#3B82F6",
					createdAt: Date.now(),
				})
			).toThrow();
		});
	});

	describe("PeriodicPlannerSettingsSchema", () => {
		it("should parse empty object with all defaults", () => {
			const result = PeriodicPlannerSettingsSchema.parse({});
			expect(result.version).toBe(1);
			expect(result.directories).toBeDefined();
			expect(result.naming).toBeDefined();
			expect(result.timeBudget).toBeDefined();
			expect(result.properties).toBeDefined();
			expect(result.generation).toBeDefined();
			expect(result.ui).toBeDefined();
			expect(result.categories).toEqual([]);
		});

		it("should accept partial settings", () => {
			const result = PeriodicPlannerSettingsSchema.parse({
				timeBudget: {
					hoursPerWeek: 50,
				},
			});
			expect(result.timeBudget.hoursPerWeek).toBe(50);
			expect(result.directories.dailyFolder).toBe(SETTINGS_DEFAULTS.DAILY_FOLDER);
		});
	});
});
