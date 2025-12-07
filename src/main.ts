import { DateTime } from "luxon";
import { Notice, Plugin, TFile } from "obsidian";
import { PeriodChildrenBasesModal } from "./components/period-children/bases-modal";
import { TimeBudgetBlockRenderer } from "./components/time-budget";
import type { PeriodType } from "./constants";
import { AutoGenerator, formatAutoGenerationSummary } from "./core/auto-generator";
import { PeriodIndex } from "./core/period-index";
import { PeriodicNoteIndexer } from "./core/periodic-note-indexer";
import { SettingsStore } from "./core/settings-store";
import { PeriodicPlannerSettingsTab } from "./settings/settings-tab";
import type { PeriodLinks } from "./types";
import { PERIOD_CONFIG } from "./types";
import { createPeriodInfo, getAncestorPeriodTypes, getNextPeriod, getPreviousPeriod } from "./utils/date-utils";
import {
	getActiveFileCache,
	getLinkFromFrontmatter,
	getPeriodTypeFromFrontmatter,
	openNoteFile,
	resolveNoteFile,
} from "./utils/frontmatter-utils";
import { getHoursForPeriodType } from "./utils/time-budget-utils";

export default class PeriodicPlannerPlugin extends Plugin {
	settingsStore!: SettingsStore;
	autoGenerator!: AutoGenerator;
	indexer!: PeriodicNoteIndexer;
	periodIndex!: PeriodIndex;

	async onload() {
		this.settingsStore = new SettingsStore(this);
		await this.settingsStore.loadSettings();

		this.autoGenerator = new AutoGenerator(this.app, this.settingsStore.settings$);
		this.indexer = new PeriodicNoteIndexer(this.app, this.settingsStore.settings$);
		this.periodIndex = new PeriodIndex(this.indexer);

		this.addSettingTab(new PeriodicPlannerSettingsTab(this.app, this));
		this.registerCommands();
		this.registerVaultEvents();
		this.registerCodeBlockProcessor();

		this.app.workspace.onLayoutReady(() => {
			void this.initializeOnLayoutReady();
		});
	}

	onunload() {
		this.autoGenerator.destroy();
		this.indexer.stop();
		this.periodIndex.destroy();
	}

	private async initializeOnLayoutReady(): Promise<void> {
		await this.indexer.start();

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
			if (fm[props.periodTypeProp] === undefined) {
				fm[props.periodTypeProp] = periodType;
			}
			if (fm[props.periodStartProp] === undefined) {
				fm[props.periodStartProp] = periodInfo.start;
			}
			if (fm[props.periodEndProp] === undefined) {
				fm[props.periodEndProp] = periodInfo.end;
			}
			if (fm[props.previousProp] === undefined && links.previous) {
				fm[props.previousProp] = `[[${links.previous}]]`;
			}
			if (fm[props.nextProp] === undefined && links.next) {
				fm[props.nextProp] = `[[${links.next}]]`;
			}
			if (fm[props.parentProp] === undefined && links.parent) {
				fm[props.parentProp] = `[[${links.parent}]]`;
			}
			if (fm[props.weekProp] === undefined && links.week) {
				fm[props.weekProp] = `[[${links.week}]]`;
			}
			if (fm[props.monthProp] === undefined && links.month) {
				fm[props.monthProp] = `[[${links.month}]]`;
			}
			if (fm[props.quarterProp] === undefined && links.quarter) {
				fm[props.quarterProp] = `[[${links.quarter}]]`;
			}
			if (fm[props.yearProp] === undefined && links.year) {
				fm[props.yearProp] = `[[${links.year}]]`;
			}
			if (fm[props.hoursAvailableProp] === undefined) {
				fm[props.hoursAvailableProp] = hoursAvailable;
			}
		});
	}

	private buildPeriodLinks(dateTime: DateTime, periodType: PeriodType): PeriodLinks {
		const settings = this.settingsStore.currentSettings;
		const prevDt = getPreviousPeriod(dateTime, periodType);
		const nextDt = getNextPeriod(dateTime, periodType);

		const formatLink = (dt: DateTime, type: PeriodType): string => {
			const format = settings.naming[PERIOD_CONFIG[type].formatKey];
			return dt.toFormat(format);
		};

		const links: PeriodLinks = {
			previous: formatLink(prevDt, periodType),
			next: formatLink(nextDt, periodType),
		};

		const parentType = PERIOD_CONFIG[periodType].parent;
		if (parentType) {
			links.parent = formatLink(dateTime, parentType);
		}

		for (const ancestorType of getAncestorPeriodTypes(periodType)) {
			const { linkKey } = PERIOD_CONFIG[ancestorType];
			if (linkKey) {
				links[linkKey] = formatLink(dateTime, ancestorType);
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

		this.registerOpenCurrentCommand("open-daily", "Open today's daily note", "daily");
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
					new PeriodChildrenBasesModal(this.app, entry, settings.directories, settings.properties).open();
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

				const props = this.settingsStore.currentSettings.properties;
				const link = getLinkFromFrontmatter(context.cache, props[propKey]);
				const periodType = getPeriodTypeFromFrontmatter(context.cache, props);
				if (!link || !periodType) return false;

				const targetType = propKey === "parentProp" ? PERIOD_CONFIG[periodType].parent : periodType;
				if (!targetType) return false;

				if (!checking) void this.navigateOrCreate(link, targetType);
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
		const result = await this.autoGenerator.generateSingleNote(DateTime.now(), periodType);
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

	private registerCodeBlockProcessor(): void {
		this.registerMarkdownCodeBlockProcessor("periodic-planner", async (source, el, ctx) => {
			const renderer = new TimeBudgetBlockRenderer(this.app, this.settingsStore.currentSettings, this.periodIndex);
			await renderer.render(source, el, ctx);
		});
	}
}
