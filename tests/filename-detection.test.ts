import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { SETTINGS_DEFAULTS } from "../src/constants";
import type { PeriodicPlannerSettings } from "../src/types";
import { buildPeriodLinksForNote, detectPeriodTypeFromFilename } from "../src/utils/note-utils";

const mockSettings: PeriodicPlannerSettings = {
	version: 1,
	directories: {
		dailyFolder: "Journal/Daily",
		weeklyFolder: "Journal/Weekly",
		monthlyFolder: "Journal/Monthly",
		quarterlyFolder: "Journal/Quarterly",
		yearlyFolder: "Journal/Yearly",
	},
	naming: {
		dailyFormat: "dd-MM-yyyy",
		weeklyFormat: "'W'WW-kkkk",
		monthlyFormat: "MM-yyyy",
		quarterlyFormat: "'Q'q-yyyy",
		yearlyFormat: "yyyy",
	},
	timeBudget: {
		hoursPerWeek: SETTINGS_DEFAULTS.HOURS_PER_WEEK,
		autoInheritParentPercentages: false,
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
		autoInsertCodeBlock: SETTINGS_DEFAULTS.AUTO_INSERT_CODE_BLOCK,
		includePlanHeading: SETTINGS_DEFAULTS.INCLUDE_PLAN_HEADING,
		planHeadingContent: SETTINGS_DEFAULTS.PLAN_HEADING_CONTENT,
	},
	ui: {
		warningThresholdPercent: SETTINGS_DEFAULTS.WARNING_THRESHOLD_PERCENT,
		overBudgetThresholdPercent: SETTINGS_DEFAULTS.OVER_BUDGET_THRESHOLD_PERCENT,
	},
	categories: [],
};

function createMockFile(path: string, basename: string) {
	return {
		path,
		basename,
		extension: "md",
	} as any;
}

