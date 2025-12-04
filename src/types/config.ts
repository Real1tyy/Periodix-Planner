import type { DateTimeUnit, DurationLike } from "luxon";
import { PERIOD_TYPES, type PeriodType } from "../constants";
import type { PeriodLinks } from "./period";
import type { DirectorySettings, NamingSettings } from "./schemas";

export const ORDERED_PERIOD_TYPES: PeriodType[] = [
	PERIOD_TYPES.YEARLY,
	PERIOD_TYPES.QUARTERLY,
	PERIOD_TYPES.MONTHLY,
	PERIOD_TYPES.WEEKLY,
	PERIOD_TYPES.DAILY,
];

export type LinkKey = keyof Omit<PeriodLinks, "previous" | "next">;

export interface PeriodConfig {
	luxonUnit: DateTimeUnit;
	duration: DurationLike;
	folderKey: keyof DirectorySettings;
	formatKey: keyof NamingSettings;
	linkKey: LinkKey | null;
	parent: PeriodType | null;
}

export const PERIOD_CONFIG: Record<PeriodType, PeriodConfig> = {
	daily: {
		luxonUnit: "day",
		duration: { days: 1 },
		folderKey: "dailyFolder",
		formatKey: "dailyFormat",
		linkKey: null,
		parent: "weekly",
	},
	weekly: {
		luxonUnit: "week",
		duration: { weeks: 1 },
		folderKey: "weeklyFolder",
		formatKey: "weeklyFormat",
		linkKey: "week",
		parent: "monthly",
	},
	monthly: {
		luxonUnit: "month",
		duration: { months: 1 },
		folderKey: "monthlyFolder",
		formatKey: "monthlyFormat",
		linkKey: "month",
		parent: "quarterly",
	},
	quarterly: {
		luxonUnit: "quarter",
		duration: { quarters: 1 },
		folderKey: "quarterlyFolder",
		formatKey: "quarterlyFormat",
		linkKey: "quarter",
		parent: "yearly",
	},
	yearly: {
		luxonUnit: "year",
		duration: { years: 1 },
		folderKey: "yearlyFolder",
		formatKey: "yearlyFormat",
		linkKey: "year",
		parent: null,
	},
};
