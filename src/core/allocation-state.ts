import type { TimeAllocation } from "../types";

export class AllocationState {
	allocations = new Map<string, number>();
	fillFromParent = new Map<string, boolean>();

	private undoStack: Map<string, number>[] = [];
	private redoStack: Map<string, number>[] = [];
	private originalState: Map<string, number>;

	constructor(initialAllocations: TimeAllocation[] = []) {
		for (const allocation of initialAllocations) {
			this.allocations.set(allocation.categoryName, allocation.hours);
		}
		this.originalState = new Map(this.allocations);
		this.undoStack.push(new Map(this.allocations));
	}

	saveState(): void {
		const snapshot = new Map(this.allocations);
		this.undoStack.push(snapshot);
		this.redoStack = [];
	}

	undo(): Map<string, number> | null {
		if (this.undoStack.length <= 1) {
			return null;
		}

		const currentState = new Map(this.allocations);
		this.redoStack.push(currentState);
		this.undoStack.pop();

		const previousState = this.undoStack[this.undoStack.length - 1];
		this.allocations.clear();
		for (const [key, value] of previousState) {
			this.allocations.set(key, value);
		}

		return previousState;
	}

	redo(): Map<string, number> | null {
		if (this.redoStack.length === 0) {
			return null;
		}

		const nextState = this.redoStack.pop()!;
		this.undoStack.push(new Map(this.allocations));

		this.allocations.clear();
		for (const [key, value] of nextState) {
			this.allocations.set(key, value);
		}

		return nextState;
	}

	getOriginalAllocation(categoryName: string): number {
		return this.originalState.get(categoryName) ?? 0;
	}

	canUndo(): boolean {
		return this.undoStack.length > 1;
	}

	canRedo(): boolean {
		return this.redoStack.length > 0;
	}
}