describe("detectPeriodTypeFromFilename", () => {
	describe("Daily notes", () => {
		it("should detect valid daily note from filename", () => {
			const file = createMockFile("Journal/Daily/17-08-2024.md", "17-08-2024");
			const result = detectPeriodTypeFromFilename(file, mockSettings);

			expect(result).not.toBeNull();
			expect(result?.periodType).toBe("daily");
			expect(result?.dateTime.year).toBe(2024);
			expect(result?.dateTime.month).toBe(8);
			expect(result?.dateTime.day).toBe(17);
		});

		it("should detect daily note with leading zeros", () => {
			const file = createMockFile("Journal/Daily/01-01-2025.md", "01-01-2025");
			const result = detectPeriodTypeFromFilename(file, mockSettings);

			expect(result).not.toBeNull();
			expect(result?.periodType).toBe("daily");
			expect(result?.dateTime.year).toBe(2025);
			expect(result?.dateTime.month).toBe(1);
			expect(result?.dateTime.day).toBe(1);
		});

		it("should return null for invalid daily format", () => {
			const file = createMockFile("Journal/Daily/2024-08-17.md", "2024-08-17");
			const result = detectPeriodTypeFromFilename(file, mockSettings);

			expect(result).toBeNull();
		});

		it("should return null for daily note in wrong folder", () => {
			const file = createMockFile("Journal/Weekly/17-08-2024.md", "17-08-2024");
			const result = detectPeriodTypeFromFilename(file, mockSettings);

			expect(result).toBeNull();
		});
	});

	describe("Weekly notes", () => {
		it("should detect valid weekly note from filename", () => {
			const file = createMockFile("Journal/Weekly/W33-2024.md", "W33-2024");
			const result = detectPeriodTypeFromFilename(file, mockSettings);

			expect(result).not.toBeNull();
			expect(result?.periodType).toBe("weekly");
			expect(result?.dateTime.weekYear).toBe(2024);
			expect(result?.dateTime.weekNumber).toBe(33);
		});

		it("should detect weekly note with single digit week", () => {
			const file = createMockFile("Journal/Weekly/W01-2025.md", "W01-2025");
			const result = detectPeriodTypeFromFilename(file, mockSettings);

			expect(result).not.toBeNull();
			expect(result?.periodType).toBe("weekly");
			expect(result?.dateTime.weekYear).toBe(2025);
			expect(result?.dateTime.weekNumber).toBe(1);
		});

		it("should return null for invalid weekly format", () => {
			const file = createMockFile("Journal/Weekly/Week-33-2024.md", "Week-33-2024");
			const result = detectPeriodTypeFromFilename(file, mockSettings);

			expect(result).toBeNull();
		});
	});

	describe("Monthly notes", () => {
		it("should detect valid monthly note from filename", () => {
			const file = createMockFile("Journal/Monthly/08-2024.md", "08-2024");
			const result = detectPeriodTypeFromFilename(file, mockSettings);

			expect(result).not.toBeNull();
			expect(result?.periodType).toBe("monthly");
			expect(result?.dateTime.year).toBe(2024);
			expect(result?.dateTime.month).toBe(8);
		});

		it("should detect monthly note with single digit month", () => {
			const file = createMockFile("Journal/Monthly/01-2025.md", "01-2025");
			const result = detectPeriodTypeFromFilename(file, mockSettings);

			expect(result).not.toBeNull();
			expect(result?.periodType).toBe("monthly");
			expect(result?.dateTime.year).toBe(2025);
			expect(result?.dateTime.month).toBe(1);
		});

		it("should return null for invalid monthly format", () => {
			const file = createMockFile("Journal/Monthly/2024-08.md", "2024-08");
			const result = detectPeriodTypeFromFilename(file, mockSettings);

			expect(result).toBeNull();
		});
	});

	describe("Quarterly notes", () => {
		it("should detect valid quarterly note from filename", () => {
			const file = createMockFile("Journal/Quarterly/Q3-2024.md", "Q3-2024");
			const result = detectPeriodTypeFromFilename(file, mockSettings);

			expect(result).not.toBeNull();
			expect(result?.periodType).toBe("quarterly");
			expect(result?.dateTime.year).toBe(2024);
			expect(result?.dateTime.quarter).toBe(3);
		});

		it("should detect Q1", () => {
			const file = createMockFile("Journal/Quarterly/Q1-2025.md", "Q1-2025");
			const result = detectPeriodTypeFromFilename(file, mockSettings);

			expect(result).not.toBeNull();
			expect(result?.periodType).toBe("quarterly");
			expect(result?.dateTime.year).toBe(2025);
			expect(result?.dateTime.quarter).toBe(1);
		});

		it("should detect Q4", () => {
			const file = createMockFile("Journal/Quarterly/Q4-2024.md", "Q4-2024");
			const result = detectPeriodTypeFromFilename(file, mockSettings);

			expect(result).not.toBeNull();
			expect(result?.periodType).toBe("quarterly");
			expect(result?.dateTime.year).toBe(2024);
			expect(result?.dateTime.quarter).toBe(4);
		});

		it("should return null for invalid quarterly format", () => {
			const file = createMockFile("Journal/Quarterly/Quarter-3-2024.md", "Quarter-3-2024");
			const result = detectPeriodTypeFromFilename(file, mockSettings);

			expect(result).toBeNull();
		});
	});

	describe("Yearly notes", () => {
		it("should detect valid yearly note from filename", () => {
			const file = createMockFile("Journal/Yearly/2024.md", "2024");
			const result = detectPeriodTypeFromFilename(file, mockSettings);

			expect(result).not.toBeNull();
			expect(result?.periodType).toBe("yearly");
			expect(result?.dateTime.year).toBe(2024);
		});

		it("should detect different years", () => {
			const file = createMockFile("Journal/Yearly/2025.md", "2025");
			const result = detectPeriodTypeFromFilename(file, mockSettings);

			expect(result).not.toBeNull();
			expect(result?.periodType).toBe("yearly");
			expect(result?.dateTime.year).toBe(2025);
		});

		it("should return null for invalid yearly format", () => {
			const file = createMockFile("Journal/Yearly/Year-2024.md", "Year-2024");
			const result = detectPeriodTypeFromFilename(file, mockSettings);

			expect(result).toBeNull();
		});
	});

	describe("Edge cases", () => {
		it("should return null for non-periodic note", () => {
			const file = createMockFile("Journal/Daily/Random Note.md", "Random Note");
			const result = detectPeriodTypeFromFilename(file, mockSettings);

			expect(result).toBeNull();
		});

		it("should return null for file outside configured folders", () => {
			const file = createMockFile("Other/17-08-2024.md", "17-08-2024");
			const result = detectPeriodTypeFromFilename(file, mockSettings);

			expect(result).toBeNull();
		});

		it("should prioritize folder matching over format", () => {
			const file = createMockFile("Journal/Monthly/17-08-2024.md", "17-08-2024");
			const result = detectPeriodTypeFromFilename(file, mockSettings);

			expect(result).toBeNull();
		});
	});
});

