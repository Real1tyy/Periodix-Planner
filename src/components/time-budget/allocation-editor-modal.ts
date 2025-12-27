import { type App, Modal } from "obsidian";
import type { Category, TimeAllocation } from "../../types";
import { addCls, cls, removeCls } from "../../utils/css";
import {
	fillAllocationsFromParent,
	formatHours,
	roundHours,
	sortCategoriesByName,
} from "../../utils/time-budget-utils";
import type { CategoryBudgetInfo } from "./parent-budget-tracker";

const DEBOUNCE_MS = 300;

interface AllocationEditorResult {
	allocations: TimeAllocation[];
	cancelled: boolean;
}

export class AllocationEditorModal extends Modal {
	private allocations: Map<string, number> = new Map();
	private fillFromParent: Map<string, boolean> = new Map();
	private allocationListEl: HTMLElement | null = null;
	private result: AllocationEditorResult = { allocations: [], cancelled: true };
	private resolvePromise: ((result: AllocationEditorResult) => void) | null = null;
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;
	private focusedCategoryId: string | null = null;
	private scrollPosition = 0;
	private inputRefs: Map<string, HTMLInputElement> = new Map();
	private percentageBarRefs: Map<string, HTMLElement> = new Map();
	private percentageLabelRefs: Map<string, HTMLElement> = new Map();
	private isDragging = false;
	private dragCategoryId: string | null = null;
	private undoStack: Map<string, number>[] = [];
	private redoStack: Map<string, number>[] = [];
	private undoButton: HTMLButtonElement | null = null;
	private redoButton: HTMLButtonElement | null = null;

	constructor(
		app: App,
		private categories: Category[],
		initialAllocations: TimeAllocation[],
		private totalHoursAvailable: number,
		private parentBudgets: Map<string, CategoryBudgetInfo>,
		private childBudgets: Map<string, CategoryBudgetInfo>
	) {
		super(app);

		for (const allocation of initialAllocations) {
			this.allocations.set(allocation.categoryId, allocation.hours);
		}
		this.saveState();
	}

	async openAndWait(): Promise<AllocationEditorResult> {
		return new Promise((resolve) => {
			this.resolvePromise = resolve;
			this.open();
		});
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass(cls("allocation-editor-modal"));

		this.renderSummary();
		this.renderAllocationList();
		this.renderActions();

		this.setupGlobalDragListeners();
		this.setupScopeHandlers();
	}

