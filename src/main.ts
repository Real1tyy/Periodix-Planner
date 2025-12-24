import { DateTime } from "luxon";
import { Notice, Plugin, TFile } from "obsidian";
import { ActivityWatchBlockRenderer } from "./components/activity-watch/activity-watch-block";
import { PeriodChildrenBasesModal } from "./components/period-children/bases-modal";
import { TimeBudgetBlockRenderer } from "./components/time-budget";
import type { PeriodType } from "./constants";
import { AutoGenerator, formatAutoGenerationSummary } from "./core/auto-generator";
import { PeriodIndex } from "./core/period-index";
import { PeriodicNoteIndexer } from "./core/periodic-note-indexer";
import { SettingsStore } from "./core/settings-store";
import { TemplateService } from "./services/template";
import { PeriodicPlannerSettingsTab } from "./settings/settings-tab";
import type { PeriodLinks } from "./types";
import { PERIOD_CONFIG } from "./types";
import { createPeriodInfo, getNextPeriod, getPreviousPeriod, parseLinkToDateTime } from "./utils/date-utils";
import {
	assignPeriodPropertiesToFrontmatter,
	getActiveFileCache,
	getLinkFromFrontmatter,
	getPeriodTypeFromFrontmatter,
	openNoteFile,
	resolveNoteFile,
} from "./utils/frontmatter-utils";
import {
	getEnabledAncestorPeriodTypes,
	getEnabledChildPeriodType,
	getEnabledParentPeriodType,
} from "./utils/period-navigation";
import { getHoursForPeriodType } from "./utils/time-budget-utils";

export default class PeriodicPlannerPlugin extends Plugin {
	settingsStore!: SettingsStore;
	autoGenerator!: AutoGenerator;
	indexer!: PeriodicNoteIndexer;
	periodIndex!: PeriodIndex;
	templateService!: TemplateService;

	async onload() {
		this.settingsStore = new SettingsStore(this);
		await this.settingsStore.loadSettings();

		this.indexer = new PeriodicNoteIndexer(this.app, this.settingsStore.settings$);
		this.templateService = new TemplateService(this.app, this.settingsStore.settings$);
		this.autoGenerator = new AutoGenerator(this.app, this.settingsStore.settings$, this.templateService);
		this.periodIndex = new PeriodIndex(this.indexer);

		this.addSettingTab(new PeriodicPlannerSettingsTab(this.app, this));
		this.registerCommands();
		this.registerVaultEvents();

		this.app.workspace.onLayoutReady(() => {
			void this.initializeOnLayoutReady();
		});
	}

	onunload() {
		this.autoGenerator.destroy();
		this.indexer.stop();
		this.periodIndex.destroy();
		this.templateService.destroy();
	}

