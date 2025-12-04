import { DateTime } from "luxon";
import { Notice, Plugin } from "obsidian";
import { AutoGenerator, formatAutoGenerationSummary } from "./core/auto-generator";
import { SettingsStore } from "./core/settings-store";
import { PeriodicPlannerSettingsTab } from "./settings/settings-tab";

export default class PeriodicPlannerPlugin extends Plugin {
	settingsStore!: SettingsStore;
	autoGenerator!: AutoGenerator;

	async onload() {
		this.settingsStore = new SettingsStore(this);
		await this.settingsStore.loadSettings();

		this.autoGenerator = new AutoGenerator(this.app, this.settingsStore.settings$);

		this.addSettingTab(new PeriodicPlannerSettingsTab(this.app, this));
		this.registerCommands();

		if (this.autoGenerator.shouldAutoGenerate()) {
			this.app.workspace.onLayoutReady(() => {
				void this.runAutoGeneration();
			});
		}
	}

	onunload() {
		this.autoGenerator.destroy();
	}

	private async runAutoGeneration(): Promise<void> {
		try {
			const summary = await this.autoGenerator.runAutoGeneration();
			console.debug(formatAutoGenerationSummary(summary));

			if (summary.created > 0) {
				new Notice(`Periodic Planner: Created ${summary.created} note(s)`);
			}
		} catch (error) {
			console.error("Periodic Planner: Auto-generation failed", error);
		}
	}

	private registerCommands(): void {
		this.addCommand({
			id: "generate-today",
			name: "Generate all periods for today",
			callback: async () => {
				const summary = await this.autoGenerator.generateAllForDate(DateTime.now());
				const created = [...summary.values()].filter((r) => r.success && !r.alreadyExists).length;
				const existing = [...summary.values()].filter((r) => r.alreadyExists).length;

				if (created > 0) {
					new Notice(`Created ${created} note(s), ${existing} already existed`);
				} else {
					new Notice(`All ${existing} notes already exist`);
				}
			},
		});

		this.addCommand({
			id: "generate-periods-ahead",
			name: "Generate future periods",
			callback: async () => {
				const summary = await this.autoGenerator.runAutoGeneration();
				new Notice(`Generated: ${summary.created} created, ${summary.existing} existing, ${summary.failed} failed`);
			},
		});
	}
}
