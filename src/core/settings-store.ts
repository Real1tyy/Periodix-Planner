import { SettingsStore as GenericSettingsStore } from "@real1ty-obsidian-plugins";
import type { Plugin } from "obsidian";
import { PeriodicPlannerSettingsSchema } from "../types";

/**
 * Settings store for Periodic Planner plugin.
 * Extends the generic SettingsStore with our specific schema.
 */
export class SettingsStore extends GenericSettingsStore<typeof PeriodicPlannerSettingsSchema> {
	constructor(plugin: Plugin) {
		super(plugin, PeriodicPlannerSettingsSchema);
	}
}
