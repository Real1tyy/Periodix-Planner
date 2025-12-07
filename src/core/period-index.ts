import type { TFile } from "obsidian";
import type { Subscription } from "rxjs";
import type { IndexedPeriodNote, PeriodChildren } from "../types";
import { PERIOD_CONFIG } from "../types";
import { resolveFilePath } from "../utils/frontmatter-utils";
import type { PeriodicNoteIndexer } from "./periodic-note-indexer";

export class PeriodIndex {
	private eventsSubscription: Subscription | null = null;
	private indexingCompleteSubscription: Subscription | null = null;
	private notesByPath: Map<string, IndexedPeriodNote> = new Map();
	private childrenCache: Map<string, PeriodChildren> = new Map();

	constructor(indexer: PeriodicNoteIndexer) {
		this.eventsSubscription = indexer.events$.subscribe((event) => {
			if (event.type === "note-indexed") {
				this.addOrUpdateNote(event.note);
			} else if (event.type === "note-deleted") {
				this.removeNoteByPath(event.filePath);
			}
		});

		this.indexingCompleteSubscription = indexer.indexingComplete$.subscribe((isComplete) => {
			if (isComplete) {
				console.log("📊 Period Index - Indexing Complete");
				console.log("Total notes indexed:", this.notesByPath.size);
				console.log("Parent-child relationships:", this.childrenCache.size);
				console.log("Children cache full content:");
				console.log(JSON.stringify(this.getDebugSnapshot(), null, 2));
			}
		});
	}

	destroy(): void {
		this.eventsSubscription?.unsubscribe();
		this.eventsSubscription = null;
		this.indexingCompleteSubscription?.unsubscribe();
		this.indexingCompleteSubscription = null;
		this.notesByPath.clear();
		this.childrenCache.clear();
	}

	private getDebugSnapshot(): Record<string, unknown> {
		const snapshot: Record<string, unknown> = {};
		for (const [filePath, children] of this.childrenCache.entries()) {
			snapshot[filePath] = {
				days: children.days?.map((n) => ({ filePath: n.filePath, noteName: n.noteName })),
				weeks: children.weeks?.map((n) => ({ filePath: n.filePath, noteName: n.noteName })),
				months: children.months?.map((n) => ({ filePath: n.filePath, noteName: n.noteName })),
				quarters: children.quarters?.map((n) => ({ filePath: n.filePath, noteName: n.noteName })),
			};
		}
		return snapshot;
	}

	getChildren(parent: IndexedPeriodNote): PeriodChildren {
		return this.childrenCache.get(parent.filePath) ?? {};
	}

	getChildrenForFile(file: TFile): PeriodChildren | null {
		return this.childrenCache.get(file.path) ?? null;
	}

	getEntryForFile(file: TFile): IndexedPeriodNote | undefined {
		return this.notesByPath.get(file.path);
	}

	private addOrUpdateNote(note: IndexedPeriodNote): void {
		const existingNote = this.notesByPath.get(note.filePath);
		if (existingNote) {
			this.removeFromParentsCaches(existingNote);
		}

		this.notesByPath.set(note.filePath, note);
		this.addToParentsCaches(note);
	}

	private removeNoteByPath(filePath: string): void {
		const note = this.notesByPath.get(filePath);
		if (note) {
			this.removeFromParentsCaches(note);
			this.childrenCache.delete(filePath);
			this.notesByPath.delete(filePath);
		}
	}

	private addToParentsCaches(note: IndexedPeriodNote): void {
		const parentLinkPaths = this.getParentFilePathsFromLinks(note);

		for (const { parentFilePath, childrenKey } of parentLinkPaths) {
			let children = this.childrenCache.get(parentFilePath);
			if (!children) {
				children = {};
				this.childrenCache.set(parentFilePath, children);
			}

			if (!children[childrenKey]) {
				children[childrenKey] = [];
			}

			const exists = children[childrenKey]?.some((c) => c.filePath === note.filePath);
			if (!exists) {
				children[childrenKey]?.push(note);
				children[childrenKey]?.sort((a, b) => a.periodStart.toMillis() - b.periodStart.toMillis());
			}
		}
	}

	private removeFromParentsCaches(note: IndexedPeriodNote): void {
		const parentLinkPaths = this.getParentFilePathsFromLinks(note);

		for (const { parentFilePath, childrenKey } of parentLinkPaths) {
			const children = this.childrenCache.get(parentFilePath);
			if (children?.[childrenKey]) {
				children[childrenKey] = children[childrenKey]?.filter((c) => c.filePath !== note.filePath);
			}
		}
	}

	private getParentFilePathsFromLinks(
		note: IndexedPeriodNote
	): Array<{ parentFilePath: string; childrenKey: keyof PeriodChildren }> {
		const results: Array<{ parentFilePath: string; childrenKey: keyof PeriodChildren }> = [];
		const childrenKey = PERIOD_CONFIG[note.periodType].childrenKey;
		if (!childrenKey) return results;

		const links = note.parentLinks;
		const parentLinkKeys = ["parent", "week", "month", "quarter", "year"] as const;

		for (const linkKey of parentLinkKeys) {
			const linkValue = links[linkKey];
			if (linkValue) {
				results.push({
					parentFilePath: resolveFilePath(linkValue),
					childrenKey,
				});
			}
		}

		return results;
	}
}
