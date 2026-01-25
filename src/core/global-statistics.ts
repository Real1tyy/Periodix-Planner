import { Subject, type Subscription } from "rxjs";
import type { PeriodType } from "../constants";
import type { PeriodIndex } from "./period-index";

export interface CategoryStatistics {
	categoryName: string;
	totalHours: number;
	noteCount: number;
}

export interface PeriodTypeStatistics {
	periodType: PeriodType;
	categoryStats: CategoryStatistics[];
	totalHours: number;
	totalNotes: number;
}

export interface GlobalStatistics {
	byPeriodType: Map<PeriodType, PeriodTypeStatistics>;
}

type GlobalStatisticsEvent = {
	type: "statistics-updated";
	statistics: GlobalStatistics;
};

type CategoryAgg = { hours: number; notes: number };
type PeriodAgg = {
	totalNotes: number;
	categories: Map<string, CategoryAgg>;
};

const EMPTY: GlobalStatistics = { byPeriodType: new Map() };

export class GlobalStatisticsAggregator {
	private readonly periodIndex: PeriodIndex;
	private periodIndexSubscription: Subscription | null = null;

	private readonly aggByPeriod = new Map<PeriodType, PeriodAgg>();

	private statistics: GlobalStatistics = EMPTY;

	private eventsSubject = new Subject<GlobalStatisticsEvent>();
	public readonly events$ = this.eventsSubject.asObservable();

	constructor(periodIndex: PeriodIndex) {
		this.periodIndex = periodIndex;

		this.periodIndexSubscription = periodIndex.events$.subscribe((event) => {
			if (event.type === "note-added") {
				this.applyDelta(event.note.periodType, event.categoryAllocations, +1);
			} else if (event.type === "note-updated") {
				this.applyDelta(event.note.periodType, event.oldCategoryAllocations, -1);
				this.applyDelta(event.note.periodType, event.newCategoryAllocations, +1);
			} else if (event.type === "note-deleted") {
				this.applyDelta(event.note.periodType, event.categoryAllocations, -1);
			}
		});

		this.initializeFromIndex();
	}

	destroy(): void {
		this.periodIndexSubscription?.unsubscribe();
		this.periodIndexSubscription = null;
		this.eventsSubject.complete();
	}

	getStatistics(): GlobalStatistics {
		return this.statistics;
	}

	getStatisticsForPeriodType(periodType: PeriodType): PeriodTypeStatistics | undefined {
		return this.statistics.byPeriodType.get(periodType);
	}

	private initializeFromIndex(): void {
		this.aggByPeriod.clear();

		for (const note of this.periodIndex.getAllNotes()) {
			this.applyDelta(note.periodType, note.categoryAllocations, +1, false);
		}

		this.rebuildSnapshotAndEmit();
	}

	private applyDelta(periodType: PeriodType, allocations: Map<string, number>, noteDelta: 1 | -1, emit = true): void {
		const periodAgg = this.getOrCreatePeriodAgg(periodType);

		periodAgg.totalNotes = Math.max(0, periodAgg.totalNotes + noteDelta);

		for (const [category, hours] of allocations) {
			const cat = periodAgg.categories.get(category) ?? { hours: 0, notes: 0 };
			cat.hours += hours * noteDelta;
			cat.notes += noteDelta;

			if (cat.notes <= 0 || cat.hours <= 0) {
				periodAgg.categories.delete(category);
			} else {
				periodAgg.categories.set(category, cat);
			}
		}

		if (periodAgg.totalNotes === 0) {
			this.aggByPeriod.delete(periodType);
		}

		if (emit) this.rebuildSnapshotAndEmit();
	}

	private getOrCreatePeriodAgg(periodType: PeriodType): PeriodAgg {
		let existing = this.aggByPeriod.get(periodType);
		if (!existing) {
			existing = { totalNotes: 0, categories: new Map() };
			this.aggByPeriod.set(periodType, existing);
		}
		return existing;
	}

	private rebuildSnapshotAndEmit(): void {
		const byPeriodType = new Map<PeriodType, PeriodTypeStatistics>();

		for (const [periodType, agg] of this.aggByPeriod) {
			const categoryStats: CategoryStatistics[] = Array.from(agg.categories, ([categoryName, v]) => ({
				categoryName,
				totalHours: v.hours,
				noteCount: v.notes,
			})).sort((a, b) => b.totalHours - a.totalHours);

			const totalHours = categoryStats.reduce((s, x) => s + x.totalHours, 0);

			byPeriodType.set(periodType, {
				periodType,
				categoryStats,
				totalHours,
				totalNotes: agg.totalNotes,
			});
		}

		this.statistics = { byPeriodType };
		this.eventsSubject.next({
			type: "statistics-updated",
			statistics: this.statistics,
		});
	}
}
