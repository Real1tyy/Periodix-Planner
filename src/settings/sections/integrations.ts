import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins";
import type { App } from "obsidian";
import { Notice, Setting } from "obsidian";
import { SETTINGS_DEFAULTS } from "../../constants";
import type { SettingsStore } from "../../core/settings-store";
import type { PeriodicPlannerSettingsSchema } from "../../types";
import type { SettingsSection } from "../../types/settings";
import { processAllDailyNotesForActivityWatch } from "../../utils/activity-watch";

export class IntegrationsSection implements SettingsSection {
	readonly id = "integrations";
	readonly label = "Integrations";

	constructor(
		private uiBuilder: SettingsUIBuilder<typeof PeriodicPlannerSettingsSchema>,
		private settingsStore: SettingsStore,
		private app: App
	) {}

	render(containerEl: HTMLElement): void {
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

		this.uiBuilder.addToggle(containerEl, {
			key: "activityWatch.enabled",
			name: "Enable ActivityWatch",
			desc: "Enable ActivityWatch integration for daily notes",
		});

		this.uiBuilder.addText(containerEl, {
			key: "activityWatch.apiUrl",
			name: "ActivityWatch API URL",
			desc: "The URL of your ActivityWatch server (default: http://localhost:5600)",
			placeholder: SETTINGS_DEFAULTS.ACTIVITY_WATCH_URL,
		});

		this.uiBuilder.addText(containerEl, {
			key: "activityWatch.heading",
			name: "ActivityWatch heading",
			desc: "The heading to use for ActivityWatch sections in daily notes",
			placeholder: SETTINGS_DEFAULTS.ACTIVITY_WATCH_HEADING,
		});

		this.uiBuilder.addText(containerEl, {
			key: "activityWatch.codeFence",
			name: "Code fence name",
			desc: "The code fence language identifier for ActivityWatch blocks (requires plugin reload to take effect)",
			placeholder: SETTINGS_DEFAULTS.ACTIVITY_WATCH_CODE_FENCE,
		});

		new Setting(containerEl).setName("Templater").setHeading();

		containerEl.createEl("p", {
			text: "Use Templater to create periodic notes from templates. Configure folder templates in Templater's settings to automatically apply templates when creating notes in specific directories.",
			cls: "setting-item-description",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "templater.enabled",
			name: "Enable Templater",
			desc: "Use Templater templates when creating periodic notes",
		});

		this.uiBuilder.addText(containerEl, {
			key: "templater.dailyTemplate",
			name: "Daily note template",
			desc: "Path to the template file for daily notes (e.g., Templates/Daily.md)",
			placeholder: "Templates/Daily.md",
		});

		this.uiBuilder.addText(containerEl, {
			key: "templater.weeklyTemplate",
			name: "Weekly note template",
			desc: "Path to the template file for weekly notes (e.g., Templates/Weekly.md)",
			placeholder: "Templates/Weekly.md",
		});

		this.uiBuilder.addText(containerEl, {
			key: "templater.monthlyTemplate",
			name: "Monthly note template",
			desc: "Path to the template file for monthly notes (e.g., Templates/Monthly.md)",
			placeholder: "Templates/Monthly.md",
		});

		this.uiBuilder.addText(containerEl, {
			key: "templater.quarterlyTemplate",
			name: "Quarterly note template",
			desc: "Path to the template file for quarterly notes (e.g., Templates/Quarterly.md)",
			placeholder: "Templates/Quarterly.md",
		});

		this.uiBuilder.addText(containerEl, {
			key: "templater.yearlyTemplate",
			name: "Yearly note template",
			desc: "Path to the template file for yearly notes (e.g., Templates/Yearly.md)",
			placeholder: "Templates/Yearly.md",
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
