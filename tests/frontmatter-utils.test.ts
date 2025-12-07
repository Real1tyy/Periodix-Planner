import type { CachedMetadata } from "obsidian";
import { describe, expect, it } from "vitest";
import type { PropertySettings } from "../src/types";
import {
	createWikiLink,
	extractFilenameFromPath,
	extractLinkTarget,
	extractParentLinksFromFrontmatter,
	getLinkFromFrontmatter,
	getParentLinkFromFrontmatter,
	getPeriodTypeFromFrontmatter,
	parseWikiLink,
	resolveFilePath,
} from "../src/utils/frontmatter-utils";

describe("extractLinkTarget", () => {
	it("extracts target from wiki link", () => {
		expect(extractLinkTarget("[[My Note]]")).toBe("My Note");
	});

	it("extracts target from wiki link with alias", () => {
		expect(extractLinkTarget("[[My Note|Alias]]")).toBe("My Note");
	});

	it("extracts target from wiki link with path", () => {
		expect(extractLinkTarget("[[folder/My Note]]")).toBe("folder/My Note");
	});

	it("returns null for non-wiki link", () => {
		expect(extractLinkTarget("plain text")).toBeNull();
	});

	it("returns null for empty string", () => {
		expect(extractLinkTarget("")).toBeNull();
	});

	it("handles link with quotes", () => {
		expect(extractLinkTarget('"[[My Note]]"')).toBe("My Note");
	});
});

describe("getLinkFromFrontmatter", () => {
	const createCache = (frontmatter: Record<string, unknown>): CachedMetadata => ({ frontmatter }) as CachedMetadata;

	it("returns link target from frontmatter property", () => {
		const cache = createCache({ Previous: "[[2025-01-01]]" });
		expect(getLinkFromFrontmatter(cache, "Previous")).toBe("2025-01-01");
	});

	it("returns null when property does not exist", () => {
		const cache = createCache({});
		expect(getLinkFromFrontmatter(cache, "Previous")).toBeNull();
	});

	it("returns null when cache is null", () => {
		expect(getLinkFromFrontmatter(null, "Previous")).toBeNull();
	});

	it("returns null when frontmatter is undefined", () => {
		const cache = {} as CachedMetadata;
		expect(getLinkFromFrontmatter(cache, "Previous")).toBeNull();
	});

	it("returns null when value is not a wiki link", () => {
		const cache = createCache({ Previous: "plain text" });
		expect(getLinkFromFrontmatter(cache, "Previous")).toBeNull();
	});
});

describe("getPeriodTypeFromFrontmatter", () => {
	const props: PropertySettings = {
		previousProp: "Previous",
		nextProp: "Next",
		parentProp: "Parent",
		weekProp: "Week",
		monthProp: "Month",
		quarterProp: "Quarter",
		yearProp: "Year",
		hoursAvailableProp: "Hours Available",
		timeAllocationsProp: "Time Allocations",
		hoursSpentProp: "Hours Spent",
		periodTypeProp: "Period Type",
		periodStartProp: "Period Start",
		periodEndProp: "Period End",
	};

	const createCache = (frontmatter: Record<string, unknown>): CachedMetadata => ({ frontmatter }) as CachedMetadata;

	it("returns period type from frontmatter", () => {
		const cache = createCache({ "Period Type": "daily" });
		expect(getPeriodTypeFromFrontmatter(cache, props)).toBe("daily");
	});

	it("returns null when period type is not set", () => {
		const cache = createCache({});
		expect(getPeriodTypeFromFrontmatter(cache, props)).toBeNull();
	});

	it("returns null when cache is null", () => {
		expect(getPeriodTypeFromFrontmatter(null, props)).toBeNull();
	});
});

describe("getParentLinkFromFrontmatter", () => {
	const props: PropertySettings = {
		previousProp: "Previous",
		nextProp: "Next",
		parentProp: "Parent",
		weekProp: "Week",
		monthProp: "Month",
		quarterProp: "Quarter",
		yearProp: "Year",
		hoursAvailableProp: "Hours Available",
		timeAllocationsProp: "Time Allocations",
		hoursSpentProp: "Hours Spent",
		periodTypeProp: "Period Type",
		periodStartProp: "Period Start",
		periodEndProp: "Period End",
	};

	const createCache = (frontmatter: Record<string, unknown>): CachedMetadata => ({ frontmatter }) as CachedMetadata;

	it("returns parent link from frontmatter", () => {
		const cache = createCache({
			Parent: "[[W01-2025]]",
		});
		expect(getParentLinkFromFrontmatter(cache, props)).toBe("W01-2025");
	});

	it("returns null when parent is not set", () => {
		const cache = createCache({});
		expect(getParentLinkFromFrontmatter(cache, props)).toBeNull();
	});

	it("returns null when cache is null", () => {
		expect(getParentLinkFromFrontmatter(null, props)).toBeNull();
	});
});

