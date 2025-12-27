import type { DateTimeUnit, DurationLike } from "luxon";
import { PERIOD_TYPES, type PeriodType } from "../constants";
import type { PeriodChildren, PeriodLinks } from "./period";
import type { DirectorySettings, NamingSettings, TemplaterSettings } from "./schemas";

export const ORDERED_PERIOD_TYPES: PeriodType[] = [
	PERIOD_TYPES.YEARLY,
	PERIOD_TYPES.QUARTERLY,
	PERIOD_TYPES.MONTHLY,
	PERIOD_TYPES.WEEKLY,
	PERIOD_TYPES.DAILY,
];

type LinkKey = keyof Omit<PeriodLinks, "previous" | "next" | "parent">;
type ChildrenKey = keyof PeriodChildren;

interface PeriodConfig {
	luxonUnit: DateTimeUnit;
	duration: DurationLike;
	folderKey: keyof DirectorySettings;
	formatKey: keyof NamingSettings;
	templateKey: keyof Omit<TemplaterSettings, "enabled">;
	linkKey: LinkKey | null;
	childrenKey: ChildrenKey | null;
	parent: PeriodType | null;
	children: PeriodType[];
}

export const PERIOD_CONFIG: Record<PeriodType, PeriodConfig> = {
	daily: {
		luxonUnit: "day",
		duration: { days: 1 },
		folderKey: "dailyFolder",
		formatKey: "dailyFormat",
		templateKey: "dailyTemplate",
		linkKey: null,
		childrenKey: "days",
		parent: "weekly",
		children: [],
	},
	weekly: {
		luxonUnit: "week",
		duration: { weeks: 1 },
		folderKey: "weeklyFolder",
		formatKey: "weeklyFormat",
		templateKey: "weeklyTemplate",
		linkKey: "week",
		childrenKey: "weeks",
		parent: "monthly",
		children: ["daily"],
	},
	monthly: {
		luxonUnit: "month",
		duration: { months: 1 },
		folderKey: "monthlyFolder",
		formatKey: "monthlyFormat",
		templateKey: "monthlyTemplate",
		linkKey: "month",
		childrenKey: "months",
		parent: "quarterly",
		children: ["weekly", "daily"],
	},
	quarterly: {
		luxonUnit: "quarter",
		duration: { quarters: 1 },
		folderKey: "quarterlyFolder",
		formatKey: "quarterlyFormat",
		templateKey: "quarterlyTemplate",
		linkKey: "quarter",
		childrenKey: "quarters",
		parent: "yearly",
		children: ["monthly", "weekly", "daily"],
	},
	yearly: {
		luxonUnit: "year",
		duration: { years: 1 },
		folderKey: "yearlyFolder",
		formatKey: "yearlyFormat",
		templateKey: "yearlyTemplate",
		linkKey: "year",
		childrenKey: null,
		parent: null,
		children: ["quarterly", "monthly", "weekly", "daily"],
	},
};
