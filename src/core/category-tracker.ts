import { Subject, type Subscription } from "rxjs";
import { SETTINGS_DEFAULTS } from "../constants";
import type { PeriodicPlannerSettings } from "../types";
import type { PeriodIndex } from "./period-index";

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
	private eventsSubscription: Subscription | null = null;
	private categories: Map<string, TrackedCategory> = new Map();
	private eventsSubject = new Subject<CategoryTrackerEvent>();
	public readonly events$ = this.eventsSubject.asObservable();

	constructor(
		private periodIndex: PeriodIndex,
		private settings: PeriodicPlannerSettings
	) {
		this.eventsSubscription = periodIndex.events$.subscribe(() => {
			this.recalculate();
		});

		this.recalculate();
	}

	destroy(): void {
		this.eventsSubscription?.unsubscribe();
		this.eventsSubscription = null;
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
		const category = this.settings.categories.find((c) => c.name === categoryName);
		if (category) {
			return category.color;
		}

		const colorIndex = this.getAllCategoryNames().indexOf(categoryName);
		const fallbackIndex = colorIndex >= 0 ? colorIndex : 0;
		return SETTINGS_DEFAULTS.DEFAULT_CATEGORY_COLORS[fallbackIndex % SETTINGS_DEFAULTS.DEFAULT_CATEGORY_COLORS.length];
	}

	private recalculate(): void {
		const newCategories = new Map<string, TrackedCategory>();

		for (const note of this.periodIndex.notesByPath.values()) {
			for (const [categoryName] of note.categoryAllocations) {
				const existing = newCategories.get(categoryName);

				if (existing) {
					existing.nodeCount++;
				} else {
					const color = this.getCategoryColor(categoryName);
					newCategories.set(categoryName, {
						name: categoryName,
						nodeCount: 1,
						color,
					});
				}
			}
		}

		this.categories = newCategories;
		this.eventsSubject.next({
			type: "categories-updated",
			statistics: { categories: this.categories },
		});
	}
}
