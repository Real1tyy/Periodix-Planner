import { DateTime } from "luxon";
import { Notice, Plugin, TFile } from "obsidian";
import { PeriodChildrenModal } from "./components/period-children-modal";
import type { PeriodType } from "./constants";
import { AutoGenerator, formatAutoGenerationSummary } from "./core/auto-generator";
import { PeriodIndex } from "./core/period-index";
import { SettingsStore } from "./core/settings-store";
import { PeriodicPlannerSettingsTab } from "./settings/settings-tab";
import { PERIOD_CONFIG } from "./types";
import {
	getActiveFileCache,
	getLinkFromFrontmatter,
	getParentLinkFromFrontmatter,
	getPeriodTypeFromFrontmatter,
	openNoteFile,
	resolveNoteFile,
} from "./utils/frontmatter-utils";

export default class PeriodicPlannerPlugin extends Plugin {
	settingsStore!: SettingsStore;
	autoGenerator!: AutoGenerator;
	periodIndex!: PeriodIndex;

	async onload() {
		this.settingsStore = new SettingsStore(this);
		await this.settingsStore.loadSettings();

		this.autoGenerator = new AutoGenerator(this.app, this.settingsStore.settings$);
		this.periodIndex = new PeriodIndex(this.app, this.settingsStore.settings$);

		this.addSettingTab(new PeriodicPlannerSettingsTab(this.app, this));
		this.registerCommands();
		this.registerVaultEvents();

		this.app.workspace.onLayoutReady(() => {
			void this.initializeOnLayoutReady();
		});
	}

	onunload() {
		this.autoGenerator.destroy();
		this.periodIndex.destroy();
	}

	private async initializeOnLayoutReady(): Promise<void> {
		await this.periodIndex.buildIndex();

		if (this.autoGenerator.shouldAutoGenerate()) {
			await this.runAutoGeneration();
		}
	}

	private async runAutoGeneration(): Promise<void> {
		try {
			const summary = await this.autoGenerator.runAutoGeneration();
			console.debug(formatAutoGenerationSummary(summary));

			if (summary.created > 0) {
				new Notice(`Periodic Planner: Created ${summary.created} note(s)`);
				await this.periodIndex.buildIndex();
			}
		} catch (error) {
			console.error("Periodic Planner: Auto-generation failed", error);
		}
	}

	private registerVaultEvents(): void {
		this.registerEvent(
			this.app.vault.on("create", (file) => {
				if (file instanceof TFile && file.extension === "md") {
					void this.periodIndex.indexFile(file);
				}
			})
		);

		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (file instanceof TFile && file.extension === "md") {
					void this.periodIndex.indexFile(file);
				}
			})
		);

		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (file instanceof TFile) {
					this.periodIndex.removeFile(file);
				}
			})
		);

		this.registerEvent(
			this.app.vault.on("rename", (file, _oldPath) => {
				if (file instanceof TFile && file.extension === "md") {
					void this.periodIndex.indexFile(file);
				}
			})
		);
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
					await this.periodIndex.buildIndex();
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
				if (summary.created > 0) {
					await this.periodIndex.buildIndex();
				}
			},
		});

		this.addCommand({
			id: "go-to-previous",
			name: "Go to previous period",
			checkCallback: (checking) => {
				const context = getActiveFileCache(this.app);
				if (!context) return false;
				const props = this.settingsStore.currentSettings.properties;
				const link = getLinkFromFrontmatter(context.cache, props.previousProp);
				const periodType = getPeriodTypeFromFrontmatter(context.cache, props);
				if (!link || !periodType) return false;
				if (!checking) void this.navigateOrCreate(link, periodType);
				return true;
			},
		});

		this.addCommand({
			id: "go-to-next",
			name: "Go to next period",
			checkCallback: (checking) => {
				const context = getActiveFileCache(this.app);
				if (!context) return false;
				const props = this.settingsStore.currentSettings.properties;
				const link = getLinkFromFrontmatter(context.cache, props.nextProp);
				const periodType = getPeriodTypeFromFrontmatter(context.cache, props);
				if (!link || !periodType) return false;
				if (!checking) void this.navigateOrCreate(link, periodType);
				return true;
			},
		});

		this.addCommand({
			id: "go-to-parent",
			name: "Go to parent period",
			checkCallback: (checking) => {
				const context = getActiveFileCache(this.app);
				if (!context) return false;
				const props = this.settingsStore.currentSettings.properties;
				const link = getParentLinkFromFrontmatter(context.cache, props);
				const periodType = getPeriodTypeFromFrontmatter(context.cache, props);
				if (!link || !periodType) return false;
				const parentType = PERIOD_CONFIG[periodType].parent;
				if (!parentType) return false;
				if (!checking) void this.navigateOrCreate(link, parentType);
				return true;
			},
		});

		this.addCommand({
			id: "show-children",
			name: "Show child periods",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				const entry = this.periodIndex.getEntryForFile(file);
				if (!entry || entry.periodType === "daily") return false;
				if (!checking) {
					const children = this.periodIndex.getChildren(entry);
					new PeriodChildrenModal(this.app, entry, children, (selected) => {
						void this.app.workspace.getLeaf().openFile(selected.file);
					}).open();
				}
				return true;
			},
		});
	}

	private async navigateOrCreate(linkTarget: string, periodType: PeriodType): Promise<void> {
		const existingFile = resolveNoteFile(this.app, linkTarget);
		if (existingFile) {
			await openNoteFile(this.app, existingFile);
			return;
		}

		const dt = this.parseLinkToDateTime(linkTarget, periodType);
		if (!dt) {
			new Notice(`Cannot parse date from: ${linkTarget}`);
			return;
		}

		const result = await this.autoGenerator.generateSingleNote(dt, periodType);
		if (result.success) {
			const file = this.app.vault.getAbstractFileByPath(result.filePath);
			if (file instanceof TFile) {
				await openNoteFile(this.app, file);
				await this.periodIndex.indexFile(file);
			}
		} else {
			new Notice(`Failed to create note: ${result.error}`);
		}
	}

	private parseLinkToDateTime(linkTarget: string, periodType: PeriodType): DateTime | null {
		const format = this.settingsStore.currentSettings.naming[PERIOD_CONFIG[periodType].formatKey];
		const parsed = DateTime.fromFormat(linkTarget, format);
		return parsed.isValid ? parsed : null;
	}
}
