import { Setting } from "obsidian";
import { SETTINGS_DEFAULTS } from "../constants";
import type { SettingsStore } from "../core/settings-store";

export class NamingSettings {
	constructor(private settingsStore: SettingsStore) {}

	display(containerEl: HTMLElement): void {
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
}
