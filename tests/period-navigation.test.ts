import { describe, expect, it } from "vitest";
import type { GenerationSettings } from "../src/types/schemas";
import {
	getEnabledAncestorPeriodTypes,
	getEnabledChildPeriodType,
	getEnabledChildrenKey,
	getEnabledDescendantPeriodTypes,
	getEnabledLinkKey,
	getEnabledParentPeriodType,
	getEnabledPeriodTypes,
	getTopLevelEnabledPeriod,
	isPeriodTypeEnabled,
} from "../src/utils/period-navigation";

const allEnabledSettings: GenerationSettings = {
	autoGenerateOnLoad: false,
	generatePeriodsAhead: 1,
	startingPeriodDate: "",
	enableDaily: true,
	enableWeekly: true,
	enableMonthly: true,
	enableQuarterly: true,
	enableYearly: true,
	includePdfFrontmatter: false,
	includePdfContent: false,
	pdfNoteProp: "Note",
	pdfContentHeader: "## Note",
	enablePdfCommands: false,
	autoInsertCodeBlock: true,
	includePlanHeading: true,
	planHeadingContent: "## Plan",
	includeBasesInGeneration: false,
	basesHeading: "## Bases",
	openYesterdayPdfOnStartup: false,
};

const allDisabledSettings: GenerationSettings = {
	...allEnabledSettings,
	enableDaily: false,
	enableWeekly: false,
	enableMonthly: false,
	enableQuarterly: false,
	enableYearly: false,
};

describe("isPeriodTypeEnabled", () => {
	it("should return true when all periods are enabled", () => {
		expect(isPeriodTypeEnabled("daily", allEnabledSettings)).toBe(true);
		expect(isPeriodTypeEnabled("weekly", allEnabledSettings)).toBe(true);
		expect(isPeriodTypeEnabled("monthly", allEnabledSettings)).toBe(true);
		expect(isPeriodTypeEnabled("quarterly", allEnabledSettings)).toBe(true);
		expect(isPeriodTypeEnabled("yearly", allEnabledSettings)).toBe(true);
	});

	it("should return false when all periods are disabled", () => {
		expect(isPeriodTypeEnabled("daily", allDisabledSettings)).toBe(false);
		expect(isPeriodTypeEnabled("weekly", allDisabledSettings)).toBe(false);
		expect(isPeriodTypeEnabled("monthly", allDisabledSettings)).toBe(false);
		expect(isPeriodTypeEnabled("quarterly", allDisabledSettings)).toBe(false);
		expect(isPeriodTypeEnabled("yearly", allDisabledSettings)).toBe(false);
	});

	it("should return correct status for selectively enabled periods", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableDaily: true,
			enableWeekly: false,
			enableMonthly: false,
			enableQuarterly: true,
			enableYearly: true,
		};

		expect(isPeriodTypeEnabled("daily", settings)).toBe(true);
		expect(isPeriodTypeEnabled("weekly", settings)).toBe(false);
		expect(isPeriodTypeEnabled("monthly", settings)).toBe(false);
		expect(isPeriodTypeEnabled("quarterly", settings)).toBe(true);
		expect(isPeriodTypeEnabled("yearly", settings)).toBe(true);
	});
});

describe("getEnabledPeriodTypes", () => {
	it("should return all period types when all are enabled", () => {
		const result = getEnabledPeriodTypes(allEnabledSettings);
		expect(result).toEqual(["yearly", "quarterly", "monthly", "weekly", "daily"]);
	});

	it("should return empty array when all periods are disabled", () => {
		const result = getEnabledPeriodTypes(allDisabledSettings);
		expect(result).toEqual([]);
	});

	it("should return only enabled periods in correct order", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableDaily: true,
			enableWeekly: false,
			enableMonthly: false,
			enableQuarterly: true,
			enableYearly: true,
		};

		const result = getEnabledPeriodTypes(settings);
		expect(result).toEqual(["yearly", "quarterly", "daily"]);
	});

	it("should maintain order from largest to smallest", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableDaily: true,
			enableWeekly: true,
			enableMonthly: false,
			enableQuarterly: false,
			enableYearly: true,
		};

		const result = getEnabledPeriodTypes(settings);
		expect(result).toEqual(["yearly", "weekly", "daily"]);
	});
});

