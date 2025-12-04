import { Plugin } from "obsidian";
import { SettingsStore } from "./core/settings-store";
import { PeriodicPlannerSettingsTab } from "./settings/settings-tab";

export default class PeriodicPlannerPlugin extends Plugin {
	settingsStore!: SettingsStore;

	async onload() {
		console.debug("Loading Periodic Planner plugin");
		this.settingsStore = new SettingsStore(this);
		await this.settingsStore.loadSettings();
		this.addSettingTab(new PeriodicPlannerSettingsTab(this.app, this));
		this.registerCommands();
		console.debug("Periodic Planner plugin loaded successfully");
	}

	onunload() {
		console.debug("Unloading Periodic Planner plugin");
	}

	private registerCommands(): void {}
}
