import { Subject, type Subscription } from "rxjs";
import type { PeriodicPlannerSettings } from "../types";
import { getNotesByPeriodType } from "../utils/note-utils";
import { getTopLevelEnabledPeriod } from "../utils/period-navigation";
import type { PeriodIndex } from "./period-index";

export interface CategoryStatistics {
	categoryName: string;
	totalHours: number;
	noteCount: number;
}

export interface GlobalStatistics {
	categoryStats: CategoryStatistics[];
	totalHours: number;
	totalNotes: number;
}

type GlobalStatisticsEvent = {
	type: "statistics-updated";
	statistics: GlobalStatistics;
};

const EMPTY_GLOBAL_STATISTICS: GlobalStatistics = {
	categoryStats: [],
	totalHours: 0,
	totalNotes: 0,
};

export class GlobalStatisticsAggregator {
	private eventsSubscription: Subscription | null = null;
	private statistics: GlobalStatistics = EMPTY_GLOBAL_STATISTICS;
	private eventsSubject = new Subject<GlobalStatisticsEvent>();
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

	getStatistics(): GlobalStatistics {
		return this.statistics;
	}

	private recalculate(): void {
		const statistics = this.calculateGlobalStatistics();
		this.statistics = statistics;
		this.eventsSubject.next({ type: "statistics-updated", statistics });
	}

	private calculateGlobalStatistics(): GlobalStatistics {
		const topLevelPeriodType = getTopLevelEnabledPeriod(this.settings.generation);
		if (!topLevelPeriodType) {
			return EMPTY_GLOBAL_STATISTICS;
		}

		const topLevelNotes = getNotesByPeriodType(this.periodIndex, topLevelPeriodType);
		const totalNotes = topLevelNotes.length;

		const categoryMap = topLevelNotes.reduce((map, note) => {
			for (const [categoryName, hours] of note.categoryAllocations) {
				const existing = map.get(categoryName);
				if (existing) {
					existing.totalHours += hours;
					existing.noteCount++;
				} else {
					map.set(categoryName, {
						categoryName,
						totalHours: hours,
						noteCount: 1,
					});
				}
			}
			return map;
		}, new Map<string, CategoryStatistics>());

		const categoryStats = Array.from(categoryMap.values()).sort((a, b) => b.totalHours - a.totalHours);
		const totalHours = categoryStats.reduce((sum, stat) => sum + stat.totalHours, 0);

		return {
			categoryStats,
			totalHours,
			totalNotes,
		};
	}
}
