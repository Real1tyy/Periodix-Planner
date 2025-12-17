/**
 * Default values for all Periodic Planner settings.
 * Using constants ensures consistency and makes defaults easy to change.
 */
export const SETTINGS_DEFAULTS = {
	// ===== Directory Settings =====
	DAILY_FOLDER: "Periodic/Daily",
	WEEKLY_FOLDER: "Periodic/Weekly",
	MONTHLY_FOLDER: "Periodic/Monthly",
	QUARTERLY_FOLDER: "Periodic/Quarterly",
	YEARLY_FOLDER: "Periodic/Yearly",

	// ===== Note Naming Patterns =====
	// Using Luxon format tokens
	DAILY_FORMAT: "dd-MM-yyyy", // 04-12-2025
	WEEKLY_FORMAT: "WW-kkkk", // 47-2025
	MONTHLY_FORMAT: "M-yyyy", // 5-2025
	QUARTERLY_FORMAT: "'Q'q-yyyy", // Q1-2025
	YEARLY_FORMAT: "yyyy", // 2025

	// ===== Time Budget Settings =====
	HOURS_PER_WEEK: 40, // Default productive hours per week
	// Daily/Monthly/Quarterly/Yearly are calculated from weekly unless overridden

	// ===== Frontmatter Property Names - space-cased values =====
	// Navigation properties
	PREVIOUS_PROP: "Previous",
	NEXT_PROP: "Next",
	PARENT_PROP: "Parent",

	// Hierarchical link properties
	WEEK_PROP: "Week",
	MONTH_PROP: "Month",
	QUARTER_PROP: "Quarter",
	YEAR_PROP: "Year",

	// Time budget properties (values with spaces)
	HOURS_AVAILABLE_PROP: "Hours Available",
	HOURS_SPENT_PROP: "Hours Spent",

	// Period metadata (values with spaces)
	PERIOD_TYPE_PROP: "Period Type",
	PERIOD_START_PROP: "Period Start",
	PERIOD_END_PROP: "Period End",

	// ===== Category Settings =====
	DEFAULT_CATEGORY_COLORS: [
		"#3B82F6", // Blue
		"#10B981", // Green
		"#8B5CF6", // Purple
		"#F59E0B", // Amber
		"#EF4444", // Red
		"#EC4899", // Pink
		"#06B6D4", // Cyan
		"#84CC16", // Lime
	],

	// ===== UI Settings =====
	MAX_CATEGORIES: 20,
	WARNING_THRESHOLD_PERCENT: 80, // Yellow warning when 80% allocated
	OVER_BUDGET_THRESHOLD_PERCENT: 100, // Red when over 100%

	// ===== Auto-Generation Settings =====
	AUTO_GENERATE_ON_LOAD: true,
	GENERATE_PERIODS_AHEAD: 1, // Always generate 1 period into the future

	// ===== PDF Link Settings =====
	INCLUDE_PDF_FRONTMATTER: false,
	INCLUDE_PDF_CONTENT: false,
	PDF_NOTE_PROP: "Note",
	PDF_CONTENT_HEADER: "## Note",

	// ===== Time Budget Code Block Settings =====
	INCLUDE_PLAN_HEADING: true,
	PLAN_HEADING_CONTENT: "## Plan",

	// ===== Auto-Inherit Settings =====
	AUTO_INHERIT_PARENT_PERCENTAGES: false,
} as const;

/**
 * Period types for the hierarchical note system
 */
export const PERIOD_TYPES = {
	DAILY: "daily",
	WEEKLY: "weekly",
	MONTHLY: "monthly",
	QUARTERLY: "quarterly",
	YEARLY: "yearly",
} as const;

export type PeriodType = (typeof PERIOD_TYPES)[keyof typeof PERIOD_TYPES];

/**
 * Display labels for period types
 */
export const PERIOD_TYPE_LABELS: Record<PeriodType, string> = {
	daily: "Daily",
	weekly: "Weekly",
	monthly: "Monthly",
	quarterly: "Quarterly",
	yearly: "Yearly",
};
