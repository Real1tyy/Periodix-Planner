import type { IndexedPeriodNote } from "../types/period";

export function buildBasesFilePathFilters(notes: IndexedPeriodNote[]): string {
	if (notes.length === 0) {
		return '        - file.path == ""';
	}
	return notes.map((note) => `        - file.path == "${note.filePath}"`).join("\n");
}
