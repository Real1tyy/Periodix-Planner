import type { TFile } from "obsidian";
import type { Subscription } from "rxjs";
import type { IndexedPeriodNote, PeriodChildren } from "../types";
import { getParentFilePathsFromLinks } from "../utils/note-utils";
import type { PeriodicNoteIndexer } from "./periodic-note-indexer";

export class PeriodIndex {
	private eventsSubscription: Subscription | null = null;
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
	}

	destroy(): void {
		this.eventsSubscription?.unsubscribe();
		this.eventsSubscription = null;
		this.notesByPath.clear();
		this.childrenCache.clear();
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

	getEntryByPath(filePath: string): IndexedPeriodNote | undefined {
		return this.notesByPath.get(filePath);
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
		const parentLinkPaths = getParentFilePathsFromLinks(note);

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
		const parentLinkPaths = getParentFilePathsFromLinks(note);

		for (const { parentFilePath, childrenKey } of parentLinkPaths) {
			const children = this.childrenCache.get(parentFilePath);
			if (children?.[childrenKey]) {
				children[childrenKey] = children[childrenKey]?.filter((c) => c.filePath !== note.filePath);
			}
		}
	}
}