	onClose(): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
		if (this.resolvePromise) {
			this.resolvePromise(this.result);
		}
		this.inputRefs.clear();
		this.percentageBarRefs.clear();
		this.percentageLabelRefs.clear();
		this.contentEl.empty();
	}

	private setupGlobalDragListeners(): void {
		const handleMove = (clientX: number) => {
			if (!this.isDragging || !this.dragCategoryId) return;

			const barWrapper = this.contentEl.querySelector(
				`[data-category-id="${this.dragCategoryId}"] .${cls("percentage-bar-wrapper")}`
			);
			if (!barWrapper) return;

			const rect = barWrapper.getBoundingClientRect();
			const relativeX = Math.max(0, Math.min(clientX - rect.left, rect.width));
			const percentage = (relativeX / rect.width) * 100;
			const hours = Math.round((percentage / 100) * this.totalHoursAvailable * 10) / 10;

			this.allocations.set(this.dragCategoryId, hours);

			const input = this.inputRefs.get(this.dragCategoryId);
			if (input) {
				input.value = hours > 0 ? String(hours) : "";
			}

			this.updateAllocationItemStates();
			this.renderSummary();
		};

		const handleEnd = () => {
			this.isDragging = false;
			this.dragCategoryId = null;
			document.body.classList.remove(cls("dragging"));
		};

		this.contentEl.addEventListener("mousemove", (e) => {
			handleMove(e.clientX);
		});
		this.contentEl.addEventListener("mouseup", handleEnd);
		this.contentEl.addEventListener("mouseleave", handleEnd);

		this.contentEl.addEventListener("touchmove", (e) => {
			if (e.touches.length > 0) {
				handleMove(e.touches[0].clientX);
			}
		});
		this.contentEl.addEventListener("touchend", handleEnd);
		this.contentEl.addEventListener("touchcancel", handleEnd);
	}

	private renderSummary(): void {
		const existingSummary = this.contentEl.querySelector(`.${cls("allocation-summary")}`);
		if (existingSummary) {
			existingSummary.remove();
		}

		const summary = document.createElement("div");
		summary.className = cls("allocation-summary");

		const summaryControls = summary.createDiv({ cls: cls("summary-controls") });

		if (this.parentBudgets.size > 0) {
			const fillFromParentBtn = summaryControls.createEl("button", {
				text: "Fill parent",
				cls: cls("fill-from-parent-btn"),
			});
			fillFromParentBtn.addEventListener("click", () => {
				this.saveState();
				this.applyFillFromParent();
			});
		}

		this.undoButton = summaryControls.createEl("button", {
			text: "Undo",
			cls: cls("undo-redo-btn"),
		});
		this.undoButton.disabled = this.undoStack.length === 0;
		this.undoButton.addEventListener("click", () => {
			this.undo();
		});

		const summaryStats = summaryControls.createDiv({ cls: cls("summary-stats") });

		const totalAllocated = this.getTotalAllocated();
		const remaining = this.totalHoursAvailable - totalAllocated;
		const allocatedPercentage = this.totalHoursAvailable > 0 ? (totalAllocated / this.totalHoursAvailable) * 100 : 0;
		const remainingPercentage = this.totalHoursAvailable > 0 ? (remaining / this.totalHoursAvailable) * 100 : 0;

		const statusClass = allocatedPercentage > 100 ? "over" : allocatedPercentage >= 80 ? "warning" : "under";

		const allocatedItem = summaryStats.createDiv({ cls: cls("summary-item") });
		allocatedItem.createSpan({ text: "Allocated:", cls: cls("summary-label") });
		const allocatedValue = allocatedItem.createSpan({
			text: `${formatHours(totalAllocated)}h (${allocatedPercentage.toFixed(1)}%)`,
			cls: cls("summary-value"),
		});
		addCls(allocatedValue, `status-${statusClass}`);

		const remainingItem = summaryStats.createDiv({ cls: cls("summary-item") });
		remainingItem.createSpan({ text: "Remaining:", cls: cls("summary-label") });
		const remainingValue = remainingItem.createSpan({
			text: `${formatHours(remaining)}h (${remainingPercentage.toFixed(1)}%)`,
			cls: cls("summary-value"),
		});
		if (remaining < 0) {
			addCls(remainingValue, "status-over");
		}

		const totalItem = summaryStats.createDiv({ cls: cls("summary-item") });
		totalItem.createSpan({ text: "Total:", cls: cls("summary-label") });
		totalItem.createSpan({
			text: `${formatHours(this.totalHoursAvailable)}h`,
			cls: cls("summary-value"),
		});

		this.redoButton = summaryControls.createEl("button", {
			text: "Redo",
			cls: cls("undo-redo-btn"),
		});
		this.redoButton.disabled = this.redoStack.length === 0;
		this.redoButton.addEventListener("click", () => {
			this.redo();
		});

		this.contentEl.prepend(summary);
	}

	private renderAllocationList(): void {
		this.allocationListEl = this.contentEl.createDiv({ cls: cls("allocation-list") });
		this.buildAllocationList();
	}

	private buildAllocationList(): void {
		if (!this.allocationListEl) return;

		this.saveScrollPosition();

		this.allocationListEl.empty();
		this.inputRefs.clear();
		this.percentageBarRefs.clear();
		this.percentageLabelRefs.clear();

		const sortedCategories = sortCategoriesByName(this.categories);

		for (const category of sortedCategories) {
			const currentHours = this.allocations.get(category.id) ?? 0;
			const parentBudget = this.getReactiveParentBudget(category.id);
			const percentage = this.totalHoursAvailable > 0 ? (currentHours / this.totalHoursAvailable) * 100 : 0;

			const item = this.allocationListEl.createDiv({ cls: cls("allocation-item") });
			item.dataset.categoryId = category.id;
			item.id = `allocation-item-${category.id}`;

			const topRow = item.createDiv({ cls: cls("allocation-top-row") });

			const colorDot = topRow.createSpan({ cls: cls("category-color-dot-large") });
			colorDot.style.backgroundColor = category.color;

			topRow.createSpan({ text: category.name, cls: cls("category-name") });

			const budgetInfoContainer = topRow.createDiv({ cls: cls("budget-info-container") });

			if (parentBudget) {
				const parentBudgetInfo = budgetInfoContainer.createSpan({ cls: cls("parent-budget-info") });
				const EPSILON = 0.01;
				const isOver = parentBudget.allocated > parentBudget.total + EPSILON && parentBudget.total > 0;
				const parentPercentage = parentBudget.total > 0 ? (parentBudget.allocated / parentBudget.total) * 100 : 0;

				if (isOver) {
					addCls(parentBudgetInfo, "over-budget");
					parentBudgetInfo.setText(
						`⚠️ Parent: ${formatHours(parentBudget.allocated)}h / ${formatHours(parentBudget.total)}h (${parentPercentage.toFixed(1)}%)`
					);
				} else {
					parentBudgetInfo.setText(
						`Parent: ${formatHours(parentBudget.allocated)}h / ${formatHours(parentBudget.total)}h (${parentPercentage.toFixed(1)}%)`
					);
				}

				const checkboxContainer = topRow.createDiv({ cls: cls("fill-from-parent-container") });

				const checkbox = checkboxContainer.createEl("input", {
					type: "checkbox",
					cls: cls("fill-from-parent-checkbox"),
				});
				checkbox.checked = this.fillFromParent.get(category.id) ?? false;
				checkbox.addEventListener("change", () => {
					this.fillFromParent.set(category.id, checkbox.checked);
				});

				const checkboxLabel = checkboxContainer.createSpan({
					text: "Fill from parent",
					cls: cls("fill-from-parent-label"),
				});
				checkboxLabel.addEventListener("click", () => {
					checkbox.checked = !checkbox.checked;
					this.fillFromParent.set(category.id, checkbox.checked);
				});
			}

			const childBudget = this.childBudgets.get(category.id);
			if (childBudget) {
				const allocated = childBudget.allocated ?? 0;
				const total = childBudget.total ?? 0;
				const percentage = total > 0 ? (allocated / total) * 100 : 0;
				const childBudgetInfo = budgetInfoContainer.createSpan({ cls: cls("child-budget-info") });
				childBudgetInfo.setText(`Child allocated: ${formatHours(allocated)}h (${percentage.toFixed(1)}%)`);
			}

			if (!parentBudget && !childBudget) {
				budgetInfoContainer.remove();
			}

			const inputRow = item.createDiv({ cls: cls("allocation-input-row") });

			const inputContainer = inputRow.createDiv({ cls: cls("allocation-input-container") });

			const input = inputContainer.createEl("input", {
				type: "number",
				cls: cls("allocation-input"),
				value: currentHours > 0 ? String(currentHours) : "",
			});
			input.min = "0";
			input.step = "0.5";
			input.dataset.categoryId = category.id;

			this.inputRefs.set(category.id, input);

			input.addEventListener("focus", () => {
				this.focusedCategoryId = category.id;
			});

			input.addEventListener("input", () => {
				const value = Number.parseFloat(input.value) || 0;
				this.saveState();
				this.allocations.set(category.id, value);
				this.scheduleUpdate();
			});

			inputContainer.createSpan({ text: "hours", cls: cls("input-suffix") });

			const quickFillContainer = inputRow.createDiv({ cls: cls("quick-fill-container") });
			this.createQuickFillButtons(quickFillContainer, category.id, input);

			const percentageContainer = inputRow.createDiv({ cls: cls("percentage-container") });

			const percentageBarWrapper = percentageContainer.createDiv({ cls: cls("percentage-bar-wrapper draggable") });
			const percentageBar = percentageBarWrapper.createDiv({ cls: cls("percentage-bar") });
			percentageBar.style.width = `${Math.min(percentage, 100)}%`;
			percentageBar.style.backgroundColor = category.color;
			this.percentageBarRefs.set(category.id, percentageBar);

			this.setupBarDragHandlers(percentageBarWrapper, category.id);

			const percentageLabel = percentageContainer.createSpan({
				text: `${percentage.toFixed(1)}%`,
				cls: cls("percentage-label"),
			});
			this.percentageLabelRefs.set(category.id, percentageLabel);

			if (parentBudget) {
				const EPSILON = 0.01;
				if (parentBudget.allocated > parentBudget.total + EPSILON && parentBudget.total > 0) {
					addCls(item, "over-budget");
				}
			}
		}

		this.restoreScrollPosition();
		this.scrollToFocusedCategory();
	}

	private setupBarDragHandlers(barWrapper: HTMLElement, categoryId: string): void {
		const startDrag = (clientX: number) => {
			this.isDragging = true;
			this.dragCategoryId = categoryId;
			document.body.classList.add(cls("dragging"));
			this.saveState();

			const rect = barWrapper.getBoundingClientRect();
			const relativeX = Math.max(0, Math.min(clientX - rect.left, rect.width));
			const percentage = (relativeX / rect.width) * 100;
			const hours = roundHours((percentage / 100) * this.totalHoursAvailable);

			this.allocations.set(categoryId, hours);

			const input = this.inputRefs.get(categoryId);
			if (input) {
				input.value = hours > 0 ? String(hours) : "";
			}

			this.updateAllocationItemStates();
			this.renderSummary();
		};

		barWrapper.addEventListener("mousedown", (e) => {
			e.preventDefault();
			startDrag(e.clientX);
		});

		barWrapper.addEventListener("touchstart", (e) => {
			if (e.touches.length > 0) {
				e.preventDefault();
				startDrag(e.touches[0].clientX);
			}
		});
	}

	private createQuickFillButtons(container: HTMLElement, categoryId: string, input: HTMLInputElement): void {
		const presets = [
			{ label: "10%", value: 0.1 },
			{ label: "25%", value: 0.25 },
			{ label: "50%", value: 0.5 },
			{ label: "Max", value: "max" as const },
		];

		for (const preset of presets) {
			const btn = container.createEl("button", {
				text: preset.label,
				cls: cls("quick-fill-btn"),
			});

			btn.addEventListener("click", (e) => {
				e.preventDefault();
				this.saveState();
				const newValue = this.calculatePresetValue(preset.value, categoryId);
				this.applyValue(categoryId, newValue, input);
			});
		}

		const customContainer = container.createDiv({ cls: cls("custom-percentage-container") });
		const customInput = customContainer.createEl("input", {
			type: "number",
			cls: cls("custom-percentage-input"),
			placeholder: "%",
		});
		customInput.min = "0";
		customInput.max = "100";
		customInput.step = "1";

		const applyBtn = customContainer.createEl("button", {
			text: "Set",
			cls: cls("quick-fill-btn apply-btn"),
		});

		applyBtn.addEventListener("click", (e) => {
			e.preventDefault();
			this.saveState();
			const percentValue = Number.parseFloat(customInput.value) || 0;
			const clampedPercent = Math.max(0, Math.min(100, percentValue));
			const useParent = this.fillFromParent.get(categoryId) ?? false;
			const parentBudget = this.parentBudgets.get(categoryId);
			const baseAmount = useParent && parentBudget ? parentBudget.total : this.totalHoursAvailable;
			const newValue = roundHours((clampedPercent / 100) * baseAmount);
			this.applyValue(categoryId, newValue, input);
			customInput.value = "";
		});

		customInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				applyBtn.click();
			}
		});
	}

	private calculatePresetValue(preset: number | "max", categoryId: string): number {
		const useParent = this.fillFromParent.get(categoryId) ?? false;
		const parentBudget = this.parentBudgets.get(categoryId);
		const baseAmount = useParent && parentBudget ? parentBudget.total : this.totalHoursAvailable;

		if (preset === "max") {
			if (useParent && parentBudget) {
				return roundHours(parentBudget.remaining);
			}
			const currentForThis = this.allocations.get(categoryId) ?? 0;
			const otherAllocations = this.getTotalAllocated() - currentForThis;
			return Math.max(0, this.totalHoursAvailable - otherAllocations);
		}
		return roundHours(baseAmount * preset);
	}

	private applyValue(categoryId: string, value: number, input: HTMLInputElement): void {
		this.allocations.set(categoryId, value);
		input.value = value > 0 ? String(value) : "";
		this.focusedCategoryId = categoryId;
		this.updateViewsWithFocusPreservation();
	}

	private scheduleUpdate(): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = setTimeout(() => {
			this.updateViewsWithFocusPreservation();
		}, DEBOUNCE_MS);
	}

	private updateViewsWithFocusPreservation(): void {
		const focusedInput = this.focusedCategoryId ? this.inputRefs.get(this.focusedCategoryId) : null;
		const selectionStart = focusedInput?.selectionStart ?? null;
		const selectionEnd = focusedInput?.selectionEnd ?? null;

		this.saveScrollPosition();

		this.renderSummary();
		this.updateAllocationItemStates();

		this.restoreScrollPosition();

		if (this.focusedCategoryId) {
			const inputToFocus = this.inputRefs.get(this.focusedCategoryId);
			if (inputToFocus) {
				inputToFocus.focus();
				if (selectionStart !== null && selectionEnd !== null) {
					inputToFocus.setSelectionRange(selectionStart, selectionEnd);
				}
			}
		}
	}

	private updateAllocationItemStates(): void {
		if (!this.allocationListEl) return;

		const sortedCategories = sortCategoriesByName(this.categories);

		for (const category of sortedCategories) {
			const currentHours = this.allocations.get(category.id) ?? 0;
			const parentBudget = this.getReactiveParentBudget(category.id);
			const percentage = this.totalHoursAvailable > 0 ? (currentHours / this.totalHoursAvailable) * 100 : 0;
			const item = this.allocationListEl.querySelector(`[data-category-id="${category.id}"]`);

			if (!item) continue;

			const budgetInfoContainer = item.querySelector(`.${cls("budget-info-container")}`);
			if (budgetInfoContainer) {
				const parentBudgetInfo = budgetInfoContainer.querySelector(`.${cls("parent-budget-info")}`);
				if (parentBudgetInfo && parentBudget) {
					const EPSILON = 0.01;
					const isOver = parentBudget.allocated > parentBudget.total + EPSILON && parentBudget.total > 0;
					const parentPercentage = parentBudget.total > 0 ? (parentBudget.allocated / parentBudget.total) * 100 : 0;

					removeCls(parentBudgetInfo as HTMLElement, "over-budget");
					if (isOver) {
						addCls(parentBudgetInfo as HTMLElement, "over-budget");
						parentBudgetInfo.textContent = `⚠️ Parent: ${formatHours(parentBudget.allocated)}h / ${formatHours(parentBudget.total)}h (${parentPercentage.toFixed(1)}%)`;
					} else {
						parentBudgetInfo.textContent = `Parent: ${formatHours(parentBudget.allocated)}h / ${formatHours(parentBudget.total)}h (${parentPercentage.toFixed(1)}%)`;
					}
				}

				const childBudget = this.childBudgets.get(category.id);
				let childBudgetInfo = budgetInfoContainer.querySelector(`.${cls("child-budget-info")}`);
				if (childBudget) {
					const allocated = childBudget.allocated ?? 0;
					const total = childBudget.total ?? 0;
					const percentage = total > 0 ? (allocated / total) * 100 : 0;
					if (!childBudgetInfo) {
						childBudgetInfo = budgetInfoContainer.createSpan({ cls: cls("child-budget-info") });
					}
					childBudgetInfo.textContent = `Child allocated: ${formatHours(allocated)}h (${percentage.toFixed(1)}%)`;
				} else if (childBudgetInfo) {
					childBudgetInfo.remove();
				}
			}

			const percentageBar = this.percentageBarRefs.get(category.id);
			if (percentageBar) {
				percentageBar.style.width = `${Math.min(percentage, 100)}%`;
			}

			const percentageLabel = this.percentageLabelRefs.get(category.id);
			if (percentageLabel) {
				percentageLabel.textContent = `${percentage.toFixed(1)}%`;
			}

			removeCls(item as HTMLElement, "over-budget");
			if (parentBudget) {
				const EPSILON = 0.01;
				if (parentBudget.allocated > parentBudget.total + EPSILON && parentBudget.total > 0) {
					addCls(item as HTMLElement, "over-budget");
				}
			}
		}
	}

	private renderActions(): void {
		const actions = this.contentEl.createDiv({ cls: cls("allocation-actions") });

		const cancelBtn = actions.createEl("button", {
			text: "Cancel",
			cls: cls("action-btn"),
		});
		cancelBtn.addEventListener("click", () => {
			this.result = { allocations: [], cancelled: true };
			this.close();
		});

		const saveBtn = actions.createEl("button", {
			text: "Save allocations",
			cls: cls("action-btn primary"),
		});
		saveBtn.addEventListener("click", () => {
			this.result = {
				allocations: this.getAllocationsArray(),
				cancelled: false,
			};
			this.close();
		});
	}

	private getTotalAllocated(): number {
		let total = 0;
		for (const hours of this.allocations.values()) {
			total += hours;
		}
		return total;
	}

	/**
	 * Calculate reactive parent budget that includes current (unsaved) allocations.
	 * This shows how the parent budget would look if we saved right now.
	 */
	private getReactiveParentBudget(categoryId: string): CategoryBudgetInfo | undefined {
		const parentBudget = this.parentBudgets.get(categoryId);
		if (!parentBudget) return undefined;

		// Get the current allocation for this category in the modal
		const currentAllocation = this.allocations.get(categoryId) ?? 0;

		// Calculate the difference from what was originally allocated
		// We need to find the original allocation for this category
		const originalAllocation = this.getOriginalAllocation(categoryId);
		const allocationDelta = currentAllocation - originalAllocation;

		// Update the parent budget with the delta
		return {
			categoryId: parentBudget.categoryId,
			total: parentBudget.total,
			allocated: parentBudget.allocated + allocationDelta,
			remaining: parentBudget.remaining - allocationDelta,
		};
	}

	/**
	 * Get the original allocation (when modal opened) for a category.
	 * This is needed to calculate the delta for reactive parent budgets.
	 */
	private getOriginalAllocation(categoryId: string): number {
		// The first state in undo stack is the original state
		if (this.undoStack.length > 0) {
			const originalState = this.undoStack[0];
			return originalState.get(categoryId) ?? 0;
		}
		return this.allocations.get(categoryId) ?? 0;
	}

	private getAllocationsArray(): TimeAllocation[] {
		const allocations: TimeAllocation[] = [];
		for (const [categoryId, hours] of this.allocations) {
			if (hours > 0) {
				allocations.push({ categoryId, hours });
			}
		}
		return allocations;
	}

	private saveScrollPosition(): void {
		if (this.allocationListEl) {
			this.scrollPosition = this.allocationListEl.scrollTop;
		}
	}

	private restoreScrollPosition(): void {
		if (this.allocationListEl && this.scrollPosition > 0) {
			this.allocationListEl.scrollTop = this.scrollPosition;
		}
	}

	private scrollToFocusedCategory(): void {
		if (!this.focusedCategoryId || !this.allocationListEl) return;

		const item = this.allocationListEl.querySelector(`#allocation-item-${this.focusedCategoryId}`);
		if (item) {
			item.scrollIntoView({ behavior: "smooth", block: "nearest" });
		}
	}

	private saveState(): void {
		const snapshot = new Map<string, number>();
		for (const [key, value] of this.allocations) {
			snapshot.set(key, value);
		}
		this.undoStack.push(snapshot);
		this.redoStack = [];
		this.updateUndoRedoButtons();
	}

	private undo(): void {
		if (this.undoStack.length === 0) return;

		const currentState = new Map<string, number>();
		for (const [key, value] of this.allocations) {
			currentState.set(key, value);
		}
		this.redoStack.push(currentState);

		const previousState = this.undoStack.pop();
		if (previousState) {
			this.allocations.clear();
			for (const [key, value] of previousState) {
				this.allocations.set(key, value);
			}
			this.updateAllInputs();
			this.updateViewsWithFocusPreservation();
		}
		this.updateUndoRedoButtons();
	}

	private redo(): void {
		if (this.redoStack.length === 0) return;

		const currentState = new Map<string, number>();
		for (const [key, value] of this.allocations) {
			currentState.set(key, value);
		}
		this.undoStack.push(currentState);

		const nextState = this.redoStack.pop();
		if (nextState) {
			this.allocations.clear();
			for (const [key, value] of nextState) {
				this.allocations.set(key, value);
			}
			this.updateAllInputs();
			this.updateViewsWithFocusPreservation();
		}
		this.updateUndoRedoButtons();
	}

	private updateAllInputs(): void {
		for (const [categoryId, hours] of this.allocations) {
			const input = this.inputRefs.get(categoryId);
			if (input) {
				input.value = hours > 0 ? String(hours) : "";
			}
		}
	}

	private updateUndoRedoButtons(): void {
		if (this.undoButton) {
			this.undoButton.disabled = this.undoStack.length === 0;
		}
		if (this.redoButton) {
			this.redoButton.disabled = this.redoStack.length === 0;
		}
	}

	private applyFillFromParent(): void {
		if (this.parentBudgets.size === 0) {
			return;
		}

		const filledAllocations = fillAllocationsFromParent(this.parentBudgets, this.totalHoursAvailable);

		this.allocations.clear();

		for (const allocation of filledAllocations) {
			this.allocations.set(allocation.categoryId, allocation.hours);
		}

		this.updateAllInputs();
		this.updateViewsWithFocusPreservation();
	}

	private setupScopeHandlers(): void {
		// Undo: Ctrl/Cmd + Z
		this.scope.register(["Mod"], "z", (evt) => {
			if (!evt.shiftKey) {
				evt.preventDefault();
				this.undo();
				return false;
			}
		});

		// Redo: Ctrl/Cmd + Shift + Z
		this.scope.register(["Mod", "Shift"], "z", (evt) => {
			evt.preventDefault();
			this.redo();
			return false;
		});

		// Submit: Enter (when not in input)
		this.scope.register([], "Enter", (evt) => {
			const activeElement = document.activeElement as HTMLElement;
			const isInputFocused = activeElement?.tagName === "INPUT" && activeElement.getAttribute("type") !== "checkbox";

			if (isInputFocused) {
				// If in input, blur it first
				activeElement.blur();
				return false;
			}

			// If not in input, submit form
			evt.preventDefault();
			this.result = {
				allocations: this.getAllocationsArray(),
				cancelled: false,
			};
			this.close();
			return false;
		});
	}
}