describe("extractLinkTarget with non-string values", () => {
	it("returns null for undefined", () => {
		expect(extractLinkTarget(undefined)).toBeNull();
	});

	it("returns null for null", () => {
		expect(extractLinkTarget(null)).toBeNull();
	});

	it("returns null for number", () => {
		expect(extractLinkTarget(123)).toBeNull();
	});

	it("returns null for object", () => {
		expect(extractLinkTarget({ link: "[[Note]]" })).toBeNull();
	});
});

describe("extractParentLinksFromFrontmatter", () => {
	const props: PropertySettings = {
		previousProp: "Previous",
		nextProp: "Next",
		parentProp: "Parent",
		weekProp: "Week",
		monthProp: "Month",
		quarterProp: "Quarter",
		yearProp: "Year",
		hoursAvailableProp: "Hours Available",
		timeAllocationsProp: "Time Allocations",
		hoursSpentProp: "Hours Spent",
		periodTypeProp: "Period Type",
		periodStartProp: "Period Start",
		periodEndProp: "Period End",
	};

	it("extracts all parent links from frontmatter", () => {
		const frontmatter = {
			Parent: "[[2024-W49]]",
			Week: "[[2024-W49]]",
			Month: "[[2024-12]]",
			Quarter: "[[2024-Q4]]",
			Year: "[[2024]]",
		};

		const result = extractParentLinksFromFrontmatter(frontmatter, props);

		expect(result).toEqual({
			parent: "2024-W49",
			week: "2024-W49",
			month: "2024-12",
			quarter: "2024-Q4",
			year: "2024",
		});
	});

	it("returns undefined for missing links", () => {
		const frontmatter = {
			Parent: "[[2024-W49]]",
		};

		const result = extractParentLinksFromFrontmatter(frontmatter, props);

		expect(result).toEqual({
			parent: "2024-W49",
			week: undefined,
			month: undefined,
			quarter: undefined,
			year: undefined,
		});
	});

	it("handles empty frontmatter", () => {
		const result = extractParentLinksFromFrontmatter({}, props);

		expect(result).toEqual({
			parent: undefined,
			week: undefined,
			month: undefined,
			quarter: undefined,
			year: undefined,
		});
	});

	it("handles links with aliases", () => {
		const frontmatter = {
			Parent: "[[2024-W49|Week 49]]",
			Month: "[[2024-12|December]]",
		};

		const result = extractParentLinksFromFrontmatter(frontmatter, props);

		expect(result).toEqual({
			parent: "2024-W49",
			week: undefined,
			month: "2024-12",
			quarter: undefined,
			year: undefined,
		});
	});
});

describe("resolveFilePath", () => {
	it("adds .md extension when missing", () => {
		expect(resolveFilePath("2024-W49")).toBe("2024-W49.md");
	});

	it("preserves .md extension when present", () => {
		expect(resolveFilePath("2024-W49.md")).toBe("2024-W49.md");
	});

	it("handles paths with folders", () => {
		expect(resolveFilePath("folder/2024-W49")).toBe("folder/2024-W49.md");
	});

	it("handles paths with folders and .md extension", () => {
		expect(resolveFilePath("folder/2024-W49.md")).toBe("folder/2024-W49.md");
	});
});

describe("createWikiLink", () => {
	it("creates wiki link with full path and alias", () => {
		expect(createWikiLink("Journal/Daily Reflections/04-12-2025", "04-12-2025")).toBe(
			"[[Journal/Daily Reflections/04-12-2025|04-12-2025]]"
		);
	});

	it("removes .md extension from path", () => {
		expect(createWikiLink("Journal/Daily Reflections/04-12-2025.md", "04-12-2025")).toBe(
			"[[Journal/Daily Reflections/04-12-2025|04-12-2025]]"
		);
	});

	it("handles simple path without folders", () => {
		expect(createWikiLink("2025-01-01", "January 1")).toBe("[[2025-01-01|January 1]]");
	});

	it("handles nested folder paths", () => {
		expect(createWikiLink("Yearly/2025/Quarterly/Q1-2025", "Q1 2025")).toBe(
			"[[Yearly/2025/Quarterly/Q1-2025|Q1 2025]]"
		);
	});

	it("handles alias with special characters", () => {
		expect(createWikiLink("Notes/My Note", "Note with | pipe")).toBe("[[Notes/My Note|Note with | pipe]]");
	});
});

