import { Setting } from "obsidian";
import { SETTINGS_DEFAULTS } from "../../constants";
import type { SettingsStore } from "../../core/settings-store";
import type { SettingsSection } from "../../types/settings";

export class PropertiesSection implements SettingsSection {
	readonly id = "properties";
	readonly label = "Properties";

	constructor(private settingsStore: SettingsStore) {}

	render(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Frontmatter properties").setHeading();

		containerEl.createEl("p", {
			text: "Configure the frontmatter property names used to store navigation links, time data, and metadata in your periodic notes.",
			cls: "setting-item-description",
		});

		new Setting(containerEl)
			.setName("Navigation links")
			.setHeading()
			.setDesc("Properties for chronological navigation");

		this.addPropertySetting(
			containerEl,
			"Previous link property",
			"Property name for link to previous period",
			"previousProp",
			SETTINGS_DEFAULTS.PREVIOUS_PROP
		);

		this.addPropertySetting(
			containerEl,
			"Next link property",
			"Property name for link to next period",
			"nextProp",
			SETTINGS_DEFAULTS.NEXT_PROP
		);

		this.addPropertySetting(
			containerEl,
			"Parent link property",
			"Property name for link to parent period (daily → week, weekly → month, etc.)",
			"parentProp",
			SETTINGS_DEFAULTS.PARENT_PROP
		);

		new Setting(containerEl)
			.setName("Hierarchical links")
			.setHeading()
			.setDesc("Properties for linking to parent periods");

		this.addPropertySetting(
			containerEl,
			"Week link property",
			"Property name for link to parent week (used in daily notes)",
			"weekProp",
			SETTINGS_DEFAULTS.WEEK_PROP
		);

		this.addPropertySetting(
			containerEl,
			"Month link property",
			"Property name for link to parent month",
			"monthProp",
			SETTINGS_DEFAULTS.MONTH_PROP
		);

		this.addPropertySetting(
			containerEl,
			"Quarter link property",
			"Property name for link to parent quarter",
			"quarterProp",
			SETTINGS_DEFAULTS.QUARTER_PROP
		);

		this.addPropertySetting(
			containerEl,
			"Year link property",
			"Property name for link to parent year",
			"yearProp",
			SETTINGS_DEFAULTS.YEAR_PROP
		);

		new Setting(containerEl)
			.setName("Time budget data")
			.setHeading()
			.setDesc("Properties for time allocation tracking");

		this.addPropertySetting(
			containerEl,
			"Hours available property",
			"Property name for total available hours in period",
			"hoursAvailableProp",
			SETTINGS_DEFAULTS.HOURS_AVAILABLE_PROP
		);

		this.addPropertySetting(
			containerEl,
			"Hours spent property",
			"Property name for actual hours spent",
			"hoursSpentProp",
			SETTINGS_DEFAULTS.HOURS_SPENT_PROP
		);

		new Setting(containerEl).setName("Period metadata").setHeading().setDesc("Properties for period identification");

		this.addPropertySetting(
			containerEl,
			"Period type property",
			"Property name for period type (daily, weekly, etc.)",
			"periodTypeProp",
			SETTINGS_DEFAULTS.PERIOD_TYPE_PROP
		);

		this.addPropertySetting(
			containerEl,
			"Period start property",
			"Property name for period start date",
			"periodStartProp",
			SETTINGS_DEFAULTS.PERIOD_START_PROP
		);

		this.addPropertySetting(
			containerEl,
			"Period end property",
			"Property name for period end date",
			"periodEndProp",
			SETTINGS_DEFAULTS.PERIOD_END_PROP
		);
	}

	private addPropertySetting(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		key: keyof typeof this.settingsStore.currentSettings.properties,
		defaultValue: string
	): void {
		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addText((text) => {
				text
					.setPlaceholder(defaultValue)
					.setValue(this.settingsStore.currentSettings.properties[key] as string)
					.onChange(async (value) => {
						await this.settingsStore.updateSettings((s) => ({
							...s,
							properties: {
								...s.properties,
								[key]: value || defaultValue,
							},
						}));
					});
			});
	}
}
