import type { TimeAllocation } from "../types";
import { createHistory } from "./history";

export class AllocationState {
	allocations = new Map<string, number>();
	fillFromParent = new Map<string, boolean>();

	private history = createHistory<Map<string, number>>(
		() => new Map(this.allocations),
		(state) => {
			this.allocations.clear();
			for (const [key, value] of state) {
				this.allocations.set(key, value);
			}
		}
	);

	constructor(initialAllocations: TimeAllocation[] = []) {
		for (const allocation of initialAllocations) {
			this.allocations.set(allocation.categoryName, allocation.hours);
		}
	}

	saveState(): void {
		this.history.save();
	}

	undo(): Map<string, number> | null {
		return this.history.undo();
	}

	redo(): Map<string, number> | null {
		return this.history.redo();
	}

	getOriginalAllocation(categoryName: string): number {
		const originalState = this.history.getOriginalState();
		if (originalState) {
			return originalState.get(categoryName) ?? 0;
		}
		return this.allocations.get(categoryName) ?? 0;
	}

	canUndo(): boolean {
		return this.history.canUndo();
	}

	canRedo(): boolean {
		return this.history.canRedo();
	}
}
