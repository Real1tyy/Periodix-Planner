import { DateTime } from "luxon";
import type { TFile, Vault } from "obsidian";
import { describe, expect, it, vi } from "vitest";
import { PERIOD_TYPES, SETTINGS_DEFAULTS } from "../src/constants";
import type { IndexedPeriodNote, PeriodicPlannerSettings } from "../src/types";
import { extractCategoryAllocations, getParentFilePathsFromLinks, parseFileToNote } from "../src/utils/note-utils";
import { TFile as MockTFile, Vault as MockVault } from "./mocks/obsidian";

describe("Note Utilities", () => {
	const createMockVault = (content: string): Vault => {
		const vault = new MockVault();
		vault.read = vi.fn().mockResolvedValue(content);
		return vault as unknown as Vault;
	};

	const createMockFile = (path: string, basename?: string, mtime?: number): TFile => {
		const file = new MockTFile(path);
		if (basename) file.basename = basename;
		(file as any).stat = { mtime: mtime ?? Date.now() };
		return file as unknown as TFile;
	};

	const createDefaultSettings = (): PeriodicPlannerSettings => ({
		version: 1,
		directories: {
			dailyFolder: SETTINGS_DEFAULTS.DAILY_FOLDER,
			weeklyFolder: SETTINGS_DEFAULTS.WEEKLY_FOLDER,
			monthlyFolder: SETTINGS_DEFAULTS.MONTHLY_FOLDER,
			quarterlyFolder: SETTINGS_DEFAULTS.QUARTERLY_FOLDER,
			yearlyFolder: SETTINGS_DEFAULTS.YEARLY_FOLDER,
		},
		naming: {
			dailyFormat: SETTINGS_DEFAULTS.DAILY_FORMAT,
			weeklyFormat: SETTINGS_DEFAULTS.WEEKLY_FORMAT,
			monthlyFormat: SETTINGS_DEFAULTS.MONTHLY_FORMAT,
			quarterlyFormat: SETTINGS_DEFAULTS.QUARTERLY_FORMAT,
			yearlyFormat: SETTINGS_DEFAULTS.YEARLY_FORMAT,
		},
		timeBudget: {
			hoursPerWeek: SETTINGS_DEFAULTS.HOURS_PER_WEEK,
		},
		properties: {
			previousProp: SETTINGS_DEFAULTS.PREVIOUS_PROP,
			nextProp: SETTINGS_DEFAULTS.NEXT_PROP,
			parentProp: SETTINGS_DEFAULTS.PARENT_PROP,
			weekProp: SETTINGS_DEFAULTS.WEEK_PROP,
			monthProp: SETTINGS_DEFAULTS.MONTH_PROP,
			quarterProp: SETTINGS_DEFAULTS.QUARTER_PROP,
			yearProp: SETTINGS_DEFAULTS.YEAR_PROP,
			hoursAvailableProp: SETTINGS_DEFAULTS.HOURS_AVAILABLE_PROP,
			hoursSpentProp: SETTINGS_DEFAULTS.HOURS_SPENT_PROP,
			periodTypeProp: SETTINGS_DEFAULTS.PERIOD_TYPE_PROP,
			periodStartProp: SETTINGS_DEFAULTS.PERIOD_START_PROP,
			periodEndProp: SETTINGS_DEFAULTS.PERIOD_END_PROP,
		},
		generation: {
			autoGenerateOnLoad: SETTINGS_DEFAULTS.AUTO_GENERATE_ON_LOAD,
			generatePeriodsAhead: SETTINGS_DEFAULTS.GENERATE_PERIODS_AHEAD,
			includePdfFrontmatter: SETTINGS_DEFAULTS.INCLUDE_PDF_FRONTMATTER,
			includePdfContent: SETTINGS_DEFAULTS.INCLUDE_PDF_CONTENT,
			pdfNoteProp: SETTINGS_DEFAULTS.PDF_NOTE_PROP,
			pdfContentHeader: SETTINGS_DEFAULTS.PDF_CONTENT_HEADER,
			includePlanHeading: SETTINGS_DEFAULTS.INCLUDE_PLAN_HEADING,
			planHeadingContent: SETTINGS_DEFAULTS.PLAN_HEADING_CONTENT,
		},
		ui: {
			warningThresholdPercent: SETTINGS_DEFAULTS.WARNING_THRESHOLD_PERCENT,
			overBudgetThresholdPercent: 100,
		},
		categories: [],
	});

	describe("extractCategoryAllocations", () => {
		it("should extract single category allocation", async () => {
			const content = "```periodic-planner\nWork: 8\n```";
			const vault = createMockVault(content);
			const file = createMockFile("test.md");

			const result = await extractCategoryAllocations(vault, file);

			expect(result.size).toBe(1);
			expect(result.get("Work")).toBe(8);
		});

		it("should extract multiple category allocations", async () => {
			const content = "```periodic-planner\nWork: 8\nHealth: 2\nLearning: 3\n```";
			const vault = createMockVault(content);
			const file = createMockFile("test.md");

			const result = await extractCategoryAllocations(vault, file);

			expect(result.size).toBe(3);
			expect(result.get("Work")).toBe(8);
			expect(result.get("Health")).toBe(2);
			expect(result.get("Learning")).toBe(3);
		});

		it("should handle decimal hours", async () => {
			const content = "```periodic-planner\nWork: 8.5\nHealth: 1.25\n```";
			const vault = createMockVault(content);
			const file = createMockFile("test.md");

			const result = await extractCategoryAllocations(vault, file);

			expect(result.size).toBe(2);
			expect(result.get("Work")).toBe(8.5);
			expect(result.get("Health")).toBe(1.25);
		});

		it("should return empty map when no code block exists", async () => {
			const content = "Just regular markdown content";
			const vault = createMockVault(content);
			const file = createMockFile("test.md");

			const result = await extractCategoryAllocations(vault, file);

			expect(result.size).toBe(0);
		});

		it("should return empty map when code block is empty", async () => {
			const content = "```periodic-planner\n```";
			const vault = createMockVault(content);
			const file = createMockFile("test.md");

			const result = await extractCategoryAllocations(vault, file);

			expect(result.size).toBe(0);
		});

		it("should handle code block with only whitespace", async () => {
			const content = "```periodic-planner\n   \n\t\n```";
			const vault = createMockVault(content);
			const file = createMockFile("test.md");

			const result = await extractCategoryAllocations(vault, file);

			expect(result.size).toBe(0);
		});

		it("should ignore invalid lines in code block", async () => {
			const content = "```periodic-planner\nWork: 8\ninvalid line\nHealth: 2\n```";
			const vault = createMockVault(content);
			const file = createMockFile("test.md");

			const result = await extractCategoryAllocations(vault, file);

			expect(result.size).toBe(2);
			expect(result.get("Work")).toBe(8);
			expect(result.get("Health")).toBe(2);
		});

		it("should handle vault.read error gracefully", async () => {
			const vault = new MockVault();
			vault.read = vi.fn().mockRejectedValue(new Error("File not found"));
			const file = createMockFile("test.md");

			const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

			const result = await extractCategoryAllocations(vault as unknown as Vault, file);

			expect(result.size).toBe(0);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Error extracting allocations"),
				expect.any(Error)
			);

			consoleSpy.mockRestore();
		});

		it("should handle multiple code blocks and use first one", async () => {
			const content = "```periodic-planner\nWork: 8\n```\n\nSome content\n\n```periodic-planner\nHealth: 2\n```";
			const vault = createMockVault(content);
			const file = createMockFile("test.md");

			const result = await extractCategoryAllocations(vault, file);

			expect(result.size).toBe(1);
			expect(result.get("Work")).toBe(8);
		});

		it("should handle category names with spaces", async () => {
			const content = "```periodic-planner\nWork Projects: 8\nPersonal Time: 2\n```";
			const vault = createMockVault(content);
			const file = createMockFile("test.md");

			const result = await extractCategoryAllocations(vault, file);

			expect(result.size).toBe(2);
			expect(result.get("Work Projects")).toBe(8);
			expect(result.get("Personal Time")).toBe(2);
		});

		it("should handle zero hours", async () => {
			const content = "```periodic-planner\nWork: 0\nHealth: 2\n```";
			const vault = createMockVault(content);
			const file = createMockFile("test.md");

			const result = await extractCategoryAllocations(vault, file);

			expect(result.size).toBe(2);
			expect(result.get("Work")).toBe(0);
			expect(result.get("Health")).toBe(2);
		});
	});

	describe("parseFileToNote", () => {
		const createValidFrontmatter = (overrides?: Record<string, unknown>): Record<string, unknown> => ({
			"Period Type": PERIOD_TYPES.WEEKLY,
			"Period Start": "2025-01-06T00:00:00.000Z",
			"Period End": "2025-01-12T23:59:59.999Z",
			...overrides,
		});

		it("should parse valid weekly note with all required fields", async () => {
			const frontmatter = createValidFrontmatter();
			const vault = createMockVault("```periodic-planner\nWork: 8\n```");
			const file = createMockFile("Periodic/Weekly/01-2025.md", "01-2025", 1234567890);
			const settings = createDefaultSettings();

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).not.toBeNull();
			expect(result?.file).toBe(file);
			expect(result?.filePath).toBe("Periodic/Weekly/01-2025.md");
			expect(result?.noteName).toBe("01-2025");
			expect(result?.periodType).toBe(PERIOD_TYPES.WEEKLY);
			expect(result?.periodStart).toBeInstanceOf(DateTime);
			expect(result?.periodEnd).toBeInstanceOf(DateTime);
			expect(result?.mtime).toBe(1234567890);
			expect(result?.hoursAvailable).toBe(40);
			expect(result?.hoursSpent).toBe(8);
			expect(result?.categoryAllocations.size).toBe(1);
			expect(result?.categoryAllocations.get("Work")).toBe(8);
		});

		it("should parse daily note correctly", async () => {
			const frontmatter = createValidFrontmatter({
				"Period Type": PERIOD_TYPES.DAILY,
				"Period Start": "2025-01-06T00:00:00.000Z",
				"Period End": "2025-01-06T23:59:59.999Z",
			});
			const vault = createMockVault("```periodic-planner\nWork: 6\n```");
			const file = createMockFile("Periodic/Daily/06-01-2025.md", "06-01-2025");
			const settings = createDefaultSettings();

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).not.toBeNull();
			expect(result?.periodType).toBe(PERIOD_TYPES.DAILY);
			expect(result?.hoursAvailable).toBe(Math.round(40 / 7));
			expect(result?.hoursSpent).toBe(6);
		});

		it("should parse monthly note correctly", async () => {
			const frontmatter = createValidFrontmatter({
				"Period Type": PERIOD_TYPES.MONTHLY,
				"Period Start": "2025-01-01T00:00:00.000Z",
				"Period End": "2025-01-31T23:59:59.999Z",
			});
			const vault = createMockVault("```periodic-planner\nWork: 160\n```");
			const file = createMockFile("Periodic/Monthly/1-2025.md", "1-2025");
			const settings = createDefaultSettings();

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).not.toBeNull();
			expect(result?.periodType).toBe(PERIOD_TYPES.MONTHLY);
			expect(result?.hoursAvailable).toBe(Math.round((40 * 52) / 12));
			expect(result?.hoursSpent).toBe(160);
		});

		it("should use hours available from frontmatter when provided", async () => {
			const frontmatter = createValidFrontmatter({
				"Hours Available": 50,
			});
			const vault = createMockVault("```periodic-planner\nWork: 8\n```");
			const file = createMockFile("test.md");
			const settings = createDefaultSettings();

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).not.toBeNull();
			expect(result?.hoursAvailable).toBe(50);
		});

		it("should calculate hours available when not in frontmatter", async () => {
			const frontmatter = createValidFrontmatter();
			const vault = createMockVault("```periodic-planner\nWork: 8\n```");
			const file = createMockFile("test.md");
			const settings = createDefaultSettings();

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).not.toBeNull();
			expect(result?.hoursAvailable).toBe(40);
		});

		it("should calculate hours spent from multiple categories", async () => {
			const frontmatter = createValidFrontmatter();
			const vault = createMockVault("```periodic-planner\nWork: 8\nHealth: 2\nLearning: 3\n```");
			const file = createMockFile("test.md");
			const settings = createDefaultSettings();

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).not.toBeNull();
			expect(result?.hoursSpent).toBe(13);
			expect(result?.categoryAllocations.size).toBe(3);
		});

		it("should round hours spent to one decimal place", async () => {
			const frontmatter = createValidFrontmatter();
			const vault = createMockVault("```periodic-planner\nWork: 8.33\nHealth: 2.67\n```");
			const file = createMockFile("test.md");
			const settings = createDefaultSettings();

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).not.toBeNull();
			expect(result?.hoursSpent).toBe(11);
		});

		it("should return zero hours spent when no allocations", async () => {
			const frontmatter = createValidFrontmatter();
			const vault = createMockVault("No code block here");
			const file = createMockFile("test.md");
			const settings = createDefaultSettings();

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).not.toBeNull();
			expect(result?.hoursSpent).toBe(0);
			expect(result?.categoryAllocations.size).toBe(0);
		});

		it("should extract parent links from frontmatter", async () => {
			const frontmatter = createValidFrontmatter({
				Parent: "[[2025-W01]]",
				Week: "[[2025-W01]]",
				Month: "[[2025-01]]",
				Quarter: "[[2025-Q1]]",
				Year: "[[2025]]",
			});
			const vault = createMockVault("```periodic-planner\nWork: 8\n```");
			const file = createMockFile("test.md");
			const settings = createDefaultSettings();

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).not.toBeNull();
			expect(result?.parentLinks.parent).toBe("2025-W01");
			expect(result?.parentLinks.week).toBe("2025-W01");
			expect(result?.parentLinks.month).toBe("2025-01");
			expect(result?.parentLinks.quarter).toBe("2025-Q1");
			expect(result?.parentLinks.year).toBe("2025");
		});

		it("should return null when periodType is missing", async () => {
			const frontmatter = {
				"Period Start": "2025-01-06T00:00:00.000Z",
				"Period End": "2025-01-12T23:59:59.999Z",
			};
			const vault = createMockVault("");
			const file = createMockFile("test.md");
			const settings = createDefaultSettings();

			const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).toBeNull();
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("is not a valid periodic note"),
				expect.any(Object)
			);

			consoleSpy.mockRestore();
		});

		it("should return null when periodStart is missing", async () => {
			const frontmatter = {
				"Period Type": PERIOD_TYPES.WEEKLY,
				"Period End": "2025-01-12T23:59:59.999Z",
			};
			const vault = createMockVault("");
			const file = createMockFile("test.md");
			const settings = createDefaultSettings();

			const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).toBeNull();

			consoleSpy.mockRestore();
		});

		it("should return null when periodEnd is missing", async () => {
			const frontmatter = {
				"Period Type": PERIOD_TYPES.WEEKLY,
				"Period Start": "2025-01-06T00:00:00.000Z",
			};
			const vault = createMockVault("");
			const file = createMockFile("test.md");
			const settings = createDefaultSettings();

			const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).toBeNull();

			consoleSpy.mockRestore();
		});

		it("should return null when periodType is invalid", async () => {
			const frontmatter = createValidFrontmatter({
				"Period Type": "invalid-type",
			});
			const vault = createMockVault("");
			const file = createMockFile("test.md");
			const settings = createDefaultSettings();

			const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).toBeNull();

			consoleSpy.mockRestore();
		});

		it("should return null when periodStart is invalid ISO datetime", async () => {
			const frontmatter = createValidFrontmatter({
				"Period Start": "invalid-date",
			});
			const vault = createMockVault("");
			const file = createMockFile("test.md");
			const settings = createDefaultSettings();

			const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).toBeNull();

			consoleSpy.mockRestore();
		});

		it("should return null when periodEnd is invalid ISO datetime", async () => {
			const frontmatter = createValidFrontmatter({
				"Period End": "invalid-date",
			});
			const vault = createMockVault("");
			const file = createMockFile("test.md");
			const settings = createDefaultSettings();

			const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).toBeNull();

			consoleSpy.mockRestore();
		});

		it("should handle quarterly note correctly", async () => {
			const frontmatter = createValidFrontmatter({
				"Period Type": PERIOD_TYPES.QUARTERLY,
				"Period Start": "2025-01-01T00:00:00.000Z",
				"Period End": "2025-03-31T23:59:59.999Z",
			});
			const vault = createMockVault("```periodic-planner\nWork: 480\n```");
			const file = createMockFile("Periodic/Quarterly/Q1-2025.md", "Q1-2025");
			const settings = createDefaultSettings();

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).not.toBeNull();
			expect(result?.periodType).toBe(PERIOD_TYPES.QUARTERLY);
			expect(result?.hoursAvailable).toBe(Math.round((40 * 52) / 4));
			expect(result?.hoursSpent).toBe(480);
		});

		it("should handle yearly note correctly", async () => {
			const frontmatter = createValidFrontmatter({
				"Period Type": PERIOD_TYPES.YEARLY,
				"Period Start": "2025-01-01T00:00:00.000Z",
				"Period End": "2025-12-31T23:59:59.999Z",
			});
			const vault = createMockVault("```periodic-planner\nWork: 2080\n```");
			const file = createMockFile("Periodic/Yearly/2025.md", "2025");
			const settings = createDefaultSettings();

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).not.toBeNull();
			expect(result?.periodType).toBe(PERIOD_TYPES.YEARLY);
			expect(result?.hoursAvailable).toBe(40 * 52);
			expect(result?.hoursSpent).toBe(2080);
		});

		it("should handle hours available as string (should use calculated)", async () => {
			const frontmatter = createValidFrontmatter({
				"Hours Available": "50",
			});
			const vault = createMockVault("```periodic-planner\nWork: 8\n```");
			const file = createMockFile("test.md");
			const settings = createDefaultSettings();

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).not.toBeNull();
			expect(result?.hoursAvailable).toBe(40);
		});

		it("should handle empty parent links", async () => {
			const frontmatter = createValidFrontmatter();
			const vault = createMockVault("```periodic-planner\nWork: 8\n```");
			const file = createMockFile("test.md");
			const settings = createDefaultSettings();

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).not.toBeNull();
			expect(result?.parentLinks.parent).toBeUndefined();
			expect(result?.parentLinks.week).toBeUndefined();
			expect(result?.parentLinks.month).toBeUndefined();
		});

		it("should handle parent links with aliases", async () => {
			const frontmatter = createValidFrontmatter({
				Parent: "[[2025-W01|Week 1]]",
				Month: "[[2025-01|January]]",
			});
			const vault = createMockVault("```periodic-planner\nWork: 8\n```");
			const file = createMockFile("test.md");
			const settings = createDefaultSettings();

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).not.toBeNull();
			expect(result?.parentLinks.parent).toBe("2025-W01");
			expect(result?.parentLinks.month).toBe("2025-01");
		});

		it("should handle vault.read error in extractCategoryAllocations", async () => {
			const frontmatter = createValidFrontmatter();
			const vault = new MockVault();
			vault.read = vi.fn().mockRejectedValue(new Error("File read error"));
			const file = createMockFile("test.md");
			const settings = createDefaultSettings();

			const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

			const result = await parseFileToNote(file, frontmatter, vault as unknown as Vault, settings);

			expect(result).not.toBeNull();
			expect(result?.hoursSpent).toBe(0);
			expect(result?.categoryAllocations.size).toBe(0);

			consoleSpy.mockRestore();
		});

		it("should handle very large hours spent values", async () => {
			const frontmatter = createValidFrontmatter();
			const vault = createMockVault("```periodic-planner\nWork: 1000\nHealth: 500\n```");
			const file = createMockFile("test.md");
			const settings = createDefaultSettings();

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).not.toBeNull();
			expect(result?.hoursSpent).toBe(1500);
		});

		it("should preserve file metadata correctly", async () => {
			const frontmatter = createValidFrontmatter();
			const vault = createMockVault("```periodic-planner\nWork: 8\n```");
			const file = createMockFile("Periodic/Weekly/01-2025.md", "01-2025", 9876543210);
			const settings = createDefaultSettings();

			const result = await parseFileToNote(file, frontmatter, vault, settings);

			expect(result).not.toBeNull();
			expect(result?.file).toBe(file);
			expect(result?.filePath).toBe("Periodic/Weekly/01-2025.md");
			expect(result?.noteName).toBe("01-2025");
			expect(result?.mtime).toBe(9876543210);
		});
	});

	describe("getParentFilePathsFromLinks", () => {
		const createMockNote = (
			periodType: string,
			parentLinks: {
				parent?: string;
				week?: string;
				month?: string;
				quarter?: string;
				year?: string;
			}
		): IndexedPeriodNote => {
			const file = createMockFile("test.md");
			return {
				file,
				filePath: file.path,
				periodType: periodType as any,
				periodStart: DateTime.fromISO("2025-01-06T00:00:00.000Z"),
				periodEnd: DateTime.fromISO("2025-01-12T23:59:59.999Z"),
				noteName: "test",
				mtime: Date.now(),
				hoursAvailable: 40,
				hoursSpent: 0,
				parentLinks,
				categoryAllocations: new Map(),
			};
		};

		it("should return empty array for yearly notes (no childrenKey)", () => {
			const note = createMockNote(PERIOD_TYPES.YEARLY, {
				parent: "2024",
				week: "2025-W01",
				month: "2025-01",
				quarter: "2025-Q1",
				year: "2025",
			});

			const result = getParentFilePathsFromLinks(note);

			expect(result).toEqual([]);
		});

		it("should return parent links for daily note with childrenKey 'days'", () => {
			const note = createMockNote(PERIOD_TYPES.DAILY, {
				parent: "2025-W01",
				week: "2025-W01",
				month: "2025-01",
				quarter: "2025-Q1",
				year: "2025",
			});

			const result = getParentFilePathsFromLinks(note);

			expect(result).toHaveLength(5);
			expect(result[0]).toEqual({ parentFilePath: "2025-W01.md", childrenKey: "days" });
			expect(result[1]).toEqual({ parentFilePath: "2025-W01.md", childrenKey: "days" });
			expect(result[2]).toEqual({ parentFilePath: "2025-01.md", childrenKey: "days" });
			expect(result[3]).toEqual({ parentFilePath: "2025-Q1.md", childrenKey: "days" });
			expect(result[4]).toEqual({ parentFilePath: "2025.md", childrenKey: "days" });
		});

		it("should return parent links for weekly note with childrenKey 'weeks'", () => {
			const note = createMockNote(PERIOD_TYPES.WEEKLY, {
				parent: "2025-01",
				week: "2025-W01",
				month: "2025-01",
				quarter: "2025-Q1",
				year: "2025",
			});

			const result = getParentFilePathsFromLinks(note);

			expect(result).toHaveLength(5);
			expect(result.every((r) => r.childrenKey === "weeks")).toBe(true);
			expect(result[0]).toEqual({ parentFilePath: "2025-01.md", childrenKey: "weeks" });
			expect(result[1]).toEqual({ parentFilePath: "2025-W01.md", childrenKey: "weeks" });
			expect(result[2]).toEqual({ parentFilePath: "2025-01.md", childrenKey: "weeks" });
			expect(result[3]).toEqual({ parentFilePath: "2025-Q1.md", childrenKey: "weeks" });
			expect(result[4]).toEqual({ parentFilePath: "2025.md", childrenKey: "weeks" });
		});

		it("should return parent links for monthly note with childrenKey 'months'", () => {
			const note = createMockNote(PERIOD_TYPES.MONTHLY, {
				parent: "2025-Q1",
				week: "2025-W01",
				month: "2025-01",
				quarter: "2025-Q1",
				year: "2025",
			});

			const result = getParentFilePathsFromLinks(note);

			expect(result).toHaveLength(5);
			expect(result.every((r) => r.childrenKey === "months")).toBe(true);
			expect(result[0]).toEqual({ parentFilePath: "2025-Q1.md", childrenKey: "months" });
		});

		it("should return parent links for quarterly note with childrenKey 'quarters'", () => {
			const note = createMockNote(PERIOD_TYPES.QUARTERLY, {
				parent: "2025",
				week: "2025-W01",
				month: "2025-01",
				quarter: "2025-Q1",
				year: "2025",
			});

			const result = getParentFilePathsFromLinks(note);

			expect(result).toHaveLength(5);
			expect(result.every((r) => r.childrenKey === "quarters")).toBe(true);
			expect(result[0]).toEqual({ parentFilePath: "2025.md", childrenKey: "quarters" });
		});

		it("should only return links that exist", () => {
			const note = createMockNote(PERIOD_TYPES.WEEKLY, {
				parent: "2025-01",
				month: "2025-01",
			});

			const result = getParentFilePathsFromLinks(note);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({ parentFilePath: "2025-01.md", childrenKey: "weeks" });
			expect(result[1]).toEqual({ parentFilePath: "2025-01.md", childrenKey: "weeks" });
		});

		it("should return empty array when no parent links exist", () => {
			const note = createMockNote(PERIOD_TYPES.WEEKLY, {});

			const result = getParentFilePathsFromLinks(note);

			expect(result).toEqual([]);
		});

		it("should add .md extension to file paths that don't have it", () => {
			const note = createMockNote(PERIOD_TYPES.DAILY, {
				parent: "2025-W01",
				week: "2025-W01.md",
				month: "2025-01",
			});

			const result = getParentFilePathsFromLinks(note);

			expect(result).toHaveLength(3);
			expect(result[0].parentFilePath).toBe("2025-W01.md");
			expect(result[1].parentFilePath).toBe("2025-W01.md");
			expect(result[2].parentFilePath).toBe("2025-01.md");
		});

		it("should handle paths with folders", () => {
			const note = createMockNote(PERIOD_TYPES.WEEKLY, {
				parent: "Periodic/Monthly/2025-01",
				month: "Periodic/Monthly/2025-01.md",
			});

			const result = getParentFilePathsFromLinks(note);

			expect(result).toHaveLength(2);
			expect(result[0].parentFilePath).toBe("Periodic/Monthly/2025-01.md");
			expect(result[1].parentFilePath).toBe("Periodic/Monthly/2025-01.md");
		});

		it("should handle only parent link", () => {
			const note = createMockNote(PERIOD_TYPES.DAILY, {
				parent: "2025-W01",
			});

			const result = getParentFilePathsFromLinks(note);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ parentFilePath: "2025-W01.md", childrenKey: "days" });
		});

		it("should handle only week link", () => {
			const note = createMockNote(PERIOD_TYPES.DAILY, {
				week: "2025-W01",
			});

			const result = getParentFilePathsFromLinks(note);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ parentFilePath: "2025-W01.md", childrenKey: "days" });
		});

		it("should handle only month link", () => {
			const note = createMockNote(PERIOD_TYPES.WEEKLY, {
				month: "2025-01",
			});

			const result = getParentFilePathsFromLinks(note);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ parentFilePath: "2025-01.md", childrenKey: "weeks" });
		});

		it("should handle only quarter link", () => {
			const note = createMockNote(PERIOD_TYPES.MONTHLY, {
				quarter: "2025-Q1",
			});

			const result = getParentFilePathsFromLinks(note);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ parentFilePath: "2025-Q1.md", childrenKey: "months" });
		});

		it("should handle only year link", () => {
			const note = createMockNote(PERIOD_TYPES.QUARTERLY, {
				year: "2025",
			});

			const result = getParentFilePathsFromLinks(note);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ parentFilePath: "2025.md", childrenKey: "quarters" });
		});

		it("should handle duplicate parent links (same link in multiple fields)", () => {
			const note = createMockNote(PERIOD_TYPES.DAILY, {
				parent: "2025-W01",
				week: "2025-W01",
			});

			const result = getParentFilePathsFromLinks(note);

			expect(result).toHaveLength(2);
			expect(result[0].parentFilePath).toBe("2025-W01.md");
			expect(result[1].parentFilePath).toBe("2025-W01.md");
		});

		it("should preserve order: parent, week, month, quarter, year", () => {
			const note = createMockNote(PERIOD_TYPES.DAILY, {
				year: "2025",
				quarter: "2025-Q1",
				month: "2025-01",
				week: "2025-W01",
				parent: "2025-W01",
			});

			const result = getParentFilePathsFromLinks(note);

			expect(result).toHaveLength(5);
			expect(result[0].parentFilePath).toBe("2025-W01.md");
			expect(result[1].parentFilePath).toBe("2025-W01.md");
			expect(result[2].parentFilePath).toBe("2025-01.md");
			expect(result[3].parentFilePath).toBe("2025-Q1.md");
			expect(result[4].parentFilePath).toBe("2025.md");
		});
	});
});
