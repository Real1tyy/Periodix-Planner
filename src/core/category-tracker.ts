import { Subject, type Subscription } from "rxjs";
import { SETTINGS_DEFAULTS } from "../constants";
import type { PeriodIndex } from "./period-index";
import type { SettingsStore } from "./settings-store";

export interface TrackedCategory {
	name: string;
	nodeCount: number;
	color: string;
}

export interface CategoryStatistics {
	categories: Map<string, TrackedCategory>;
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

	constructor(periodIndex: PeriodIndex, settingsStore: SettingsStore) {
		this.periodIndex = periodIndex;
		this.settingsStore = settingsStore;

		this.periodIndexSubscription = periodIndex.events$.subscribe((event) => {
			if (event.type === "note-added") {
				this.handleNoteAdded(event.categoryAllocations);
			} else if (event.type === "note-updated") {
				this.handleNoteUpdated(event.oldCategoryAllocations, event.newCategoryAllocations);
			} else if (event.type === "note-deleted") {
				this.handleNoteDeleted(event.categoryAllocations);
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
				this.incrementCategory(categoryName);
			}
		}
		this.emitUpdate();
	}

	private handleNoteAdded(categoryAllocations: Map<string, number>): void {
		for (const [categoryName] of categoryAllocations) {
			this.incrementCategory(categoryName);
		}
		this.emitUpdate();
	}

	private handleNoteUpdated(oldAllocations: Map<string, number>, newAllocations: Map<string, number>): void {
		for (const [categoryName] of oldAllocations) {
			this.decrementCategory(categoryName);
		}

		for (const [categoryName] of newAllocations) {
			this.incrementCategory(categoryName);
		}

		this.emitUpdate();
	}

	private handleNoteDeleted(categoryAllocations: Map<string, number>): void {
		for (const [categoryName] of categoryAllocations) {
			this.decrementCategory(categoryName);
		}
		this.emitUpdate();
	}

	private incrementCategory(categoryName: string): void {
		const existing = this.categories.get(categoryName);
		if (existing) {
			existing.nodeCount++;
		} else {
			const color = this.getCategoryColor(categoryName);
			this.categories.set(categoryName, {
				name: categoryName,
				nodeCount: 1,
				color,
			});
			this.addCategoryToSettings(categoryName, color);
		}
	}

	private decrementCategory(categoryName: string): void {
		const existing = this.categories.get(categoryName);
		if (existing) {
			existing.nodeCount--;
			if (existing.nodeCount <= 0) {
				this.categories.delete(categoryName);
				this.removeCategoryFromSettings(categoryName);
			}
		}
	}

	private emitUpdate(): void {
		this.eventsSubject.next({
			type: "categories-updated",
			statistics: { categories: this.categories },
		});
	}

	private async removeCategoryFromSettings(categoryName: string): Promise<void> {
		const settings = this.settingsStore.currentSettings;
		const categoryExists = settings.categories.some((c) => c.name === categoryName);

		if (categoryExists) {
			await this.settingsStore.updateSettings((s) => ({
				...s,
				categories: s.categories.filter((c) => c.name !== categoryName),
			}));
		}
	}

	private async addCategoryToSettings(categoryName: string, color: string): Promise<void> {
		const settings = this.settingsStore.currentSettings;
		const categoryExists = settings.categories.some((c) => c.name === categoryName);

		if (!categoryExists) {
			await this.settingsStore.updateSettings((s) => ({
				...s,
				categories: [...s.categories, { name: categoryName, color }],
			}));
		}
	}
}
