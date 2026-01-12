import { Setting } from "obsidian";
import { SETTINGS_DEFAULTS } from "../../constants";
import type { SettingsStore } from "../../core/settings-store";
import type { SettingsSection } from "../../types/settings";
import { cls } from "../../utils/css";

export class PeriodicSection implements SettingsSection {
	readonly id = "periodic";
	readonly label = "Periodic Settings";

	constructor(private settingsStore: SettingsStore) {}

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

		this.addFolderSetting(
			containerEl,
			"Daily notes folder",
			"Folder for daily notes (e.g., Periodic/Daily)",
			"dailyFolder",
			SETTINGS_DEFAULTS.DAILY_FOLDER
		);

		this.addFolderSetting(
			containerEl,
			"Weekly notes folder",
			"Folder for weekly notes (e.g., Periodic/Weekly)",
			"weeklyFolder",
			SETTINGS_DEFAULTS.WEEKLY_FOLDER
		);

		this.addFolderSetting(
			containerEl,
			"Monthly notes folder",
			"Folder for monthly notes (e.g., Periodic/Monthly)",
			"monthlyFolder",
			SETTINGS_DEFAULTS.MONTHLY_FOLDER
		);

		this.addFolderSetting(
			containerEl,
			"Quarterly notes folder",
			"Folder for quarterly notes (e.g., Periodic/Quarterly)",
			"quarterlyFolder",
			SETTINGS_DEFAULTS.QUARTERLY_FOLDER
		);

		this.addFolderSetting(
			containerEl,
			"Yearly notes folder",
			"Folder for yearly notes (e.g., Periodic/Yearly)",
			"yearlyFolder",
			SETTINGS_DEFAULTS.YEARLY_FOLDER
		);
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

		this.addFormatSetting(
			containerEl,
			"Daily format",
			"Format for daily notes (default: 04-12-2025)",
			"dailyFormat",
			SETTINGS_DEFAULTS.DAILY_FORMAT
		);

		this.addFormatSetting(
			containerEl,
			"Weekly format",
			"Format for weekly notes (default: 47-2025)",
			"weeklyFormat",
			SETTINGS_DEFAULTS.WEEKLY_FORMAT
		);

		this.addFormatSetting(
			containerEl,
			"Monthly format",
			"Format for monthly notes (default: 5-2025)",
			"monthlyFormat",
			SETTINGS_DEFAULTS.MONTHLY_FORMAT
		);

		this.addFormatSetting(
			containerEl,
			"Quarterly format",
			"Format for quarterly notes (default: Q1-2025)",
			"quarterlyFormat",
			SETTINGS_DEFAULTS.QUARTERLY_FORMAT
		);

		this.addFormatSetting(
			containerEl,
			"Yearly format",
			"Format for yearly notes (default: 2025)",
			"yearlyFormat",
			SETTINGS_DEFAULTS.YEARLY_FORMAT
		);
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

		new Setting(containerEl)
			.setName("Automatically inherit parent percentages")
			.setDesc(
				"When enabled, opening the allocation editor for a child period with no categories will automatically fill allocations based on the parent period's percentage distribution."
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.settingsStore.currentSettings.timeBudget.autoInheritParentPercentages)
					.onChange(async (value) => {
						await this.settingsStore.updateSettings((s) => ({
							...s,
							timeBudget: {
								...s.timeBudget,
								autoInheritParentPercentages: value,
							},
						}));
					});
			});

		this.addCalculatedValues(containerEl);
	}

	private addFolderSetting(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		key: keyof typeof this.settingsStore.currentSettings.directories,
		placeholder: string
	): void {
		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addText((text) => {
				text
					.setPlaceholder(placeholder)
					.setValue(this.settingsStore.currentSettings.directories[key] as string)
					.onChange(async (value) => {
						await this.settingsStore.updateSettings((s) => ({
							...s,
							directories: {
								...s.directories,
								[key]: value || placeholder,
							},
						}));
					});
			});
	}

	private addFormatSetting(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		key: keyof typeof this.settingsStore.currentSettings.naming,
		placeholder: string
	): void {
		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addText((text) => {
				text
					.setPlaceholder(placeholder)
					.setValue(this.settingsStore.currentSettings.naming[key] as string)
					.onChange(async (value) => {
						await this.settingsStore.updateSettings((s) => ({
							...s,
							naming: {
								...s.naming,
								[key]: value || placeholder,
							},
						}));
					});
			});
	}

	private addCalculatedValues(containerEl: HTMLElement): void {
		const weeklyHours = this.settingsStore.currentSettings.timeBudget.hoursPerWeek;

		const calculated = {
			daily: Math.round(weeklyHours / 7),
			monthly: Math.round((weeklyHours * 52) / 12),
			quarterly: Math.round((weeklyHours * 52) / 4),
			yearly: weeklyHours * 52,
		};

		const infoEl = containerEl.createEl("div", { cls: cls("calculated-hours") });
		infoEl.createEl("strong", { text: "Calculated hours from weekly budget:" });

		const list = infoEl.createEl("ul");
		list.createEl("li", { text: `Daily: ~${calculated.daily} hours` });
		list.createEl("li", { text: `Monthly: ~${calculated.monthly} hours` });
		list.createEl("li", { text: `Quarterly: ~${calculated.quarterly} hours` });
		list.createEl("li", { text: `Yearly: ~${calculated.yearly} hours` });
	}
}
