import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins";
import { Setting } from "obsidian";
import { SETTINGS_DEFAULTS } from "../../constants";
import type { PeriodicPlannerSettingsSchema } from "../../types";
import type { SettingsSection } from "../../types/settings";

export class PropertiesSection implements SettingsSection {
	readonly id = "properties";
	readonly label = "Properties";

	constructor(private uiBuilder: SettingsUIBuilder<typeof PeriodicPlannerSettingsSchema>) {}

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

		this.uiBuilder.addText(containerEl, {
			key: "properties.previousProp",
			name: "Previous link property",
			desc: "Property name for link to previous period",
			placeholder: SETTINGS_DEFAULTS.PREVIOUS_PROP,
		});

		this.uiBuilder.addText(containerEl, {
			key: "properties.nextProp",
			name: "Next link property",
			desc: "Property name for link to next period",
			placeholder: SETTINGS_DEFAULTS.NEXT_PROP,
		});

		this.uiBuilder.addText(containerEl, {
			key: "properties.parentProp",
			name: "Parent link property",
			desc: "Property name for link to parent period (daily → week, weekly → month, etc.)",
			placeholder: SETTINGS_DEFAULTS.PARENT_PROP,
		});

		new Setting(containerEl)
			.setName("Hierarchical links")
			.setHeading()
			.setDesc("Properties for linking to parent periods");

		this.uiBuilder.addText(containerEl, {
			key: "properties.weekProp",
			name: "Week link property",
			desc: "Property name for link to parent week (used in daily notes)",
			placeholder: SETTINGS_DEFAULTS.WEEK_PROP,
		});

		this.uiBuilder.addText(containerEl, {
			key: "properties.monthProp",
			name: "Month link property",
			desc: "Property name for link to parent month",
			placeholder: SETTINGS_DEFAULTS.MONTH_PROP,
		});

		this.uiBuilder.addText(containerEl, {
			key: "properties.quarterProp",
			name: "Quarter link property",
			desc: "Property name for link to parent quarter",
			placeholder: SETTINGS_DEFAULTS.QUARTER_PROP,
		});

		this.uiBuilder.addText(containerEl, {
			key: "properties.yearProp",
			name: "Year link property",
			desc: "Property name for link to parent year",
			placeholder: SETTINGS_DEFAULTS.YEAR_PROP,
		});

		new Setting(containerEl)
			.setName("Time budget data")
			.setHeading()
			.setDesc("Properties for time allocation tracking");

		this.uiBuilder.addText(containerEl, {
			key: "properties.hoursAvailableProp",
			name: "Hours available property",
			desc: "Property name for total available hours in period",
			placeholder: SETTINGS_DEFAULTS.HOURS_AVAILABLE_PROP,
		});

		this.uiBuilder.addText(containerEl, {
			key: "properties.hoursSpentProp",
			name: "Hours spent property",
			desc: "Property name for actual hours spent",
			placeholder: SETTINGS_DEFAULTS.HOURS_SPENT_PROP,
		});

		new Setting(containerEl).setName("Period metadata").setHeading().setDesc("Properties for period identification");

		this.uiBuilder.addText(containerEl, {
			key: "properties.periodTypeProp",
			name: "Period type property",
			desc: "Property name for period type (daily, weekly, etc.)",
			placeholder: SETTINGS_DEFAULTS.PERIOD_TYPE_PROP,
		});

		this.uiBuilder.addText(containerEl, {
			key: "properties.periodStartProp",
			name: "Period start property",
			desc: "Property name for period start date",
			placeholder: SETTINGS_DEFAULTS.PERIOD_START_PROP,
		});

		this.uiBuilder.addText(containerEl, {
			key: "properties.periodEndProp",
			name: "Period end property",
			desc: "Property name for period end date",
			placeholder: SETTINGS_DEFAULTS.PERIOD_END_PROP,
		});
	}
}
