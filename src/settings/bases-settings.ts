import { Setting } from "obsidian";
import { SETTINGS_DEFAULTS } from "src/constants";
import type { SettingsStore } from "../core/settings-store";
import { cls } from "../utils/css";

export class BasesSettings {
	constructor(private settingsStore: SettingsStore) {}

	display(containerEl: HTMLElement): void {
		containerEl.empty();

		containerEl.createEl("h2", { text: "Bases View Settings" });
		containerEl.createEl("p", {
			text: "Configure the Bases view integration for filtering tasks by period intervals.",
			cls: "setting-item-description",
		});

		this.renderTasksDirectorySetting(containerEl);
		this.renderDatePropertySetting(containerEl);
		this.renderPropertiesToShowSetting(containerEl);
		this.renderShowRibbonIconSetting(containerEl);
	}

	private renderTasksDirectorySetting(containerEl: HTMLElement): void {
		const settingEl = new Setting(containerEl)
			.setName("Tasks directory")
			.setDesc(
				"Path to your tasks folder (e.g., 'Tasks'). Leave empty to disable the Bases view command. The view will filter tasks from this directory for the current period."
			);

		settingEl.addText((text) =>
			text
				.setPlaceholder("Tasks")
				.setValue(this.settingsStore.currentSettings.basesView.tasksDirectory)
				.onChange(async (value) => {
					await this.settingsStore.updateSettings((settings) => ({
						...settings,
						basesView: {
							...settings.basesView,
							tasksDirectory: value,
						},
					}));
				})
		);

		settingEl.settingEl.addClass(cls("setting"));
	}

	private renderDatePropertySetting(containerEl: HTMLElement): void {
		const settingEl = new Setting(containerEl)
			.setName("Date property")
			.setDesc("The frontmatter property name used for task dates (e.g., 'date', 'due', 'scheduled').");

		settingEl.addText((text) =>
			text
				.setPlaceholder("date")
				.setValue(this.settingsStore.currentSettings.basesView.dateProperty)
				.onChange(async (value) => {
					await this.settingsStore.updateSettings((settings) => ({
						...settings,
						basesView: {
							...settings.basesView,
							dateProperty: value || SETTINGS_DEFAULTS.BASES_DATE_PROPERTY,
						},
					}));
				})
		);

		settingEl.settingEl.addClass(cls("setting"));
	}

	private renderPropertiesToShowSetting(containerEl: HTMLElement): void {
		const settingEl = new Setting(containerEl)
			.setName("Properties to show")
			.setDesc(
				"Comma-separated list of frontmatter properties to display in the Bases view (e.g., 'text,tags,date,status')."
			);

		settingEl.addText((text) =>
			text
				.setPlaceholder("text,tags,date")
				.setValue(this.settingsStore.currentSettings.basesView.propertiesToShow)
				.onChange(async (value) => {
					await this.settingsStore.updateSettings((settings) => ({
						...settings,
						basesView: {
							...settings.basesView,
							propertiesToShow: value || SETTINGS_DEFAULTS.BASES_PROPERTIES_TO_SHOW,
						},
					}));
				})
		);

		settingEl.settingEl.addClass(cls("setting"));
	}

	private renderShowRibbonIconSetting(containerEl: HTMLElement): void {
		const settingEl = new Setting(containerEl)
			.setName("Show ribbon icon")
			.setDesc("Display a ribbon icon in the left sidebar to quickly open the Period Tasks view.");

		settingEl.addToggle((toggle) =>
			toggle.setValue(this.settingsStore.currentSettings.basesView.showRibbonIcon).onChange(async (value) => {
				await this.settingsStore.updateSettings((settings) => ({
					...settings,
					basesView: {
						...settings.basesView,
						showRibbonIcon: value,
					},
				}));
			})
		);

		settingEl.settingEl.addClass(cls("setting"));
	}
}
