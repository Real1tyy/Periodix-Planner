import type { App } from "obsidian";
import { Notice, Setting } from "obsidian";
import { SETTINGS_DEFAULTS } from "../constants";
import type { SettingsStore } from "../core/settings-store";
import { processAllDailyNotesForActivityWatch } from "../utils/activity-watch";

export class IntegrationSettings {
	constructor(
		private settingsStore: SettingsStore,
		private app: App
	) {}

	display(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Integrations").setHeading();

		containerEl.createEl("p", {
			text: "Configure third-party integrations to enhance your periodic planning workflow.",
			cls: "setting-item-description",
		});

		new Setting(containerEl).setName("ActivityWatch").setHeading();

		containerEl.createEl("p", {
			text: "Connect to ActivityWatch to automatically track and visualize your computer usage in daily notes. ActivityWatch data is only added to past daily notes.",
			cls: "setting-item-description",
		});

		new Setting(containerEl)
			.setName("Enable ActivityWatch")
			.setDesc("Enable ActivityWatch integration for daily notes")
			.addToggle((toggle) => {
				toggle.setValue(this.settingsStore.currentSettings.activityWatch.enabled).onChange(async (value) => {
					await this.settingsStore.updateSettings((s) => ({
						...s,
						activityWatch: {
							...s.activityWatch,
							enabled: value,
						},
					}));
				});
			});

		new Setting(containerEl)
			.setName("ActivityWatch API URL")
			.setDesc("The URL of your ActivityWatch server (default: http://localhost:5600)")
			.addText((text) => {
				text
					.setPlaceholder(SETTINGS_DEFAULTS.ACTIVITY_WATCH_URL)
					.setValue(this.settingsStore.currentSettings.activityWatch.apiUrl)
					.onChange(async (value) => {
						await this.settingsStore.updateSettings((s) => ({
							...s,
							activityWatch: {
								...s.activityWatch,
								apiUrl: value || SETTINGS_DEFAULTS.ACTIVITY_WATCH_URL,
							},
						}));
					});
			});

		new Setting(containerEl)
			.setName("ActivityWatch heading")
			.setDesc("The heading to use for ActivityWatch sections in daily notes")
			.addText((text) => {
				text
					.setPlaceholder(SETTINGS_DEFAULTS.ACTIVITY_WATCH_HEADING)
					.setValue(this.settingsStore.currentSettings.activityWatch.heading)
					.onChange(async (value) => {
						await this.settingsStore.updateSettings((s) => ({
							...s,
							activityWatch: {
								...s.activityWatch,
								heading: value || SETTINGS_DEFAULTS.ACTIVITY_WATCH_HEADING,
							},
						}));
					});
			});

		new Setting(containerEl).setName("Templater").setHeading();

		containerEl.createEl("p", {
			text: "Use Templater to create periodic notes from templates. Configure folder templates in Templater's settings to automatically apply templates when creating notes in specific directories.",
			cls: "setting-item-description",
		});

		new Setting(containerEl)
			.setName("Enable Templater")
			.setDesc("Use Templater templates when creating periodic notes")
			.addToggle((toggle) => {
				toggle.setValue(this.settingsStore.currentSettings.templater.enabled).onChange(async (value) => {
					await this.settingsStore.updateSettings((s) => ({
						...s,
						templater: {
							...s.templater,
							enabled: value,
						},
					}));
				});
			});

		new Setting(containerEl)
			.setName("Daily note template")
			.setDesc("Path to the template file for daily notes (e.g., Templates/Daily.md)")
			.addText((text) => {
				text
					.setPlaceholder("Templates/Daily.md")
					.setValue(this.settingsStore.currentSettings.templater.dailyTemplate)
					.onChange(async (value) => {
						await this.settingsStore.updateSettings((s) => ({
							...s,
							templater: {
								...s.templater,
								dailyTemplate: value,
							},
						}));
					});
			});

		new Setting(containerEl)
			.setName("Weekly note template")
			.setDesc("Path to the template file for weekly notes (e.g., Templates/Weekly.md)")
			.addText((text) => {
				text
					.setPlaceholder("Templates/Weekly.md")
					.setValue(this.settingsStore.currentSettings.templater.weeklyTemplate)
					.onChange(async (value) => {
						await this.settingsStore.updateSettings((s) => ({
							...s,
							templater: {
								...s.templater,
								weeklyTemplate: value,
							},
						}));
					});
			});

		new Setting(containerEl)
			.setName("Monthly note template")
			.setDesc("Path to the template file for monthly notes (e.g., Templates/Monthly.md)")
			.addText((text) => {
				text
					.setPlaceholder("Templates/Monthly.md")
					.setValue(this.settingsStore.currentSettings.templater.monthlyTemplate)
					.onChange(async (value) => {
						await this.settingsStore.updateSettings((s) => ({
							...s,
							templater: {
								...s.templater,
								monthlyTemplate: value,
							},
						}));
					});
			});

		new Setting(containerEl)
			.setName("Quarterly note template")
			.setDesc("Path to the template file for quarterly notes (e.g., Templates/Quarterly.md)")
			.addText((text) => {
				text
					.setPlaceholder("Templates/Quarterly.md")
					.setValue(this.settingsStore.currentSettings.templater.quarterlyTemplate)
					.onChange(async (value) => {
						await this.settingsStore.updateSettings((s) => ({
							...s,
							templater: {
								...s.templater,
								quarterlyTemplate: value,
							},
						}));
					});
			});

		new Setting(containerEl)
			.setName("Yearly note template")
			.setDesc("Path to the template file for yearly notes (e.g., Templates/Yearly.md)")
			.addText((text) => {
				text
					.setPlaceholder("Templates/Yearly.md")
					.setValue(this.settingsStore.currentSettings.templater.yearlyTemplate)
					.onChange(async (value) => {
						await this.settingsStore.updateSettings((s) => ({
							...s,
							templater: {
								...s.templater,
								yearlyTemplate: value,
							},
						}));
					});
			});

		new Setting(containerEl).setName("Actions").setHeading();

		new Setting(containerEl)
			.setName("Process all daily notes")
			.setDesc(
				"Scan all past daily notes and add ActivityWatch data to notes that don't have it yet. This will not affect today's note or future notes."
			)
			.addButton((button) => {
				button.setButtonText("Process now").onClick(async () => {
					const settings = this.settingsStore.currentSettings;

					if (!settings.activityWatch.enabled) {
						new Notice("ActivityWatch integration is disabled. Enable it first.");
						return;
					}

					button.setDisabled(true);
					button.setButtonText("Processing...");

					try {
						await processAllDailyNotesForActivityWatch(this.app, settings);
						new Notice("ActivityWatch data processing complete!");
					} catch (error) {
						console.error("Error processing daily notes:", error);
						new Notice(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
					} finally {
						button.setDisabled(false);
						button.setButtonText("Process now");
					}
				});
			});
	}
}