	private async initializeOnLayoutReady(): Promise<void> {
		await this.indexer.start();
		this.registerCodeBlockProcessor();

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
			}
		} catch (error) {
			console.error("Periodic Planner: Auto-generation failed", error);
		}
	}

	private registerVaultEvents(): void {
		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				if (file instanceof TFile && file.extension === "md") {
					void this.ensurePeriodicNoteComplete(file);
				}
			})
		);

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				const file = this.app.workspace.getActiveFile();
				if (file instanceof TFile && file.extension === "md") {
					void this.refreshActiveNote(file);
				}
			})
		);
	}

	private async refreshActiveNote(file: TFile): Promise<void> {
		await this.indexer.refreshFile(file);
		await this.ensurePeriodicNoteComplete(file);
	}

	private async ensurePeriodicNoteComplete(file: TFile): Promise<void> {
		const entry = this.periodIndex.getEntryForFile(file);
		if (!entry) return;

		await this.ensureFrontmatterProperties(entry.file, entry.periodType, entry.periodStart);
		await this.autoGenerator.getNoteGenerator().ensureTimeBudgetBlock(entry.file, entry.periodType);
	}

	private async ensureFrontmatterProperties(file: TFile, periodType: PeriodType, dateTime: DateTime): Promise<void> {
		const settings = this.settingsStore.currentSettings;
		const props = settings.properties;
		const format = settings.naming[PERIOD_CONFIG[periodType].formatKey];
		const periodInfo = createPeriodInfo(dateTime, periodType, format);
		const links = this.buildPeriodLinks(dateTime, periodType);
		const hoursAvailable = getHoursForPeriodType(settings.timeBudget, periodType);

		await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
			assignPeriodPropertiesToFrontmatter(fm, props, periodType, periodInfo, links, hoursAvailable, true);
		});
	}

	private buildPeriodLinks(dateTime: DateTime, periodType: PeriodType): PeriodLinks {
		const noteGenerator = this.autoGenerator.getNoteGenerator();
		const settings = this.settingsStore.currentSettings;
		const prevDt = getPreviousPeriod(dateTime, periodType);
		const nextDt = getNextPeriod(dateTime, periodType);

		const links: PeriodLinks = {
			previous: noteGenerator.getNoteLink(prevDt, periodType),
			next: noteGenerator.getNoteLink(nextDt, periodType),
		};

		const parentType = getEnabledParentPeriodType(periodType, settings.generation);
		if (parentType) {
			links.parent = noteGenerator.getNoteLink(dateTime, parentType);
		}

		for (const ancestorType of getEnabledAncestorPeriodTypes(periodType, settings.generation)) {
			const { linkKey } = PERIOD_CONFIG[ancestorType];
			if (linkKey) {
				links[linkKey] = noteGenerator.getNoteLink(dateTime, ancestorType);
			}
		}

		return links;
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

		this.registerNavigationCommand("go-to-previous", "Go to previous period", "previousProp");
		this.registerNavigationCommand("go-to-next", "Go to next period", "nextProp");
		this.registerNavigationCommand("go-to-parent", "Go to parent period", "parentProp");
		this.registerNavigateToChildCommand();

		this.registerOpenCurrentCommand("open-daily", "Open today's daily note", "daily");
		this.addCommand({
			id: "open-yesterday",
			name: "Open yesterday's daily note",
			callback: async () => {
				await this.openPeriodForDate(DateTime.now().minus({ days: 1 }), "daily");
			},
		});
		this.registerOpenCurrentCommand("open-weekly", "Open current weekly note", "weekly");
		this.registerOpenCurrentCommand("open-monthly", "Open current monthly note", "monthly");
		this.registerOpenCurrentCommand("open-quarterly", "Open current quarterly note", "quarterly");
		this.registerOpenCurrentCommand("open-yearly", "Open current yearly note", "yearly");

		this.addCommand({
			id: "show-children",
			name: "Show child periods",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				const entry = this.periodIndex.getEntryForFile(file);
				if (!entry || entry.periodType === "daily") return false;
				if (!checking) {
					const settings = this.settingsStore.currentSettings;
					new PeriodChildrenBasesModal(
						this.app,
						entry,
						settings.directories,
						settings.properties,
						settings.generation
					).open();
				}
				return true;
			},
		});
	}

	private registerNavigationCommand(
		id: string,
		name: string,
		propKey: "previousProp" | "nextProp" | "parentProp"
	): void {
		this.addCommand({
			id,
			name,
			checkCallback: (checking) => {
				const context = getActiveFileCache(this.app);
				if (!context) return false;

				const settings = this.settingsStore.currentSettings;
				const props = settings.properties;
				const link = getLinkFromFrontmatter(context.cache, props[propKey]);
				const periodType = getPeriodTypeFromFrontmatter(context.cache, props);
				if (!link || !periodType) return false;

				const targetType =
					propKey === "parentProp" ? getEnabledParentPeriodType(periodType, settings.generation) : periodType;
				if (!targetType) return false;

				if (!checking) void this.navigateOrCreate(link, targetType);
				return true;
			},
		});
	}

	private registerNavigateToChildCommand(): void {
		this.addCommand({
			id: "go-to-child",
			name: "Go to child period",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;

				const entry = this.periodIndex.getEntryForFile(file);
				if (!entry) return false;

				const childType = getEnabledChildPeriodType(entry.periodType, this.settingsStore.currentSettings.generation);
				if (!childType) return false;

				const children = this.periodIndex.getChildrenForFile(file);
				if (!children) return false;

				const childrenKey = PERIOD_CONFIG[childType].childrenKey;
				if (!childrenKey) return false;

				const directChildren = children[childrenKey];
				if (!directChildren || directChildren.length === 0) return false;

				if (!checking) {
					const now = DateTime.now();
					const isCurrentPeriod = now >= entry.periodStart && now <= entry.periodEnd;

					let targetChild: (typeof directChildren)[0];

					if (isCurrentPeriod) {
						targetChild =
							directChildren.find((child) => now >= child.periodStart && now <= child.periodEnd) || directChildren[0];
					} else {
						targetChild = directChildren[0];
					}

					void openNoteFile(this.app, targetChild.file);
				}

				return true;
			},
		});
	}

	private registerOpenCurrentCommand(id: string, name: string, periodType: PeriodType): void {
		this.addCommand({
			id,
			name,
			callback: async () => {
				await this.openCurrentPeriod(periodType);
			},
		});
	}

	private async openCurrentPeriod(periodType: PeriodType): Promise<void> {
		await this.openPeriodForDate(DateTime.now(), periodType);
	}

	private async openPeriodForDate(dateTime: DateTime, periodType: PeriodType): Promise<void> {
		const result = await this.autoGenerator.generateSingleNote(dateTime, periodType);
		if (result.success) {
			const file = this.app.vault.getAbstractFileByPath(result.filePath);
			if (file instanceof TFile) {
				await openNoteFile(this.app, file);
			}
		} else {
			new Notice(`Failed to open note: ${result.error}`);
		}
	}

	private async navigateOrCreate(linkTarget: string, periodType: PeriodType): Promise<void> {
		const existingFile = resolveNoteFile(this.app, linkTarget);
		if (existingFile) {
			await openNoteFile(this.app, existingFile);
			return;
		}

		const format = this.settingsStore.currentSettings.naming[PERIOD_CONFIG[periodType].formatKey];
		const dt = parseLinkToDateTime(linkTarget, format);
		if (!dt) {
			new Notice(`Cannot parse date from: ${linkTarget}`);
			return;
		}

		const result = await this.autoGenerator.generateSingleNote(dt, periodType);
		if (result.success) {
			const file = this.app.vault.getAbstractFileByPath(result.filePath);
			if (file instanceof TFile) {
				await openNoteFile(this.app, file);
			}
		} else {
			new Notice(`Failed to create note: ${result.error}`);
		}
	}

	private registerCodeBlockProcessor(): void {
		this.registerMarkdownCodeBlockProcessor("periodic-planner", (source, el, ctx) => {
			if (el.hasClass("periodic-planner-initialized")) {
				return;
			}

			el.empty();
			el.addClass("periodic-planner-initialized");

			const renderer = new TimeBudgetBlockRenderer(
				el,
				this.app,
				this.settingsStore.currentSettings,
				this.periodIndex,
				source,
				ctx
			);
			ctx.addChild(renderer);
		});

		const activityWatchCodeFence = this.settingsStore.currentSettings.activityWatch.codeFence;
		this.registerMarkdownCodeBlockProcessor(activityWatchCodeFence, (source, el, ctx) => {
			if (el.hasClass("periodic-planner-activity-watch-initialized")) {
				return;
			}

			el.empty();
			el.addClass("periodic-planner-activity-watch-initialized");

			const renderer = new ActivityWatchBlockRenderer(el, this.app, source);
			ctx.addChild(renderer);
		});
	}
}