describe("getTopLevelEnabledPeriod", () => {
	it("should return yearly when all periods are enabled", () => {
		const result = getTopLevelEnabledPeriod(allEnabledSettings);
		expect(result).toBe("yearly");
	});

	it("should return null when all periods are disabled", () => {
		const result = getTopLevelEnabledPeriod(allDisabledSettings);
		expect(result).toBe(null);
	});

	it("should return the first enabled period type", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableDaily: true,
			enableWeekly: false,
			enableMonthly: false,
			enableQuarterly: true,
			enableYearly: true,
		};

		const result = getTopLevelEnabledPeriod(settings);
		expect(result).toBe("yearly");
	});

	it("should return quarterly when yearly is disabled", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableYearly: false,
			enableQuarterly: true,
			enableMonthly: true,
			enableWeekly: true,
			enableDaily: true,
		};

		const result = getTopLevelEnabledPeriod(settings);
		expect(result).toBe("quarterly");
	});

	it("should return monthly when yearly and quarterly are disabled", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableYearly: false,
			enableQuarterly: false,
			enableMonthly: true,
			enableWeekly: true,
			enableDaily: true,
		};

		const result = getTopLevelEnabledPeriod(settings);
		expect(result).toBe("monthly");
	});

	it("should return daily when only daily is enabled", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableYearly: false,
			enableQuarterly: false,
			enableMonthly: false,
			enableWeekly: false,
			enableDaily: true,
		};

		const result = getTopLevelEnabledPeriod(settings);
		expect(result).toBe("daily");
	});
});

describe("getEnabledParentPeriodType", () => {
	it("should return correct parent when all periods are enabled", () => {
		expect(getEnabledParentPeriodType("daily", allEnabledSettings)).toBe("weekly");
		expect(getEnabledParentPeriodType("weekly", allEnabledSettings)).toBe("monthly");
		expect(getEnabledParentPeriodType("monthly", allEnabledSettings)).toBe("quarterly");
		expect(getEnabledParentPeriodType("quarterly", allEnabledSettings)).toBe("yearly");
		expect(getEnabledParentPeriodType("yearly", allEnabledSettings)).toBe(null);
	});

	it("should skip disabled periods and return next enabled parent", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableWeekly: false,
			enableMonthly: false,
		};

		expect(getEnabledParentPeriodType("daily", settings)).toBe("quarterly");
		expect(getEnabledParentPeriodType("quarterly", settings)).toBe("yearly");
	});

	it("should return null when no enabled parent exists", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableWeekly: false,
			enableMonthly: false,
			enableQuarterly: false,
			enableYearly: false,
		};

		expect(getEnabledParentPeriodType("daily", settings)).toBe(null);
	});

	it("should return null for disabled period type", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableWeekly: false,
		};

		expect(getEnabledParentPeriodType("weekly", settings)).toBe(null);
	});
});

