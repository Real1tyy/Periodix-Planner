import { Setting } from "obsidian";
import { SETTINGS_DEFAULTS } from "../constants";
import type { SettingsStore } from "../core/settings-store";

export class GenerationSettings {
	constructor(private settingsStore: SettingsStore) {}

	display(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Note generation").setHeading();

		containerEl.createEl("p", {
			text: "Configure how periodic notes are automatically generated.",
			cls: "setting-item-description",
		});

		// Auto-generate toggle
		new Setting(containerEl)
			.setName("Auto-generate on load")
			.setDesc("Automatically generate the next period's note when Obsidian loads")
			.addToggle((toggle) => {
				toggle.setValue(this.settingsStore.currentSettings.generation.autoGenerateOnLoad).onChange(async (value) => {
					await this.settingsStore.updateSettings((s) => ({
						...s,
						generation: {
							...s.generation,
							autoGenerateOnLoad: value,
						},
					}));
				});
			});

		// Periods ahead slider
		new Setting(containerEl)
			.setName("Generate periods ahead")
			.setDesc("How many periods into the future to generate (1-5)")
			.addSlider((slider) => {
				slider
					.setLimits(1, 5, 1)
					.setValue(this.settingsStore.currentSettings.generation.generatePeriodsAhead)
					.setDynamicTooltip()
					.onChange(async (value) => {
						await this.settingsStore.updateSettings((s) => ({
							...s,
							generation: {
								...s.generation,
								generatePeriodsAhead: value,
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
							generation: {
								...s.generation,
								generatePeriodsAhead: SETTINGS_DEFAULTS.GENERATE_PERIODS_AHEAD,
							},
						}));
					});
			});
	}
}
