import { SyncStore, WhatsNewModal, type WhatsNewModalConfig } from "@real1ty-obsidian-plugins";
import { DateTime } from "luxon";
import { Notice, Plugin, TFile } from "obsidian";
import CHANGELOG_CONTENT from "../docs-site/docs/changelog.md";
import { ActivityWatchBlockRenderer } from "./components/activity-watch/activity-watch-block";
import { PeriodBasesItemView, VIEW_TYPE_PERIOD_BASES } from "./components/period-bases/period-bases-item-view";
import { PeriodChildrenBasesModal } from "./components/period-children/bases-modal";
import { TimeBudgetBlockRenderer } from "./components/time-budget";
import { type PeriodType, SETTINGS_DEFAULTS } from "./constants";
import { AutoGenerator, formatAutoGenerationSummary } from "./core/auto-generator";
import { CategoryTracker } from "./core/category-tracker";
import { GlobalStatisticsAggregator } from "./core/global-statistics";
import { PeriodIndex } from "./core/period-index";
import { PeriodicNoteIndexer } from "./core/periodic-note-indexer";
import { SettingsStore } from "./core/settings-store";
import { TemplateService } from "./services/template";
import { PeriodicPlannerSettingsTab } from "./settings/settings-tab";
import type { PeriodLinks } from "./types";
import { PERIOD_CONFIG, PeriodixSyncDataSchema } from "./types";
import { createPeriodInfo, getNextPeriod, getPreviousPeriod, parseLinkToDateTime } from "./utils/date-utils";
import { getPdfPath } from "./utils/file-operations";
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
	syncStore!: SyncStore<typeof PeriodixSyncDataSchema>;
	autoGenerator!: AutoGenerator;
	indexer!: PeriodicNoteIndexer;
	periodIndex!: PeriodIndex;
	globalStatsAggregator!: GlobalStatisticsAggregator;
	categoryTracker!: CategoryTracker;
	templateService!: TemplateService;
	private ribbonIconEl: HTMLElement | null = null;

	async onload() {
		this.settingsStore = new SettingsStore(this);
		await this.settingsStore.loadSettings();

		this.syncStore = new SyncStore(this.app, this, PeriodixSyncDataSchema);
		await this.syncStore.loadData();

		this.addSettingTab(new PeriodicPlannerSettingsTab(this.app, this));
		this.registerCommands();
		this.updateRibbonIcon();

		const settingsSubscription = this.settingsStore.settings$.subscribe(() => {
			this.updateRibbonIcon();
		});
		this.register(() => {
			settingsSubscription.unsubscribe();
		});

		this.initializePlugin();
	}

	onunload() {
		this.autoGenerator.destroy();
		this.globalStatsAggregator.destroy();
		this.indexer.stop();
		this.periodIndex.destroy();
		this.templateService.destroy();
	}

	async activatePeriodBasesView(): Promise<void> {
		const { workspace } = this.app;

		const existingLeaves = workspace.getLeavesOfType(VIEW_TYPE_PERIOD_BASES);

		if (existingLeaves.length > 0) {
			const firstLeaf = existingLeaves[0];
			workspace.revealLeaf(firstLeaf);
		} else {
			const sidebarPosition = this.settingsStore.currentSettings.basesView.sidebarPosition;
			const leaf = sidebarPosition === "left" ? workspace.getLeftLeaf(false) : workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({ type: VIEW_TYPE_PERIOD_BASES, active: true });
				workspace.revealLeaf(leaf);
			}
		}
	}

	private updateRibbonIcon(): void {
		const settings = this.settingsStore.currentSettings;

		if (settings.basesView.showRibbonIcon && !this.ribbonIconEl) {
			this.ribbonIconEl = this.addRibbonIcon("list-checks", "Open Period Tasks", async () => {
				await this.activatePeriodBasesView();
			});
		} else if (!settings.basesView.showRibbonIcon && this.ribbonIconEl) {
			this.ribbonIconEl.remove();
			this.ribbonIconEl = null;
		}
	}

	private async initializePlugin() {
		await new Promise<void>((resolve) => this.app.workspace.onLayoutReady(resolve));

		// @ts-expect-error - initialized property exists at runtime but not in type definitions
		if (!this.app.metadataCache.initialized) {
			await new Promise<void>((resolve) => {
				// @ts-expect-error - initialized event exists at runtime but not in type definitions
				this.app.metadataCache.once("initialized", resolve);
			});
		}

		this.indexer = new PeriodicNoteIndexer(this.app, this.settingsStore.settings$, this.syncStore);
		this.templateService = new TemplateService(this.app, this.settingsStore.settings$);
		this.autoGenerator = new AutoGenerator(
			this.app,
			this.settingsStore.settings$,
			this.templateService,
			this.syncStore
		);
		this.periodIndex = new PeriodIndex(this.indexer);
		this.globalStatsAggregator = new GlobalStatisticsAggregator(this.periodIndex);
		this.categoryTracker = new CategoryTracker(this.periodIndex, this.settingsStore);

		await this.indexer.start();

		this.registerVaultEvents();
		this.registerView(VIEW_TYPE_PERIOD_BASES, (leaf) => new PeriodBasesItemView(leaf, this));
		this.registerCodeBlockProcessor();

		if (this.autoGenerator.shouldGeneratePastPeriods()) {
			await this.runPastPeriodGeneration();
		}

		if (this.autoGenerator.shouldAutoGenerate()) {
			await this.runAutoGeneration();
		}

		if (this.settingsStore.currentSettings.generation.openYesterdayPdfOnStartup) {
			await this.openYesterdayPdfIfNotOpen();
		}

		await this.checkForUpdates();
	}

	private async runPastPeriodGeneration(): Promise<void> {
		if (this.syncStore.data.readOnly) {
			console.debug("Periodic Planner: Skipping past period generation (read-only mode)");
			return;
		}

		try {
			const startingDate = this.settingsStore.currentSettings.generation.startingPeriodDate;
			const summary = await this.autoGenerator.generatePastPeriods(startingDate);
			console.debug("Past period generation complete:", formatAutoGenerationSummary(summary));

			if (summary.created > 0) {
				new Notice(`Periodic Planner: Generated ${summary.created} past note(s), ${summary.existing} already existed`);
			}
		} catch (error) {
			console.error("Periodic Planner: Past period generation failed", error);
		}
	}

	private async runAutoGeneration(): Promise<void> {
		if (this.syncStore.data.readOnly) {
			console.debug("Periodic Planner: Skipping auto-generation (read-only mode)");
			return;
		}

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

	private isFileOpen(path: string): boolean {
		return this.app.workspace.getLeavesOfType("pdf").some((leaf) => {
			const state = leaf.getViewState();
			return state.state?.file === path;
		});
	}

	private async openInNewWindow(file: TFile): Promise<void> {
		const leaf = this.app.workspace.getLeaf("window");
		await leaf.openFile(file, { active: true });
	}

	private async openYesterdayPdfIfNotOpen(): Promise<void> {
		if (this.syncStore.data.readOnly) {
			console.debug("Periodic Planner: Skipping PDF generation (automatic generation disabled)");
			return;
		}

		try {
			const yesterday = DateTime.now().minus({ days: 1 });
			const result = await this.autoGenerator.generateSingleNote(yesterday, "daily");
			if (!result.success) return;

			const pdfPath = getPdfPath(result.filePath);
			const pdfFile = this.app.vault.getAbstractFileByPath(pdfPath);
			if (!(pdfFile instanceof TFile)) return;

			if (!this.isFileOpen(pdfPath)) {
				await this.openInNewWindow(pdfFile);
			}
		} catch (error) {
			console.error("Periodic Planner: Failed to open yesterday's PDF", error);
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
		if (!this.indexer || !this.periodIndex) return;
		await this.indexer.refreshFile(file);
		await this.ensurePeriodicNoteComplete(file);
	}

	private async ensurePeriodicNoteComplete(file: TFile): Promise<void> {
		if (!this.periodIndex) return;
		if (this.syncStore.data.readOnly) return;

		const entry = this.periodIndex.getEntryForFile(file);
		if (!entry) return;

		await this.ensureFrontmatterProperties(entry.file, entry.periodType, entry.periodStart);
		await this.autoGenerator.getNoteGenerator().ensureTimeBudgetBlock(entry.file, entry.periodType);
	}

	private async ensureFrontmatterProperties(file: TFile, periodType: PeriodType, dateTime: DateTime): Promise<void> {
		if (this.syncStore.data.readOnly) return;

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

		if (this.settingsStore.currentSettings.generation.enablePdfCommands) {
			this.registerOpenCurrentPdfCommand("open-daily-pdf", "Open today's daily note (PDF)", "daily");
			this.addCommand({
				id: "open-yesterday-pdf",
				name: "Open yesterday's daily note (PDF)",
				callback: async () => {
					await this.openPeriodPdfForDate(DateTime.now().minus({ days: 1 }), "daily");
				},
			});
			this.registerOpenCurrentPdfCommand("open-weekly-pdf", "Open current weekly note (PDF)", "weekly");
			this.registerOpenCurrentPdfCommand("open-monthly-pdf", "Open current monthly note (PDF)", "monthly");
			this.registerOpenCurrentPdfCommand("open-quarterly-pdf", "Open current quarterly note (PDF)", "quarterly");
			this.registerOpenCurrentPdfCommand("open-yearly-pdf", "Open current yearly note (PDF)", "yearly");
		}

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
						settings.generation,
						this.settingsStore
					).open();
				}
				return true;
			},
		});

		this.addCommand({
			id: "open-period-bases-sidebar",
			name: "Open Period Tasks sidebar",
			callback: async () => {
				await this.activatePeriodBasesView();
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

	private registerOpenCurrentPdfCommand(id: string, name: string, periodType: PeriodType): void {
		this.addCommand({
			id,
			name,
			callback: async () => {
				await this.openPeriodPdfForDate(DateTime.now(), periodType);
			},
		});
	}

	private async openPeriodPdfForDate(dateTime: DateTime, periodType: PeriodType): Promise<void> {
		const result = await this.autoGenerator.generateSingleNote(dateTime, periodType);
		if (!result.success) {
			new Notice(`Failed to generate note: ${result.error}`);
			return;
		}

		const pdfPath = getPdfPath(result.filePath);
		const pdfFile = this.app.vault.getAbstractFileByPath(pdfPath);
		if (pdfFile instanceof TFile) {
			await openNoteFile(this.app, pdfFile);
		} else {
			new Notice(`PDF file not found: ${pdfPath}`);
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
		const codeFence = SETTINGS_DEFAULTS.TIME_BUDGET_CODE_FENCE;
		this.registerMarkdownCodeBlockProcessor(codeFence, (source, el, ctx) => {
			if (el.hasClass("periodic-planner-initialized")) {
				return;
			}

			el.empty();
			el.addClass("periodic-planner-initialized");

			const renderer = new TimeBudgetBlockRenderer(
				el,
				this.app,
				this.settingsStore,
				this.categoryTracker,
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

	private async checkForUpdates(): Promise<void> {
		const currentVersion = this.manifest.version;
		const lastSeenVersion = this.settingsStore.currentSettings.version;

		if (lastSeenVersion !== currentVersion) {
			const config: WhatsNewModalConfig = {
				cssPrefix: "periodic-planner",
				pluginName: "Periodix Planner",
				changelogContent: CHANGELOG_CONTENT,
				links: {
					github: "https://github.com/Real1tyy/Periodix-Planner",
					support: "https://matejvavroproductivity.com/support/",
					changelog: "https://real1tyy.github.io/Periodix-Planner/changelog",
					documentation: "https://real1tyy.github.io/Periodix-Planner/",
				},
			};

			new WhatsNewModal(this.app, this, config, lastSeenVersion, currentVersion).open();
			await this.settingsStore.updateSettings((settings) => ({
				...settings,
				version: currentVersion,
			}));
		}
	}
}
