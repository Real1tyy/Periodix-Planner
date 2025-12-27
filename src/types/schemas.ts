import { z } from "zod";
import { PERIOD_TYPES, SETTINGS_DEFAULTS } from "../constants";
import { ColorSchema, DateTimeSchema } from "../utils/validation-utils";

// ===== Category Schema =====
export const CategorySchema = z
	.object({
		id: z.string(),
		name: z.string().min(1, "Category name is required"),
		color: ColorSchema,
		description: z.string().optional(),
		createdAt: z.number().int().positive(),
		updatedAt: z.number().int().positive().optional(),
	})
	.strip();

export type Category = z.infer<typeof CategorySchema>;

// ===== Time Allocation Schema =====
const TimeAllocationSchema = z
	.object({
		categoryId: z.string(),
		hours: z.number().nonnegative(),
	})
	.strip();

export type TimeAllocation = z.infer<typeof TimeAllocationSchema>;

export const FrontmatterSchema = z
	.object({
		periodType: z.enum([
			PERIOD_TYPES.DAILY,
			PERIOD_TYPES.WEEKLY,
			PERIOD_TYPES.MONTHLY,
			PERIOD_TYPES.QUARTERLY,
			PERIOD_TYPES.YEARLY,
		]),
		periodStart: DateTimeSchema,
		periodEnd: DateTimeSchema,
	})
	.strip();

export type Frontmatter = z.infer<typeof FrontmatterSchema>;

// ===== Directory Settings Schema =====
export const DirectorySettingsSchema = z
	.object({
		dailyFolder: z.string().catch(SETTINGS_DEFAULTS.DAILY_FOLDER),
		weeklyFolder: z.string().catch(SETTINGS_DEFAULTS.WEEKLY_FOLDER),
		monthlyFolder: z.string().catch(SETTINGS_DEFAULTS.MONTHLY_FOLDER),
		quarterlyFolder: z.string().catch(SETTINGS_DEFAULTS.QUARTERLY_FOLDER),
		yearlyFolder: z.string().catch(SETTINGS_DEFAULTS.YEARLY_FOLDER),
	})
	.strip();

export type DirectorySettings = z.infer<typeof DirectorySettingsSchema>;

// ===== Naming Pattern Settings Schema =====
export const NamingSettingsSchema = z
	.object({
		dailyFormat: z.string().catch(SETTINGS_DEFAULTS.DAILY_FORMAT),
		weeklyFormat: z.string().catch(SETTINGS_DEFAULTS.WEEKLY_FORMAT),
		monthlyFormat: z.string().catch(SETTINGS_DEFAULTS.MONTHLY_FORMAT),
		quarterlyFormat: z.string().catch(SETTINGS_DEFAULTS.QUARTERLY_FORMAT),
		yearlyFormat: z.string().catch(SETTINGS_DEFAULTS.YEARLY_FORMAT),
	})
	.strip();

export type NamingSettings = z.infer<typeof NamingSettingsSchema>;

// ===== Time Budget Settings Schema =====
export const TimeBudgetSettingsSchema = z
	.object({
		hoursPerWeek: z.number().int().positive().max(168).catch(SETTINGS_DEFAULTS.HOURS_PER_WEEK),
		autoInheritParentPercentages: z.boolean().catch(SETTINGS_DEFAULTS.AUTO_INHERIT_PARENT_PERCENTAGES),
	})
	.strip();

export type TimeBudgetSettings = z.infer<typeof TimeBudgetSettingsSchema>;

// ===== Frontmatter Property Settings Schema =====
const PropertySettingsSchema = z
	.object({
		// Navigation properties
		previousProp: z.string().catch(SETTINGS_DEFAULTS.PREVIOUS_PROP),
		nextProp: z.string().catch(SETTINGS_DEFAULTS.NEXT_PROP),
		parentProp: z.string().catch(SETTINGS_DEFAULTS.PARENT_PROP),

		// Hierarchical link properties
		weekProp: z.string().catch(SETTINGS_DEFAULTS.WEEK_PROP),
		monthProp: z.string().catch(SETTINGS_DEFAULTS.MONTH_PROP),
		quarterProp: z.string().catch(SETTINGS_DEFAULTS.QUARTER_PROP),
		yearProp: z.string().catch(SETTINGS_DEFAULTS.YEAR_PROP),

		// Time budget properties
		hoursAvailableProp: z.string().catch(SETTINGS_DEFAULTS.HOURS_AVAILABLE_PROP),
		hoursSpentProp: z.string().catch(SETTINGS_DEFAULTS.HOURS_SPENT_PROP),

		// Period metadata
		periodTypeProp: z.string().catch(SETTINGS_DEFAULTS.PERIOD_TYPE_PROP),
		periodStartProp: z.string().catch(SETTINGS_DEFAULTS.PERIOD_START_PROP),
		periodEndProp: z.string().catch(SETTINGS_DEFAULTS.PERIOD_END_PROP),
	})
	.strip();

