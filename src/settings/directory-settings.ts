import { Setting } from "obsidian";
import { SETTINGS_DEFAULTS } from "../constants";
import type { SettingsStore } from "../core/settings-store";

export class DirectorySettings {
	constructor(private settingsStore: SettingsStore) {}

	display(containerEl: HTMLElement): void {
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
					.setValue(this.settingsStore.currentSettings.directories[key])
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
}