describe("parseWikiLink", () => {
	it("parses wiki link with full path and alias", () => {
		const result = parseWikiLink("[[Journal/Daily Reflections/04-12-2025|04-12-2025]]");
		expect(result).toEqual({
			fullPath: "Journal/Daily Reflections/04-12-2025",
			fileName: "04-12-2025",
			alias: "04-12-2025",
		});
	});

	it("parses wiki link without alias", () => {
		const result = parseWikiLink("[[Journal/Daily Reflections/04-12-2025]]");
		expect(result).toEqual({
			fullPath: "Journal/Daily Reflections/04-12-2025",
			fileName: "04-12-2025",
			alias: null,
		});
	});

	it("removes .md extension from path and filename", () => {
		const result = parseWikiLink("[[Journal/Daily Reflections/04-12-2025.md|04-12-2025]]");
		expect(result).toEqual({
			fullPath: "Journal/Daily Reflections/04-12-2025",
			fileName: "04-12-2025",
			alias: "04-12-2025",
		});
	});

	it("extracts filename from nested path", () => {
		const result = parseWikiLink("[[Yearly/2025/Quarterly/Q1-2025|Q1 2025]]");
		expect(result).toEqual({
			fullPath: "Yearly/2025/Quarterly/Q1-2025",
			fileName: "Q1-2025",
			alias: "Q1 2025",
		});
	});

	it("handles simple path without folders", () => {
		const result = parseWikiLink("[[2025-01-01|January 1]]");
		expect(result).toEqual({
			fullPath: "2025-01-01",
			fileName: "2025-01-01",
			alias: "January 1",
		});
	});

	it("handles link with empty alias", () => {
		const result = parseWikiLink("[[Journal/Daily Reflections/04-12-2025|]]");
		expect(result).toEqual({
			fullPath: "Journal/Daily Reflections/04-12-2025",
			fileName: "04-12-2025",
			alias: null,
		});
	});

	it("handles link with whitespace-only alias", () => {
		const result = parseWikiLink("[[Journal/Daily Reflections/04-12-2025|   ]]");
		expect(result).toEqual({
			fullPath: "Journal/Daily Reflections/04-12-2025",
			fileName: "04-12-2025",
			alias: null,
		});
	});

	it("returns null for non-wiki link string", () => {
		expect(parseWikiLink("plain text")).toBeNull();
	});

	it("returns null for empty string", () => {
		expect(parseWikiLink("")).toBeNull();
	});

	it("returns null for invalid wiki link format", () => {
		expect(parseWikiLink("[[incomplete")).toBeNull();
	});

	it("returns null for non-string input", () => {
		expect(parseWikiLink(null as unknown as string)).toBeNull();
		expect(parseWikiLink(undefined as unknown as string)).toBeNull();
		expect(parseWikiLink(123 as unknown as string)).toBeNull();
	});

	it("handles link with pipe in alias", () => {
		const result = parseWikiLink("[[Notes/My Note|Note with | pipe]]");
		expect(result).toEqual({
			fullPath: "Notes/My Note",
			fileName: "My Note",
			alias: "Note with | pipe",
		});
	});

	it("handles root-level file", () => {
		const result = parseWikiLink("[[root-file|Root File]]");
		expect(result).toEqual({
			fullPath: "root-file",
			fileName: "root-file",
			alias: "Root File",
		});
	});

	it("trims whitespace from path and alias", () => {
		const result = parseWikiLink("[[  Journal/Note  |  Alias  ]]");
		expect(result).toEqual({
			fullPath: "Journal/Note",
			fileName: "Note",
			alias: "Alias",
		});
	});
});

describe("extractLinkTarget with full path links", () => {
	it("extracts full path from link with alias", () => {
		expect(extractLinkTarget("[[Journal/Daily Reflections/04-12-2025|04-12-2025]]")).toBe(
			"Journal/Daily Reflections/04-12-2025"
		);
	});

	it("extracts full path from nested link", () => {
		expect(extractLinkTarget("[[Yearly/2025/Quarterly/Q1-2025|Q1 2025]]")).toBe("Yearly/2025/Quarterly/Q1-2025");
	});

	it("extracts path even when .md extension is present", () => {
		expect(extractLinkTarget("[[Journal/Daily Reflections/04-12-2025.md|04-12-2025]]")).toBe(
			"Journal/Daily Reflections/04-12-2025.md"
		);
	});
});

describe("extractFilenameFromPath", () => {
	it("extracts filename from full path", () => {
		expect(extractFilenameFromPath("Journal/Daily Reflections/09-12-2025")).toBe("09-12-2025");
	});

	it("extracts filename from path with .md extension", () => {
		expect(extractFilenameFromPath("Journal/Daily Reflections/09-12-2025.md")).toBe("09-12-2025");
	});

	it("handles simple filename without path", () => {
		expect(extractFilenameFromPath("09-12-2025")).toBe("09-12-2025");
	});

	it("handles nested folder paths", () => {
		expect(extractFilenameFromPath("Yearly/2025/Quarterly/Q1-2025")).toBe("Q1-2025");
	});

	it("handles root-level file", () => {
		expect(extractFilenameFromPath("root-file.md")).toBe("root-file");
	});
});