export type PropertySettings = z.infer<typeof PropertySettingsSchema>;

// ===== Generation Settings Schema =====
const GenerationSettingsSchema = z
	.object({
		autoGenerateOnLoad: z.boolean().catch(SETTINGS_DEFAULTS.AUTO_GENERATE_ON_LOAD),
		generatePeriodsAhead: z.number().int().min(1).max(5).catch(SETTINGS_DEFAULTS.GENERATE_PERIODS_AHEAD),

		// Period Enablement Settings
		enableDaily: z.boolean().catch(SETTINGS_DEFAULTS.ENABLE_DAILY),
		enableWeekly: z.boolean().catch(SETTINGS_DEFAULTS.ENABLE_WEEKLY),
		enableMonthly: z.boolean().catch(SETTINGS_DEFAULTS.ENABLE_MONTHLY),
		enableQuarterly: z.boolean().catch(SETTINGS_DEFAULTS.ENABLE_QUARTERLY),
		enableYearly: z.boolean().catch(SETTINGS_DEFAULTS.ENABLE_YEARLY),

		// PDF Link Settings
		includePdfFrontmatter: z.boolean().catch(SETTINGS_DEFAULTS.INCLUDE_PDF_FRONTMATTER),
		includePdfContent: z.boolean().catch(SETTINGS_DEFAULTS.INCLUDE_PDF_CONTENT),
		pdfNoteProp: z.string().catch(SETTINGS_DEFAULTS.PDF_NOTE_PROP),
		pdfContentHeader: z.string().catch(SETTINGS_DEFAULTS.PDF_CONTENT_HEADER),
		enablePdfCommands: z.boolean().catch(SETTINGS_DEFAULTS.ENABLE_PDF_COMMANDS),

		// Time Budget Code Block Settings
		autoInsertCodeBlock: z.boolean().catch(SETTINGS_DEFAULTS.AUTO_INSERT_CODE_BLOCK),
		includePlanHeading: z.boolean().catch(SETTINGS_DEFAULTS.INCLUDE_PLAN_HEADING),
		planHeadingContent: z.string().catch(SETTINGS_DEFAULTS.PLAN_HEADING_CONTENT),
	})
	.strip();

export type GenerationSettings = z.infer<typeof GenerationSettingsSchema>;

// ===== UI Settings Schema =====
const UISettingsSchema = z
	.object({
		warningThresholdPercent: z.number().int().min(50).max(100).catch(SETTINGS_DEFAULTS.WARNING_THRESHOLD_PERCENT),
		overBudgetThresholdPercent: z
			.number()
			.int()
			.min(100)
			.max(150)
			.catch(SETTINGS_DEFAULTS.OVER_BUDGET_THRESHOLD_PERCENT),
	})
	.strip();

// ===== ActivityWatch Settings Schema =====
const ActivityWatchSettingsSchema = z
	.object({
		enabled: z.boolean().catch(SETTINGS_DEFAULTS.ENABLE_ACTIVITY_WATCH),
		apiUrl: z.url().catch(SETTINGS_DEFAULTS.ACTIVITY_WATCH_URL),
		heading: z.string().catch(SETTINGS_DEFAULTS.ACTIVITY_WATCH_HEADING),
		codeFence: z.string().catch(SETTINGS_DEFAULTS.ACTIVITY_WATCH_CODE_FENCE),
	})
	.strip();

// ===== Templater Settings Schema =====
const TemplaterSettingsSchema = z
	.object({
		enabled: z.boolean().catch(SETTINGS_DEFAULTS.ENABLE_TEMPLATER),
		dailyTemplate: z.string().catch(SETTINGS_DEFAULTS.TEMPLATER_DAILY_TEMPLATE),
		weeklyTemplate: z.string().catch(SETTINGS_DEFAULTS.TEMPLATER_WEEKLY_TEMPLATE),
		monthlyTemplate: z.string().catch(SETTINGS_DEFAULTS.TEMPLATER_MONTHLY_TEMPLATE),
		quarterlyTemplate: z.string().catch(SETTINGS_DEFAULTS.TEMPLATER_QUARTERLY_TEMPLATE),
		yearlyTemplate: z.string().catch(SETTINGS_DEFAULTS.TEMPLATER_YEARLY_TEMPLATE),
	})
	.strip();

export type TemplaterSettings = z.infer<typeof TemplaterSettingsSchema>;

// ===== Main Plugin Settings Schema =====
export const PeriodicPlannerSettingsSchema = z
	.object({
		version: z.number().int().positive().catch(1),

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

		// ActivityWatch integration
		activityWatch: ActivityWatchSettingsSchema.default(ActivityWatchSettingsSchema.parse({})),

		// Templater integration
		templater: TemplaterSettingsSchema.default(TemplaterSettingsSchema.parse({})),

		// User-defined time categories
		categories: z.array(CategorySchema).catch([]),
	})
	.strip();

export type PeriodicPlannerSettings = z.infer<typeof PeriodicPlannerSettingsSchema>;
