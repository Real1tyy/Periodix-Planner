import { z } from "zod";
import { SETTINGS_DEFAULTS } from "../constants";

// ===== Color Validation =====
export const ColorSchema = z
	.string()
	.regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color (e.g., #3B82F6)");

// ===== Category Schema =====
export const CategorySchema = z.object({
	id: z.string(),
	name: z.string().min(1, "Category name is required"),
	color: ColorSchema,
	description: z.string().optional(),
	createdAt: z.number().int().positive(),
	updatedAt: z.number().int().positive().optional(),
});

export type Category = z.infer<typeof CategorySchema>;

// ===== Time Allocation Schema =====
export const TimeAllocationSchema = z.object({
	categoryId: z.string(),
	hours: z.number().nonnegative(),
});

export type TimeAllocation = z.infer<typeof TimeAllocationSchema>;

// ===== Directory Settings Schema =====
export const DirectorySettingsSchema = z.object({
	dailyFolder: z.string().default(SETTINGS_DEFAULTS.DAILY_FOLDER),
	weeklyFolder: z.string().default(SETTINGS_DEFAULTS.WEEKLY_FOLDER),
	monthlyFolder: z.string().default(SETTINGS_DEFAULTS.MONTHLY_FOLDER),
	quarterlyFolder: z.string().default(SETTINGS_DEFAULTS.QUARTERLY_FOLDER),
	yearlyFolder: z.string().default(SETTINGS_DEFAULTS.YEARLY_FOLDER),
});

export type DirectorySettings = z.infer<typeof DirectorySettingsSchema>;

// ===== Naming Pattern Settings Schema =====
export const NamingSettingsSchema = z.object({
	dailyFormat: z.string().default(SETTINGS_DEFAULTS.DAILY_FORMAT),
	weeklyFormat: z.string().default(SETTINGS_DEFAULTS.WEEKLY_FORMAT),
	monthlyFormat: z.string().default(SETTINGS_DEFAULTS.MONTHLY_FORMAT),
	quarterlyFormat: z.string().default(SETTINGS_DEFAULTS.QUARTERLY_FORMAT),
	yearlyFormat: z.string().default(SETTINGS_DEFAULTS.YEARLY_FORMAT),
});

export type NamingSettings = z.infer<typeof NamingSettingsSchema>;

// ===== Time Budget Settings Schema =====
export const TimeBudgetSettingsSchema = z.object({
	hoursPerWeek: z.number().int().positive().max(168).default(SETTINGS_DEFAULTS.HOURS_PER_WEEK),
	// Optional overrides - calculated from weekly if not set
	hoursPerDayOverride: z.number().int().positive().max(24).optional(),
	hoursPerMonthOverride: z.number().int().positive().optional(),
	hoursPerQuarterOverride: z.number().int().positive().optional(),
	hoursPerYearOverride: z.number().int().positive().optional(),
});

export type TimeBudgetSettings = z.infer<typeof TimeBudgetSettingsSchema>;

// ===== Frontmatter Property Settings Schema =====
export const PropertySettingsSchema = z.object({
	// Navigation properties
	previousProp: z.string().default(SETTINGS_DEFAULTS.PREVIOUS_PROP),
	nextProp: z.string().default(SETTINGS_DEFAULTS.NEXT_PROP),
	parentProp: z.string().default(SETTINGS_DEFAULTS.PARENT_PROP),

	// Hierarchical link properties
	weekProp: z.string().default(SETTINGS_DEFAULTS.WEEK_PROP),
	monthProp: z.string().default(SETTINGS_DEFAULTS.MONTH_PROP),
	quarterProp: z.string().default(SETTINGS_DEFAULTS.QUARTER_PROP),
	yearProp: z.string().default(SETTINGS_DEFAULTS.YEAR_PROP),

	// Time budget properties
	hoursAvailableProp: z.string().default(SETTINGS_DEFAULTS.HOURS_AVAILABLE_PROP),
	hoursSpentProp: z.string().default(SETTINGS_DEFAULTS.HOURS_SPENT_PROP),

	// Period metadata
	periodTypeProp: z.string().default(SETTINGS_DEFAULTS.PERIOD_TYPE_PROP),
	periodStartProp: z.string().default(SETTINGS_DEFAULTS.PERIOD_START_PROP),
	periodEndProp: z.string().default(SETTINGS_DEFAULTS.PERIOD_END_PROP),
});

export type PropertySettings = z.infer<typeof PropertySettingsSchema>;

// ===== Generation Settings Schema =====
export const GenerationSettingsSchema = z.object({
	autoGenerateOnLoad: z.boolean().default(SETTINGS_DEFAULTS.AUTO_GENERATE_ON_LOAD),
	generatePeriodsAhead: z.number().int().min(1).max(5).default(SETTINGS_DEFAULTS.GENERATE_PERIODS_AHEAD),

	// PDF Link Settings
	includePdfFrontmatter: z.boolean().default(SETTINGS_DEFAULTS.INCLUDE_PDF_FRONTMATTER),
	includePdfContent: z.boolean().default(SETTINGS_DEFAULTS.INCLUDE_PDF_CONTENT),
	pdfNoteProp: z.string().default(SETTINGS_DEFAULTS.PDF_NOTE_PROP),
	pdfContentHeader: z.string().default(SETTINGS_DEFAULTS.PDF_CONTENT_HEADER),

	// Time Budget Code Block Settings
	includePlanHeading: z.boolean().default(SETTINGS_DEFAULTS.INCLUDE_PLAN_HEADING),
	planHeadingContent: z.string().default(SETTINGS_DEFAULTS.PLAN_HEADING_CONTENT),
});

export type GenerationSettings = z.infer<typeof GenerationSettingsSchema>;

// ===== UI Settings Schema =====
export const UISettingsSchema = z.object({
	warningThresholdPercent: z.number().int().min(50).max(100).default(SETTINGS_DEFAULTS.WARNING_THRESHOLD_PERCENT),
	overBudgetThresholdPercent: z
		.number()
		.int()
		.min(100)
		.max(150)
		.default(SETTINGS_DEFAULTS.OVER_BUDGET_THRESHOLD_PERCENT),
});

export type UISettings = z.infer<typeof UISettingsSchema>;

// ===== Main Plugin Settings Schema =====
export const PeriodicPlannerSettingsSchema = z.object({
	version: z.number().int().positive().default(1),

	// Directory configuration
	directories: DirectorySettingsSchema.default(DirectorySettingsSchema.parse({})),

	// Note naming patterns
	naming: NamingSettingsSchema.default(NamingSettingsSchema.parse({})),

	// Time budget configuration
	timeBudget: TimeBudgetSettingsSchema.default(TimeBudgetSettingsSchema.parse({})),

	// Frontmatter property names
	properties: PropertySettingsSchema.default(PropertySettingsSchema.parse({})),

	// Auto-generation settings
	generation: GenerationSettingsSchema.default(GenerationSettingsSchema.parse({})),

	// UI configuration
	ui: UISettingsSchema.default(UISettingsSchema.parse({})),

	// User-defined time categories
	categories: z.array(CategorySchema).default([]),
});

export type PeriodicPlannerSettings = z.infer<typeof PeriodicPlannerSettingsSchema>;