describe("buildPeriodLinksForNote", () => {
	describe("Daily note links", () => {
		it("should build correct links for daily note", () => {
			const dateTime = DateTime.fromISO("2024-08-17");
			const links = buildPeriodLinksForNote(dateTime, "daily", mockSettings);

			expect(links.previous).toBe("[[Journal/Daily/16-08-2024|16-08-2024]]");
			expect(links.next).toBe("[[Journal/Daily/18-08-2024|18-08-2024]]");
			expect(links.parent).toBe("[[Journal/Weekly/W33-2024|W33-2024]]");
			expect(links.week).toBe("[[Journal/Weekly/W33-2024|W33-2024]]");
			expect(links.month).toBe("[[Journal/Monthly/08-2024|08-2024]]");
			expect(links.quarter).toBe("[[Journal/Quarterly/Q3-2024|Q3-2024]]");
			expect(links.year).toBe("[[Journal/Yearly/2024|2024]]");
		});

		it("should handle month boundary correctly", () => {
			const dateTime = DateTime.fromISO("2024-08-31");
			const links = buildPeriodLinksForNote(dateTime, "daily", mockSettings);

			expect(links.previous).toBe("[[Journal/Daily/30-08-2024|30-08-2024]]");
			expect(links.next).toBe("[[Journal/Daily/01-09-2024|01-09-2024]]");
		});

		it("should handle year boundary correctly", () => {
			const dateTime = DateTime.fromISO("2024-12-31");
			const links = buildPeriodLinksForNote(dateTime, "daily", mockSettings);

			expect(links.previous).toBe("[[Journal/Daily/30-12-2024|30-12-2024]]");
			expect(links.next).toBe("[[Journal/Daily/01-01-2025|01-01-2025]]");
		});
	});

	describe("Weekly note links", () => {
		it("should build correct links for weekly note", () => {
			const dateTime = DateTime.fromISO("2024-08-17");
			const links = buildPeriodLinksForNote(dateTime, "weekly", mockSettings);

			expect(links.previous).toBe("[[Journal/Weekly/W32-2024|W32-2024]]");
			expect(links.next).toBe("[[Journal/Weekly/W34-2024|W34-2024]]");
			expect(links.parent).toBe("[[Journal/Monthly/08-2024|08-2024]]");
			expect(links.month).toBe("[[Journal/Monthly/08-2024|08-2024]]");
			expect(links.quarter).toBe("[[Journal/Quarterly/Q3-2024|Q3-2024]]");
			expect(links.year).toBe("[[Journal/Yearly/2024|2024]]");
		});

		it("should handle year boundary for weeks", () => {
			const dateTime = DateTime.fromISO("2024-12-30");
			const links = buildPeriodLinksForNote(dateTime, "weekly", mockSettings);

			expect(links.previous).toBe("[[Journal/Weekly/W52-2024|W52-2024]]");
			expect(links.next).toBe("[[Journal/Weekly/W02-2025|W02-2025]]");
		});
	});

	describe("Monthly note links", () => {
		it("should build correct links for monthly note", () => {
			const dateTime = DateTime.fromISO("2024-08-17");
			const links = buildPeriodLinksForNote(dateTime, "monthly", mockSettings);

			expect(links.previous).toBe("[[Journal/Monthly/07-2024|07-2024]]");
			expect(links.next).toBe("[[Journal/Monthly/09-2024|09-2024]]");
			expect(links.parent).toBe("[[Journal/Quarterly/Q3-2024|Q3-2024]]");
			expect(links.quarter).toBe("[[Journal/Quarterly/Q3-2024|Q3-2024]]");
			expect(links.year).toBe("[[Journal/Yearly/2024|2024]]");
		});

		it("should handle year boundary for months", () => {
			const dateTime = DateTime.fromISO("2024-12-15");
			const links = buildPeriodLinksForNote(dateTime, "monthly", mockSettings);

			expect(links.previous).toBe("[[Journal/Monthly/11-2024|11-2024]]");
			expect(links.next).toBe("[[Journal/Monthly/01-2025|01-2025]]");
		});
	});

	describe("Quarterly note links", () => {
		it("should build correct links for quarterly note", () => {
			const dateTime = DateTime.fromISO("2024-08-17");
			const links = buildPeriodLinksForNote(dateTime, "quarterly", mockSettings);

			expect(links.previous).toBe("[[Journal/Quarterly/Q2-2024|Q2-2024]]");
			expect(links.next).toBe("[[Journal/Quarterly/Q4-2024|Q4-2024]]");
			expect(links.parent).toBe("[[Journal/Yearly/2024|2024]]");
			expect(links.year).toBe("[[Journal/Yearly/2024|2024]]");
		});

		it("should handle year boundary for quarters", () => {
			const dateTime = DateTime.fromISO("2024-12-15");
			const links = buildPeriodLinksForNote(dateTime, "quarterly", mockSettings);

			expect(links.previous).toBe("[[Journal/Quarterly/Q3-2024|Q3-2024]]");
			expect(links.next).toBe("[[Journal/Quarterly/Q1-2025|Q1-2025]]");
		});
	});

	describe("Yearly note links", () => {
		it("should build correct links for yearly note", () => {
			const dateTime = DateTime.fromISO("2024-08-17");
			const links = buildPeriodLinksForNote(dateTime, "yearly", mockSettings);

			expect(links.previous).toBe("[[Journal/Yearly/2023|2023]]");
			expect(links.next).toBe("[[Journal/Yearly/2025|2025]]");
			expect(links.parent).toBeUndefined();
			expect(links.year).toBeUndefined();
		});
	});
});
