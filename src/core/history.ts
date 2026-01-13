type Snapshot<T> = () => T;
type Restore<T> = (state: T) => void;

export function createHistory<T>(snapshot: Snapshot<T>, restore: Restore<T>) {
	const undoStack: T[] = [];
	const redoStack: T[] = [];

	return {
		save(): void {
			undoStack.push(snapshot());
			redoStack.length = 0;
		},

		undo(): T | null {
			if (!undoStack.length) return null;
			const current = snapshot();
			redoStack.push(current);
			const prev = undoStack.pop()!;
			restore(prev);
			return prev;
		},

		redo(): T | null {
			if (!redoStack.length) return null;
			const current = snapshot();
			undoStack.push(current);
			const next = redoStack.pop()!;
			restore(next);
			return next;
		},

		canUndo(): boolean {
			return undoStack.length > 0;
		},

		canRedo(): boolean {
			return redoStack.length > 0;
		},

		getOriginalState(): T | null {
			return undoStack.length > 0 ? undoStack[0] : null;
		},
	};
}
