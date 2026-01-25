import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins";
import { Setting } from "obsidian";
import { SETTINGS_DEFAULTS } from "../../constants";
import type { SettingsStore } from "../../core/settings-store";
import type { PeriodicPlannerSettingsSchema } from "../../types";
import type { SettingsSection } from "../../types/settings";
import { cls } from "../../utils/css";

export class PeriodicSection implements SettingsSection {
	readonly id = "periodic";
	readonly label = "Periodic Settings";

	constructor(
		private uiBuilder: SettingsUIBuilder<typeof PeriodicPlannerSettingsSchema>,
		private settingsStore: SettingsStore
	) {}

	render(containerEl: HTMLElement): void {
		this.displayFolders(containerEl);
		this.displayNaming(containerEl);
		this.displayTimeBudget(containerEl);
	}

	private displayFolders(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Periodic note folders").setHeading();

		containerEl.createEl("p", {
			text: "Configure the folder paths where your periodic notes will be stored. The plugin will create notes in these folders automatically.",
			cls: "setting-item-description",
		});

		this.uiBuilder.addText(containerEl, {
			key: "directories.dailyFolder",
			name: "Daily notes folder",
			desc: "Folder for daily notes (e.g., Periodic/Daily)",
			placeholder: SETTINGS_DEFAULTS.DAILY_FOLDER,
		});

		this.uiBuilder.addText(containerEl, {
			key: "directories.weeklyFolder",
			name: "Weekly notes folder",
			desc: "Folder for weekly notes (e.g., Periodic/Weekly)",
			placeholder: SETTINGS_DEFAULTS.WEEKLY_FOLDER,
		});

		this.uiBuilder.addText(containerEl, {
			key: "directories.monthlyFolder",
			name: "Monthly notes folder",
			desc: "Folder for monthly notes (e.g., Periodic/Monthly)",
			placeholder: SETTINGS_DEFAULTS.MONTHLY_FOLDER,
		});

		this.uiBuilder.addText(containerEl, {
			key: "directories.quarterlyFolder",
			name: "Quarterly notes folder",
			desc: "Folder for quarterly notes (e.g., Periodic/Quarterly)",
			placeholder: SETTINGS_DEFAULTS.QUARTERLY_FOLDER,
		});

		this.uiBuilder.addText(containerEl, {
			key: "directories.yearlyFolder",
			name: "Yearly notes folder",
			desc: "Folder for yearly notes (e.g., Periodic/Yearly)",
			placeholder: SETTINGS_DEFAULTS.YEARLY_FOLDER,
		});
	}

	private displayNaming(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Note naming patterns").setHeading();

		containerEl.createEl("p", {
			text: "Configure how your periodic notes are named using date format tokens.",
			cls: "setting-item-description",
		});

		const formatLink = containerEl.createEl("a", {
			text: "View format reference",
			href: "https://moment.github.io/luxon/#/formatting?id=table-of-tokens",
		});
		formatLink.setAttr("target", "_blank");
		containerEl.createEl("br");
		containerEl.createEl("br");

		this.uiBuilder.addText(containerEl, {
			key: "naming.dailyFormat",
			name: "Daily format",
			desc: "Format for daily notes (default: 04-12-2025)",
			placeholder: SETTINGS_DEFAULTS.DAILY_FORMAT,
		});

		this.uiBuilder.addText(containerEl, {
			key: "naming.weeklyFormat",
			name: "Weekly format",
			desc: "Format for weekly notes (default: 47-2025)",
			placeholder: SETTINGS_DEFAULTS.WEEKLY_FORMAT,
		});

		this.uiBuilder.addText(containerEl, {
			key: "naming.monthlyFormat",
			name: "Monthly format",
			desc: "Format for monthly notes (default: 5-2025)",
			placeholder: SETTINGS_DEFAULTS.MONTHLY_FORMAT,
		});

		this.uiBuilder.addText(containerEl, {
			key: "naming.quarterlyFormat",
			name: "Quarterly format",
			desc: "Format for quarterly notes (default: Q1-2025)",
			placeholder: SETTINGS_DEFAULTS.QUARTERLY_FORMAT,
		});

		this.uiBuilder.addText(containerEl, {
			key: "naming.yearlyFormat",
			name: "Yearly format",
			desc: "Format for yearly notes (default: 2025)",
			placeholder: SETTINGS_DEFAULTS.YEARLY_FORMAT,
		});
	}

	private displayTimeBudget(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Time budget").setHeading();

		containerEl.createEl("p", {
			text: "Configure your base time budget. All other periods are automatically calculated from your weekly hours.",
			cls: "setting-item-description",
		});

		new Setting(containerEl)
			.setName("Hours per week")
			.setDesc("Your base weekly hour budget for planning. All other periods are calculated from this value.")
			.addSlider((slider) => {
				slider
					.setLimits(1, 168, 1)
					.setValue(this.settingsStore.currentSettings.timeBudget.hoursPerWeek)
					.setDynamicTooltip()
					.onChange(async (value) => {
						await this.settingsStore.updateSettings((s) => ({
							...s,
							timeBudget: {
								...s.timeBudget,
								hoursPerWeek: value,
							},
						}));
					});
			})
			.addExtraButton((btn) => {
				btn
					.setIcon("reset")
					.setTooltip("Reset to default")
					.onClick(async () => {
						await this.settingsStore.updateSettings((s) => ({
							...s,
							timeBudget: {
								...s.timeBudget,
								hoursPerWeek: SETTINGS_DEFAULTS.HOURS_PER_WEEK,
							},
						}));
					});
			});

		this.uiBuilder.addToggle(containerEl, {
			key: "timeBudget.autoInheritParentPercentages",
			name: "Automatically inherit parent percentages",
			desc: "When enabled, opening the allocation editor for a child period with no categories will automatically fill allocations based on the parent period's percentage distribution.",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "timeBudget.hideUnusedCategoriesInEditor",
			name: "Hide unused categories by default",
			desc: "In the allocation editor, hide categories with no allocation from parent periods (except for yearly). Can be toggled in the editor.",
		});

		this.uiBuilder.addDropdown(containerEl, {
			key: "timeBudget.sortBy",
			name: "Default time budget sorting",
			desc: "Choose how categories are sorted in the time budget table by default",
			options: {
				"hours-desc": "Hours (highest first)",
				"hours-asc": "Hours (lowest first)",
				"category-desc": "Category (Z-A)",
				"category-asc": "Category (A-Z)",
			},
		});

		this.addCalculatedValues(containerEl);
	}

	private addCalculatedValues(containerEl: HTMLElement): void {
		const weeklyHours = this.settingsStore.currentSettings.timeBudget.hoursPerWeek;

		const calculated = {
			daily: Math.round(weeklyHours / 7),
			monthly: Math.round((weeklyHours * 52) / 12),
			quarterly: Math.round((weeklyHours * 52) / 4),
			yearly: weeklyHours * 52,
		};

		const infoEl = containerEl.createEl("div", {
			cls: cls("calculated-hours"),
		});
		infoEl.createEl("strong", { text: "Calculated hours from weekly budget:" });

		const list = infoEl.createEl("ul");
		list.createEl("li", { text: `Daily: ~${calculated.daily} hours` });
		list.createEl("li", { text: `Monthly: ~${calculated.monthly} hours` });
		list.createEl("li", { text: `Quarterly: ~${calculated.quarterly} hours` });
		list.createEl("li", { text: `Yearly: ~${calculated.yearly} hours` });
	}
}
