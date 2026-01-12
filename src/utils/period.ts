import type { IndexedPeriodNote } from "../types";
import { getParentFilePathsFromLinks } from "./note-utils";

export function categoryAllocationsEqual(a: Map<string, number>, b: Map<string, number>): boolean {
	if (a.size !== b.size) return false;

	for (const [categoryName, hours] of a) {
		const otherHours = b.get(categoryName);
		if (otherHours === undefined || Math.abs(hours - otherHours) > 0.01) {
			return false;
		}
	}

	return true;
}

export function noteDataChanged(oldNote: IndexedPeriodNote | undefined, newNote: IndexedPeriodNote): boolean {
	if (!oldNote) return true;

	// Check if allocations changed
	if (!categoryAllocationsEqual(oldNote.categoryAllocations, newNote.categoryAllocations)) {
		return true;
	}

	// Check if hours available changed
	if (Math.abs(oldNote.hoursAvailable - newNote.hoursAvailable) > 0.01) {
		return true;
	}

	// Check if parent links changed
	const oldParents = getParentFilePathsFromLinks(oldNote)
		.map((p) => p.parentFilePath)
		.sort();
	const newParents = getParentFilePathsFromLinks(newNote)
		.map((p) => p.parentFilePath)
		.sort();
	if (oldParents.length !== newParents.length || !oldParents.every((p, i) => p === newParents[i])) {
		return true;
	}

	return false;
}
