import { type App, PluginSettingTab } from "obsidian";
import type PeriodicPlannerPlugin from "../main";
import { cls, toggleCls } from "../utils/css";
import { CategorySettings } from "./category-settings";
import { DirectorySettings } from "./directory-settings";
import { GenerationSettings } from "./generation-settings";
import { NamingSettings } from "./naming-settings";
import { PropertySettings } from "./property-settings";
import { TimeBudgetSettings } from "./time-budget-settings";

type TabId = "directories" | "naming" | "time" | "properties" | "categories" | "generation";

export class PeriodicPlannerSettingsTab extends PluginSettingTab {
	private activeTab: TabId = "directories";
	private contentEl: HTMLElement | null = null;

	private directorySettings: DirectorySettings;
	private namingSettings: NamingSettings;
	private timeBudgetSettings: TimeBudgetSettings;
	private propertySettings: PropertySettings;
	private categorySettings: CategorySettings;
	private generationSettings: GenerationSettings;

	constructor(app: App, plugin: PeriodicPlannerPlugin) {
		super(app, plugin);

		// Initialize all settings sections
		this.directorySettings = new DirectorySettings(plugin.settingsStore);
		this.namingSettings = new NamingSettings(plugin.settingsStore);
		this.timeBudgetSettings = new TimeBudgetSettings(plugin.settingsStore);
		this.propertySettings = new PropertySettings(plugin.settingsStore);
		this.categorySettings = new CategorySettings(plugin.settingsStore);
		this.generationSettings = new GenerationSettings(plugin.settingsStore);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("p", {
			text: "Configure your periodic note generation, time budgeting, and hierarchical planning system.",
			cls: "setting-item-description",
		});

		// Tab navigation
		this.createTabNavigation(containerEl);

		// Content area
		this.contentEl = containerEl.createDiv({ cls: cls("settings-content") });
		this.renderActiveTab();
	}

	private createTabNavigation(containerEl: HTMLElement): void {
		const tabsContainer = containerEl.createDiv({ cls: cls("settings-tabs") });

		const tabs: { id: TabId; label: string; icon: string }[] = [
			{ id: "directories", label: "Folders", icon: "folder" },
			{ id: "naming", label: "Naming", icon: "file-text" },
			{ id: "time", label: "Time budget", icon: "clock" },
			{ id: "categories", label: "Categories", icon: "tag" },
			{ id: "properties", label: "Properties", icon: "list" },
			{ id: "generation", label: "Generation", icon: "play" },
		];

		for (const tab of tabs) {
			const tabEl = tabsContainer.createEl("button", {
				text: tab.label,
				cls: cls("tab") + (this.activeTab === tab.id ? ` ${cls("active")}` : ""),
			});

			tabEl.addEventListener("click", () => {
				this.activeTab = tab.id;
				this.updateTabStyles(tabsContainer);
				this.renderActiveTab();
			});
		}
	}

	private updateTabStyles(tabsContainer: HTMLElement): void {
		const tabs = tabsContainer.querySelectorAll(`.${cls("tab")}`);
		const tabIds: TabId[] = ["directories", "naming", "time", "categories", "properties", "generation"];

		tabs.forEach((tab, index) => {
			toggleCls(tab as HTMLElement, "active", tabIds[index] === this.activeTab);
		});
	}

	private renderActiveTab(): void {
		if (!this.contentEl) return;
		this.contentEl.empty();

		switch (this.activeTab) {
			case "directories":
				this.directorySettings.display(this.contentEl);
				break;
			case "naming":
				this.namingSettings.display(this.contentEl);
				break;
			case "time":
				this.timeBudgetSettings.display(this.contentEl);
				break;
			case "categories":
				this.categorySettings.display(this.contentEl);
				break;
			case "properties":
				this.propertySettings.display(this.contentEl);
				break;
			case "generation":
				this.generationSettings.display(this.contentEl);
				break;
		}
	}
}