describe("getEnabledChildPeriodType", () => {
	it("should return correct child when all periods are enabled", () => {
		expect(getEnabledChildPeriodType("yearly", allEnabledSettings)).toBe("quarterly");
		expect(getEnabledChildPeriodType("quarterly", allEnabledSettings)).toBe("monthly");
		expect(getEnabledChildPeriodType("monthly", allEnabledSettings)).toBe("weekly");
		expect(getEnabledChildPeriodType("weekly", allEnabledSettings)).toBe("daily");
		expect(getEnabledChildPeriodType("daily", allEnabledSettings)).toBe(null);
	});

	it("should skip disabled periods and return next enabled child", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableWeekly: false,
			enableMonthly: false,
		};

		expect(getEnabledChildPeriodType("yearly", settings)).toBe("quarterly");
		expect(getEnabledChildPeriodType("quarterly", settings)).toBe("daily");
		expect(getEnabledChildPeriodType("daily", settings)).toBe(null);
	});

	it("should return null when no enabled child exists", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableDaily: false,
			enableWeekly: false,
			enableMonthly: false,
			enableQuarterly: false,
		};

		expect(getEnabledChildPeriodType("yearly", settings)).toBe(null);
	});

	it("should return null for disabled period type", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableWeekly: false,
		};

		expect(getEnabledChildPeriodType("weekly", settings)).toBe(null);
	});
});

describe("getEnabledAncestorPeriodTypes", () => {
	it("should return all ancestors when all periods are enabled", () => {
		expect(getEnabledAncestorPeriodTypes("daily", allEnabledSettings)).toEqual([
			"yearly",
			"quarterly",
			"monthly",
			"weekly",
		]);
		expect(getEnabledAncestorPeriodTypes("weekly", allEnabledSettings)).toEqual(["yearly", "quarterly", "monthly"]);
		expect(getEnabledAncestorPeriodTypes("monthly", allEnabledSettings)).toEqual(["yearly", "quarterly"]);
		expect(getEnabledAncestorPeriodTypes("quarterly", allEnabledSettings)).toEqual(["yearly"]);
		expect(getEnabledAncestorPeriodTypes("yearly", allEnabledSettings)).toEqual([]);
	});

	it("should skip disabled ancestors", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableWeekly: false,
			enableMonthly: false,
		};

		expect(getEnabledAncestorPeriodTypes("daily", settings)).toEqual(["yearly", "quarterly"]);
	});

	it("should return empty array when no ancestors are enabled", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableWeekly: false,
			enableMonthly: false,
			enableQuarterly: false,
			enableYearly: false,
		};

		expect(getEnabledAncestorPeriodTypes("daily", settings)).toEqual([]);
	});

	it("should return empty array for disabled period type", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableWeekly: false,
		};

		expect(getEnabledAncestorPeriodTypes("weekly", settings)).toEqual([]);
	});
});

describe("getEnabledDescendantPeriodTypes", () => {
	it("should return all descendants when all periods are enabled", () => {
		expect(getEnabledDescendantPeriodTypes("yearly", allEnabledSettings)).toEqual([
			"quarterly",
			"monthly",
			"weekly",
			"daily",
		]);
		expect(getEnabledDescendantPeriodTypes("quarterly", allEnabledSettings)).toEqual(["monthly", "weekly", "daily"]);
		expect(getEnabledDescendantPeriodTypes("monthly", allEnabledSettings)).toEqual(["weekly", "daily"]);
		expect(getEnabledDescendantPeriodTypes("weekly", allEnabledSettings)).toEqual(["daily"]);
		expect(getEnabledDescendantPeriodTypes("daily", allEnabledSettings)).toEqual([]);
	});

	it("should skip disabled descendants", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableWeekly: false,
			enableMonthly: false,
		};

		expect(getEnabledDescendantPeriodTypes("yearly", settings)).toEqual(["quarterly", "daily"]);
		expect(getEnabledDescendantPeriodTypes("quarterly", settings)).toEqual(["daily"]);
	});

	it("should return empty array when no descendants are enabled", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableDaily: false,
			enableWeekly: false,
			enableMonthly: false,
			enableQuarterly: false,
		};

		expect(getEnabledDescendantPeriodTypes("yearly", settings)).toEqual([]);
	});

	it("should return empty array for disabled period type", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableWeekly: false,
		};

		expect(getEnabledDescendantPeriodTypes("weekly", settings)).toEqual([]);
	});
});

