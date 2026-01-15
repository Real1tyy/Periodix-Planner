import { Subject, type Subscription } from "rxjs";
import { SETTINGS_DEFAULTS } from "../constants";
import type { IndexedPeriodNote } from "../types/period";
import type { PeriodIndex } from "./period-index";
import type { SettingsStore } from "./settings-store";

export interface TrackedCategory {
	name: string;
	color: string;
	filePaths: Set<string>;
}

export interface CategoryStatistics {
	readonly categories: ReadonlyMap<string, TrackedCategory>;
}

type CategoryTrackerEvent = {
	type: "categories-updated";
	statistics: CategoryStatistics;
};

export class CategoryTracker {
	private readonly periodIndex: PeriodIndex;
	private readonly settingsStore: SettingsStore;
	private periodIndexSubscription: Subscription | null = null;
	private categories: Map<string, TrackedCategory> = new Map();
	private eventsSubject = new Subject<CategoryTrackerEvent>();
	public readonly events$ = this.eventsSubject.asObservable();
	private pendingSettingsSync = false;
	private categoriesToAdd = new Set<string>();
	private categoriesToRemove = new Set<string>();

	constructor(periodIndex: PeriodIndex, settingsStore: SettingsStore) {
		this.periodIndex = periodIndex;
		this.settingsStore = settingsStore;

		this.periodIndexSubscription = periodIndex.events$.subscribe((event) => {
			if (event.type === "note-added") {
				this.handleNoteAdded(event.categoryAllocations, event.filePath);
			} else if (event.type === "note-updated") {
				this.handleNoteUpdated(event.oldCategoryAllocations, event.newCategoryAllocations, event.filePath);
			} else if (event.type === "note-deleted") {
				this.handleNoteDeleted(event.categoryAllocations, event.filePath);
			}
		});

		this.initializeFromIndex();
	}

	destroy(): void {
		this.periodIndexSubscription?.unsubscribe();
		this.periodIndexSubscription = null;
		this.eventsSubject.complete();
	}

	getCategories(): Map<string, TrackedCategory> {
		return new Map(this.categories);
	}

	getAllCategoryNames(): string[] {
		return Array.from(this.categories.keys()).sort();
	}

	getCategoryByName(name: string): TrackedCategory | undefined {
		return this.categories.get(name);
	}

	getNotesForCategory(categoryName: string): IndexedPeriodNote[] {
		const filePaths = this.categories.get(categoryName)?.filePaths ?? new Set();
		return Array.from(filePaths)
			.map((path) => this.periodIndex.getEntryByPath(path))
			.filter((note): note is IndexedPeriodNote => note !== undefined);
	}

	getCategoryColor(categoryName: string): string {
		const settings = this.settingsStore.currentSettings;
		const category = settings.categories.find((c) => c.name === categoryName);
		if (category) {
			return category.color;
		}

		const colorIndex = this.getAllCategoryNames().indexOf(categoryName);
		const fallbackIndex = colorIndex >= 0 ? colorIndex : 0;
		return SETTINGS_DEFAULTS.DEFAULT_CATEGORY_COLORS[fallbackIndex % SETTINGS_DEFAULTS.DEFAULT_CATEGORY_COLORS.length];
	}

	private initializeFromIndex(): void {
		for (const note of this.periodIndex.getAllNotes()) {
			for (const [categoryName] of note.categoryAllocations) {
				this.addFilePathToCategory(categoryName, note.filePath);
			}
		}
		this.emitUpdate();
	}

	private handleNoteAdded(categoryAllocations: Map<string, number>, filePath: string): void {
		for (const [categoryName] of categoryAllocations) {
			this.addFilePathToCategory(categoryName, filePath);
		}
		this.emitUpdate();
	}

	private handleNoteUpdated(
		oldAllocations: Map<string, number>,
		newAllocations: Map<string, number>,
		filePath: string
	): void {
		for (const [categoryName] of oldAllocations) {
			this.removeFilePathFromCategory(categoryName, filePath);
		}

		for (const [categoryName] of newAllocations) {
			this.addFilePathToCategory(categoryName, filePath);
		}

		this.emitUpdate();
	}

	private handleNoteDeleted(categoryAllocations: Map<string, number>, filePath: string): void {
		for (const [categoryName] of categoryAllocations) {
			this.removeFilePathFromCategory(categoryName, filePath);
		}
		this.emitUpdate();
	}

	private addFilePathToCategory(categoryName: string, filePath: string): void {
		const existing = this.categories.get(categoryName);
		if (existing) {
			existing.filePaths.add(filePath);
		} else {
			const color = this.getCategoryColor(categoryName);
			this.categories.set(categoryName, {
				name: categoryName,
				color,
				filePaths: new Set([filePath]),
			});
			this.categoriesToAdd.add(categoryName);
			this.scheduleSettingsSync();
		}
	}

	private removeFilePathFromCategory(categoryName: string, filePath: string): void {
		const existing = this.categories.get(categoryName);
		if (existing) {
			existing.filePaths.delete(filePath);

			if (existing.filePaths.size === 0) {
				this.categories.delete(categoryName);
				this.categoriesToRemove.add(categoryName);
				this.scheduleSettingsSync();
			}
		}
	}

	private emitUpdate(): void {
		this.eventsSubject.next({
			type: "categories-updated",
			statistics: { categories: this.categories },
		});
	}

	private scheduleSettingsSync(): void {
		if (this.pendingSettingsSync) return;
		this.pendingSettingsSync = true;

		queueMicrotask(async () => {
			this.pendingSettingsSync = false;
			await this.syncCategoriesToSettings();
		});
	}

	private async syncCategoriesToSettings(): Promise<void> {
		const toAdd = Array.from(this.categoriesToAdd);
		const toRemove = Array.from(this.categoriesToRemove);

		this.categoriesToAdd.clear();
		this.categoriesToRemove.clear();

		if (toAdd.length === 0 && toRemove.length === 0) return;

		const settings = this.settingsStore.currentSettings;
		let categories = [...settings.categories];

		for (const categoryName of toRemove) {
			categories = categories.filter((c) => c.name !== categoryName);
		}

		for (const categoryName of toAdd) {
			if (!categories.some((c) => c.name === categoryName)) {
				const tracked = this.categories.get(categoryName);
				if (tracked) {
					categories.push({ name: categoryName, color: tracked.color });
				}
			}
		}

		await this.settingsStore.updateSettings((s) => ({
			...s,
			categories,
		}));
	}
}
