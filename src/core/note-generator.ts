import type { DateTime } from "luxon";
import { type App, TFile } from "obsidian";
import type { Observable, Subscription } from "rxjs";

type Frontmatter = Record<string, unknown>;

import type { PeriodType } from "../constants";
import type { NoteGenerationResult, PeriodicPlannerSettings, PeriodLinks } from "../types";
import { ORDERED_PERIOD_TYPES, PERIOD_CONFIG } from "../types";
import {
	createPeriodInfo,
	formatPeriodName,
	getAncestorPeriodTypes,
	getNextPeriod,
	getPreviousPeriod,
	getStartOfPeriod,
	type PeriodInfo,
} from "../utils/date-utils";
import { getHoursForPeriodType } from "../utils/time-budget-utils";

export class NoteGenerator {
	private settings: PeriodicPlannerSettings;
	private subscription: Subscription;

	constructor(
		private app: App,
		settings$: Observable<PeriodicPlannerSettings>
	) {
		this.settings = null!;
		this.subscription = settings$.subscribe((settings) => {
			this.settings = settings;
		});
	}

	destroy(): void {
		this.subscription.unsubscribe();
	}

	async generateNote(dt: DateTime, periodType: PeriodType): Promise<NoteGenerationResult> {
		const filePath = this.getNotePath(dt, periodType);

		const existingFile = this.app.vault.getAbstractFileByPath(filePath);
		if (existingFile) {
			return { success: true, filePath, alreadyExists: true };
		}

		try {
			await this.ensureFolderExists(filePath);
			const file = await this.app.vault.create(filePath, "");
			await this.writeFrontmatter(file, dt, periodType);

			return { success: true, filePath, alreadyExists: false };
		} catch (error) {
			return {
				success: false,
				filePath,
				alreadyExists: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	async generateAllPeriodsForDate(dt: DateTime): Promise<Map<PeriodType, NoteGenerationResult>> {
		const results = new Map<PeriodType, NoteGenerationResult>();

		for (const periodType of ORDERED_PERIOD_TYPES) {
			const result = await this.generateNote(dt, periodType);
			results.set(periodType, result);
		}

		return results;
	}

	getNotePath(dt: DateTime, periodType: PeriodType): string {
		const config = PERIOD_CONFIG[periodType];
		const folder = this.settings.directories[config.folderKey];
		const format = this.settings.naming[config.formatKey];
		const periodStart = getStartOfPeriod(dt, periodType);
		const name = formatPeriodName(periodStart, format);
		return `${folder}/${name}.md`;
	}

	getNoteLink(dt: DateTime, periodType: PeriodType): string {
		const format = this.settings.naming[PERIOD_CONFIG[periodType].formatKey];
		const periodStart = getStartOfPeriod(dt, periodType);
		return formatPeriodName(periodStart, format);
	}

	noteExists(dt: DateTime, periodType: PeriodType): boolean {
		const path = this.getNotePath(dt, periodType);
		return this.app.vault.getAbstractFileByPath(path) !== null;
	}

	getNoteFile(dt: DateTime, periodType: PeriodType): TFile | null {
		const path = this.getNotePath(dt, periodType);
		const file = this.app.vault.getAbstractFileByPath(path);
		return file instanceof TFile ? file : null;
	}

	private async writeFrontmatter(file: TFile, dt: DateTime, periodType: PeriodType): Promise<void> {
		const props = this.settings.properties;
		const format = this.settings.naming[PERIOD_CONFIG[periodType].formatKey];
		const periodInfo = createPeriodInfo(dt, periodType, format);
		const links = this.buildPeriodLinks(periodInfo);
		const hoursAvailable = getHoursForPeriodType(this.settings.timeBudget, periodType);

		await this.app.fileManager.processFrontMatter(file, (fm: Frontmatter) => {
			fm[props.periodTypeProp] = periodType;
			fm[props.periodStartProp] = periodInfo.start;
			fm[props.periodEndProp] = periodInfo.end;

			if (links.previous) fm[props.previousProp] = `[[${links.previous}]]`;
			if (links.next) fm[props.nextProp] = `[[${links.next}]]`;
			if (links.week) fm[props.weekProp] = `[[${links.week}]]`;
			if (links.month) fm[props.monthProp] = `[[${links.month}]]`;
			if (links.quarter) fm[props.quarterProp] = `[[${links.quarter}]]`;
			if (links.year) fm[props.yearProp] = `[[${links.year}]]`;

			fm[props.hoursAvailableProp] = hoursAvailable;
		});
	}

	private buildPeriodLinks(periodInfo: PeriodInfo): PeriodLinks {
		const { type, dateTime } = periodInfo;
		const prevDt = getPreviousPeriod(dateTime, type);
		const nextDt = getNextPeriod(dateTime, type);

		const links: PeriodLinks = {
			previous: this.getNoteLink(prevDt, type),
			next: this.getNoteLink(nextDt, type),
		};

		for (const ancestorType of getAncestorPeriodTypes(type)) {
			const { linkKey } = PERIOD_CONFIG[ancestorType];
			if (linkKey) {
				links[linkKey] = this.getNoteLink(dateTime, ancestorType);
			}
		}

		return links;
	}

	private async ensureFolderExists(filePath: string): Promise<void> {
		const folder = filePath.substring(0, filePath.lastIndexOf("/"));
		if (!folder) return;

		const exists = await this.app.vault.adapter.exists(folder);
		if (!exists) {
			await this.app.vault.createFolder(folder);
		}
	}
}
