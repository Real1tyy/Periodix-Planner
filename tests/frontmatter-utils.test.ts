import type { CachedMetadata } from "obsidian";
import { describe, expect, it } from "vitest";
import type { PropertySettings } from "../src/types";
import {
	extractLinkTarget,
	getLinkFromFrontmatter,
	getParentLinkFromFrontmatter,
	getPeriodTypeFromFrontmatter,
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

	it("returns week link for daily note", () => {
		const cache = createCache({
			"Period Type": "daily",
			Week: "[[W01-2025]]",
		});
		expect(getParentLinkFromFrontmatter(cache, props)).toBe("W01-2025");
	});

	it("returns month link for weekly note", () => {
		const cache = createCache({
			"Period Type": "weekly",
			Month: "[[01-2025]]",
		});
		expect(getParentLinkFromFrontmatter(cache, props)).toBe("01-2025");
	});

	it("returns quarter link for monthly note", () => {
		const cache = createCache({
			"Period Type": "monthly",
			Quarter: "[[Q1-2025]]",
		});
		expect(getParentLinkFromFrontmatter(cache, props)).toBe("Q1-2025");
	});

	it("returns year link for quarterly note", () => {
		const cache = createCache({
			"Period Type": "quarterly",
			Year: "[[2025]]",
		});
		expect(getParentLinkFromFrontmatter(cache, props)).toBe("2025");
	});

	it("returns null for yearly note (no parent)", () => {
		const cache = createCache({
			"Period Type": "yearly",
		});
		expect(getParentLinkFromFrontmatter(cache, props)).toBeNull();
	});

	it("returns null when parent link is not set", () => {
		const cache = createCache({
			"Period Type": "daily",
		});
		expect(getParentLinkFromFrontmatter(cache, props)).toBeNull();
	});

	it("returns null when cache is null", () => {
		expect(getParentLinkFromFrontmatter(null, props)).toBeNull();
	});

	it("returns null when period type is not recognized", () => {
		const cache = createCache({
			"Period Type": "unknown",
		});
		expect(getParentLinkFromFrontmatter(cache, props)).toBeNull();
	});
});
