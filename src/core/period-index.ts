import type { TFile } from "obsidian";
import { Subject, type Subscription } from "rxjs";
import type { IndexedPeriodNote, PeriodChildren } from "../types";
import { getParentFilePathsFromLinks } from "../utils/note-utils";
import { noteDataChanged } from "../utils/period";
import type { PeriodicNoteIndexer } from "./periodic-note-indexer";

type PeriodIndexEvent =
	| {
			type: "note-added";
			filePath: string;
			note: IndexedPeriodNote;
			categoryAllocations: Map<string, number>;
	  }
	| {
			type: "note-updated";
			filePath: string;
			note: IndexedPeriodNote;
			oldCategoryAllocations: Map<string, number>;
			newCategoryAllocations: Map<string, number>;
	  }
	| {
			type: "note-deleted";
			filePath: string;
			note: IndexedPeriodNote;
			categoryAllocations: Map<string, number>;
	  }
	| {
			type: "parent-children-updated";
			filePath: string;
	  };

export class PeriodIndex {
	private eventsSubscription: Subscription | null = null;
	private readonly notesByPath: Map<string, IndexedPeriodNote> = new Map();
	private childrenCache: Map<string, PeriodChildren> = new Map();
	private eventsSubject = new Subject<PeriodIndexEvent>();
	public readonly events$ = this.eventsSubject.asObservable();

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
		this.eventsSubject.complete();
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

	getAllNotes(): IndexedPeriodNote[] {
		return Array.from(this.notesByPath.values());
	}

	getNotesByPeriodType(periodType: string): IndexedPeriodNote[] {
		return Array.from(this.notesByPath.values()).filter((note) => note.periodType === periodType);
	}

	private addOrUpdateNote(note: IndexedPeriodNote): void {
		const existingNote = this.notesByPath.get(note.filePath);
		const hasChanged = noteDataChanged(existingNote, note);

		if (existingNote) {
			this.removeFromParentsCaches(existingNote);
		}

		this.notesByPath.set(note.filePath, note);
		const affectedParents = this.addToParentsCaches(note);

		if (hasChanged) {
			if (existingNote) {
				this.eventsSubject.next({
					type: "note-updated",
					filePath: note.filePath,
					note,
					oldCategoryAllocations: existingNote.categoryAllocations,
					newCategoryAllocations: note.categoryAllocations,
				});
			} else {
				this.eventsSubject.next({
					type: "note-added",
					filePath: note.filePath,
					note,
					categoryAllocations: note.categoryAllocations,
				});
			}

			for (const parentPath of affectedParents) {
				this.eventsSubject.next({
					type: "parent-children-updated",
					filePath: parentPath,
				});
			}

			const affectedChildren = this.getAffectedChildren(note.filePath);
			for (const childPath of affectedChildren) {
				this.eventsSubject.next({
					type: "parent-children-updated",
					filePath: childPath,
				});
			}
		}
	}

	private removeNoteByPath(filePath: string): void {
		const note = this.notesByPath.get(filePath);
		if (note) {
			const affectedParents = this.removeFromParentsCaches(note);
			const affectedChildren = this.getAffectedChildren(filePath);
			this.childrenCache.delete(filePath);
			this.notesByPath.delete(filePath);

			this.eventsSubject.next({
				type: "note-deleted",
				filePath,
				note,
				categoryAllocations: note.categoryAllocations,
			});

			for (const parentPath of affectedParents) {
				this.eventsSubject.next({
					type: "parent-children-updated",
					filePath: parentPath,
				});
			}

			for (const childPath of affectedChildren) {
				this.eventsSubject.next({
					type: "parent-children-updated",
					filePath: childPath,
				});
			}
		}
	}

	private getAffectedChildren(parentFilePath: string): Set<string> {
		const affectedChildren = new Set<string>();
		const children = this.childrenCache.get(parentFilePath);

		if (children) {
			for (const childArray of Object.values(children)) {
				if (childArray) {
					for (const child of childArray) {
						affectedChildren.add(child.filePath);
					}
				}
			}
		}

		return affectedChildren;
	}

	private addToParentsCaches(note: IndexedPeriodNote): Set<string> {
		const parentLinkPaths = getParentFilePathsFromLinks(note);
		const affectedParents = new Set<string>();

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

			affectedParents.add(parentFilePath);
		}

		return affectedParents;
	}

	private removeFromParentsCaches(note: IndexedPeriodNote): Set<string> {
		const parentLinkPaths = getParentFilePathsFromLinks(note);
		const affectedParents = new Set<string>();

		for (const { parentFilePath, childrenKey } of parentLinkPaths) {
			const children = this.childrenCache.get(parentFilePath);
			if (children?.[childrenKey]) {
				children[childrenKey] = children[childrenKey]?.filter((c) => c.filePath !== note.filePath);
				affectedParents.add(parentFilePath);
			}
		}

		return affectedParents;
	}
}
