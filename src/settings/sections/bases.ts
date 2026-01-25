import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins";
import { Setting } from "obsidian";
import type { PeriodicPlannerSettingsSchema } from "../../types";
import type { SettingsSection } from "../../types/settings";

export class BasesSection implements SettingsSection {
	readonly id = "bases";
	readonly label = "Bases";

	constructor(private uiBuilder: SettingsUIBuilder<typeof PeriodicPlannerSettingsSchema>) {}

	render(containerEl: HTMLElement): void {
		containerEl.empty();

		new Setting(containerEl).setName("Bases View Settings").setHeading();

		containerEl.createEl("p", {
			text: "Configure the Bases view integration for filtering tasks by period intervals.",
			cls: "setting-item-description",
		});

		this.uiBuilder.addText(containerEl, {
			key: "basesView.tasksDirectory",
			name: "Tasks directory",
			desc: "Path to your tasks folder (e.g., 'Tasks'). Leave empty to disable the Bases view command. The view will filter tasks from this directory for the current period.",
			placeholder: "Tasks",
		});

		this.uiBuilder.addText(containerEl, {
			key: "basesView.dateProperty",
			name: "Date property",
			desc: "The frontmatter property name used for task dates (e.g., 'date', 'due', 'scheduled').",
			placeholder: "date",
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "basesView.dateColumnSize",
			name: "Date column size",
			desc: "Width in pixels for the date property column in the Bases table view.",
			min: 50,
			max: 500,
			step: 10,
		});

		this.uiBuilder.addText(containerEl, {
			key: "basesView.propertiesToShow",
			name: "Properties to show",
			desc: "Comma-separated list of frontmatter properties to display in the Bases view (e.g., 'text,tags,date,status').",
			placeholder: "text,tags,date",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "basesView.showRibbonIcon",
			name: "Show ribbon icon",
			desc: "Display a ribbon icon in the left sidebar to quickly open the Period Tasks view.",
		});

		this.uiBuilder.addDropdown(containerEl, {
			key: "basesView.sidebarPosition",
			name: "Sidebar position",
			desc: "Choose which sidebar (left or right) to open the Period Tasks view in.",
			options: {
				left: "Left sidebar",
				right: "Right sidebar",
			},
		});
	}
}
