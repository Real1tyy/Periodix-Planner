import { Setting } from "obsidian";
import { SETTINGS_DEFAULTS } from "../constants";
import type { SettingsStore } from "../core/settings-store";
import { cls } from "../utils/css";

export class TimeBudgetSettings {
	constructor(private settingsStore: SettingsStore) {}

	display(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Time budget").setHeading();

		containerEl.createEl("p", {
			text: "Configure your base time budget. All other periods are automatically calculated from your weekly hours.",
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

		// Show calculated values
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

		const infoEl = containerEl.createEl("div", { cls: cls("calculated-hours") });
		infoEl.createEl("strong", { text: "Calculated hours from weekly budget:" });

		const list = infoEl.createEl("ul");
		list.createEl("li", { text: `Daily: ~${calculated.daily} hours` });
		list.createEl("li", { text: `Monthly: ~${calculated.monthly} hours` });
		list.createEl("li", { text: `Quarterly: ~${calculated.quarterly} hours` });
		list.createEl("li", { text: `Yearly: ~${calculated.yearly} hours` });
	}
}
