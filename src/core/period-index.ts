import { DateTime } from "luxon";
import type { App, CachedMetadata, TFile } from "obsidian";
import type { Observable, Subscription } from "rxjs";
import type { PeriodType } from "../constants";
import type { IndexedPeriodNote, PeriodChildren, PeriodicPlannerSettings } from "../types";
import { ORDERED_PERIOD_TYPES, PERIOD_CONFIG } from "../types";
import { getEndOfPeriod, getStartOfPeriod } from "../utils/date-utils";

export class PeriodIndex {
	private settings: PeriodicPlannerSettings;
	private subscription: Subscription;
	private index: Map<PeriodType, IndexedPeriodNote[]> = new Map();

	constructor(
		private app: App,
		settings$: Observable<PeriodicPlannerSettings>
	) {
		this.settings = null!;
		this.subscription = settings$.subscribe((settings) => {
			this.settings = settings;
		});

		for (const type of ORDERED_PERIOD_TYPES) {
			this.index.set(type, []);
		}
	}

	destroy(): void {
		this.subscription.unsubscribe();
		this.index.clear();
	}

	async buildIndex(): Promise<void> {
		this.clearIndex();

		const files = this.app.vault.getMarkdownFiles();
		for (const file of files) {
			await this.indexFile(file);
		}

		this.sortAllEntries();
	}

	async indexFile(file: TFile): Promise<boolean> {
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) return false;

		const entry = this.parseFileToEntry(file, cache);
		if (!entry) return false;

		const entries = this.index.get(entry.periodType);
		if (entries) {
			const existingIdx = entries.findIndex((e) => e.file.path === file.path);
			if (existingIdx >= 0) {
				entries[existingIdx] = entry;
			} else {
				entries.push(entry);
			}
		}

		return true;
	}

	removeFile(file: TFile): void {
		for (const entries of this.index.values()) {
			const idx = entries.findIndex((e) => e.file.path === file.path);
			if (idx >= 0) {
				entries.splice(idx, 1);
				return;
			}
		}
	}

	getEntriesByType(periodType: PeriodType): IndexedPeriodNote[] {
		return this.index.get(periodType) ?? [];
	}

	findEntry(periodType: PeriodType, dt: DateTime): IndexedPeriodNote | undefined {
		const entries = this.getEntriesByType(periodType);
		const targetStart = getStartOfPeriod(dt, periodType);
		return entries.find((e) => e.periodStart.equals(targetStart));
	}

	getChildren(parent: IndexedPeriodNote): PeriodChildren {
		const children: PeriodChildren = {};
		const { periodType, periodStart, periodEnd } = parent;

		const childTypes = this.getChildTypes(periodType);
		for (const childType of childTypes) {
			const childEntries = this.getEntriesByType(childType).filter(
				(child) => child.periodStart >= periodStart && child.periodEnd <= periodEnd
			);

			switch (childType) {
				case "daily":
					children.days = childEntries;
					break;
				case "weekly":
					children.weeks = childEntries;
					break;
				case "monthly":
					children.months = childEntries;
					break;
				case "quarterly":
					children.quarters = childEntries;
					break;
			}
		}

		return children;
	}

	getChildrenForDate(periodType: PeriodType, dt: DateTime): PeriodChildren {
		const entry = this.findEntry(periodType, dt);
		if (!entry) return {};
		return this.getChildren(entry);
	}

	getPrevious(entry: IndexedPeriodNote): IndexedPeriodNote | undefined {
		const entries = this.getEntriesByType(entry.periodType);
		const idx = entries.findIndex((e) => e.file.path === entry.file.path);
		return idx > 0 ? entries[idx - 1] : undefined;
	}

	getNext(entry: IndexedPeriodNote): IndexedPeriodNote | undefined {
		const entries = this.getEntriesByType(entry.periodType);
		const idx = entries.findIndex((e) => e.file.path === entry.file.path);
		return idx >= 0 && idx < entries.length - 1 ? entries[idx + 1] : undefined;
	}

	getParent(entry: IndexedPeriodNote): IndexedPeriodNote | undefined {
		const parentType = PERIOD_CONFIG[entry.periodType].parent;
		if (!parentType) return undefined;
		return this.findEntry(parentType, entry.periodStart);
	}

	getEntryForFile(file: TFile): IndexedPeriodNote | undefined {
		for (const entries of this.index.values()) {
			const entry = entries.find((e) => e.file.path === file.path);
			if (entry) return entry;
		}
		return undefined;
	}

	private parseFileToEntry(file: TFile, cache: CachedMetadata): IndexedPeriodNote | null {
		const fm = cache.frontmatter;
		if (!fm) return null;

		const periodTypeProp = this.settings.properties.periodTypeProp;
		const periodStartProp = this.settings.properties.periodStartProp;
		const periodEndProp = this.settings.properties.periodEndProp;

		const periodType = fm[periodTypeProp] as PeriodType | undefined;
		const periodStartStr = fm[periodStartProp] as string | undefined;
		const periodEndStr = fm[periodEndProp] as string | undefined;

		if (!periodType || !periodStartStr) return null;

		const periodStart = DateTime.fromISO(periodStartStr);
		if (!periodStart.isValid) return null;

		const periodEnd = periodEndStr ? DateTime.fromISO(periodEndStr) : getEndOfPeriod(periodStart, periodType);

		return {
			file,
			periodType,
			periodStart,
			periodEnd,
			noteName: file.basename,
		};
	}

	private getChildTypes(periodType: PeriodType): PeriodType[] {
		switch (periodType) {
			case "yearly":
				return ["quarterly", "monthly", "weekly", "daily"];
			case "quarterly":
				return ["monthly", "weekly", "daily"];
			case "monthly":
				return ["weekly", "daily"];
			case "weekly":
				return ["daily"];
			default:
				return [];
		}
	}

	private clearIndex(): void {
		for (const entries of this.index.values()) {
			entries.length = 0;
		}
	}

	private sortAllEntries(): void {
		for (const entries of this.index.values()) {
			entries.sort((a, b) => a.periodStart.toMillis() - b.periodStart.toMillis());
		}
	}
}