describe("getEnabledChildrenKey", () => {
	it("should return correct children key when all periods are enabled", () => {
		expect(getEnabledChildrenKey("yearly", allEnabledSettings)).toBe("quarters");
		expect(getEnabledChildrenKey("quarterly", allEnabledSettings)).toBe("months");
		expect(getEnabledChildrenKey("monthly", allEnabledSettings)).toBe("weeks");
		expect(getEnabledChildrenKey("weekly", allEnabledSettings)).toBe("days");
		expect(getEnabledChildrenKey("daily", allEnabledSettings)).toBe(null);
	});

	it("should return children key for next enabled child", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableMonthly: false,
		};

		expect(getEnabledChildrenKey("quarterly", settings)).toBe("weeks");
	});

	it("should return null when no enabled child exists", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableDaily: false,
		};

		expect(getEnabledChildrenKey("weekly", settings)).toBe(null);
	});

	it("should skip multiple disabled periods", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableQuarterly: false,
			enableMonthly: false,
			enableWeekly: false,
		};

		expect(getEnabledChildrenKey("yearly", settings)).toBe("days");
	});
});

describe("getEnabledLinkKey", () => {
	it("should return correct link key for enabled periods", () => {
		expect(getEnabledLinkKey("yearly", allEnabledSettings)).toBe("year");
		expect(getEnabledLinkKey("quarterly", allEnabledSettings)).toBe("quarter");
		expect(getEnabledLinkKey("monthly", allEnabledSettings)).toBe("month");
		expect(getEnabledLinkKey("weekly", allEnabledSettings)).toBe("week");
		expect(getEnabledLinkKey("daily", allEnabledSettings)).toBe(null);
	});

	it("should return null for disabled periods", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableMonthly: false,
		};

		expect(getEnabledLinkKey("monthly", settings)).toBe(null);
	});

	it("should return null for daily period without link key", () => {
		expect(getEnabledLinkKey("daily", allEnabledSettings)).toBe(null);
	});
});

describe("Complex scenarios", () => {
	it("should handle only yearly and daily enabled", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableWeekly: false,
			enableMonthly: false,
			enableQuarterly: false,
		};

		expect(getEnabledPeriodTypes(settings)).toEqual(["yearly", "daily"]);
		expect(getEnabledParentPeriodType("daily", settings)).toBe("yearly");
		expect(getEnabledChildPeriodType("yearly", settings)).toBe("daily");
		expect(getEnabledAncestorPeriodTypes("daily", settings)).toEqual(["yearly"]);
		expect(getEnabledDescendantPeriodTypes("yearly", settings)).toEqual(["daily"]);
		expect(getEnabledChildrenKey("yearly", settings)).toBe("days");
	});

	it("should handle quarterly and weekly enabled (skip monthly)", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableDaily: false,
			enableMonthly: false,
			enableYearly: false,
		};

		expect(getEnabledPeriodTypes(settings)).toEqual(["quarterly", "weekly"]);
		expect(getEnabledParentPeriodType("weekly", settings)).toBe("quarterly");
		expect(getEnabledChildPeriodType("quarterly", settings)).toBe("weekly");
		expect(getEnabledChildrenKey("quarterly", settings)).toBe("weeks");
	});

	it("should handle only one period enabled", () => {
		const settings: GenerationSettings = {
			...allEnabledSettings,
			enableDaily: false,
			enableWeekly: false,
			enableQuarterly: false,
			enableYearly: false,
		};

		expect(getEnabledPeriodTypes(settings)).toEqual(["monthly"]);
		expect(getEnabledParentPeriodType("monthly", settings)).toBe(null);
		expect(getEnabledChildPeriodType("monthly", settings)).toBe(null);
		expect(getEnabledAncestorPeriodTypes("monthly", settings)).toEqual([]);
		expect(getEnabledDescendantPeriodTypes("monthly", settings)).toEqual([]);
		expect(getEnabledChildrenKey("monthly", settings)).toBe(null);
	});
});
