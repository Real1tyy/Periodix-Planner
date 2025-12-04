import { Setting } from "obsidian";
import { SETTINGS_DEFAULTS } from "../constants";
import type { SettingsStore } from "../core/settings-store";
import { cls } from "../utils/css";

export class TimeBudgetSettings {
	constructor(private settingsStore: SettingsStore) {}

	display(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Time budget").setHeading();

		containerEl.createEl("p", {
			text: "Configure your base time budget. Other periods are calculated from your weekly hours unless overridden.",
			cls: "setting-item-description",
		});

		// Primary setting: Hours per week
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

		// Show calculated values
		this.addCalculatedValues(containerEl);

		// Optional overrides section
		new Setting(containerEl).setName("Optional overrides").setHeading();

		containerEl.createEl("p", {
			text: "Override the calculated values with custom hours. Leave empty to use calculated values.",
			cls: "setting-item-description",
		});

		this.addOptionalOverride(containerEl, "Daily hours override", "hoursPerDayOverride", 24);
		this.addOptionalOverride(containerEl, "Monthly hours override", "hoursPerMonthOverride", 744);
		this.addOptionalOverride(containerEl, "Quarterly hours override", "hoursPerQuarterOverride", 2232);
		this.addOptionalOverride(containerEl, "Yearly hours override", "hoursPerYearOverride", 8760);
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

	private addOptionalOverride(
		containerEl: HTMLElement,
		name: string,
		key: keyof typeof this.settingsStore.currentSettings.timeBudget,
		max: number
	): void {
		const currentValue = this.settingsStore.currentSettings.timeBudget[key];

		new Setting(containerEl)
			.setName(name)
			.setDesc("Leave empty to use calculated value")
			.addText((text) => {
				text
					.setPlaceholder("Auto")
					.setValue(currentValue !== undefined ? String(currentValue) : "")
					.onChange(async (value) => {
						const parsed = parseInt(value, 10);
						const newValue = !Number.isNaN(parsed) && parsed > 0 && parsed <= max ? parsed : undefined;

						await this.settingsStore.updateSettings((s) => ({
							...s,
							timeBudget: {
								...s.timeBudget,
								[key]: newValue,
							},
						}));
					});
			});
	}
}
