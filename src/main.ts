import { Plugin } from "obsidian";

export default class PeriodicPlannerPlugin extends Plugin {
	async onload() {
		console.log("Loading Periodic Planner plugin");
	}

	async onunload() {
		console.log("Unloading Periodic Planner plugin");
	}
}
