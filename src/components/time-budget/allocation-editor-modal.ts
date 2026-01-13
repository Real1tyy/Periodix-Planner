import { type App, Modal, Notice } from "obsidian";
import { getDefaultCategoryColor } from "src/utils/color-utils";
import { AllocationState } from "../../core/allocation-state";
import type { Category, TimeAllocation } from "../../types";
import { addCls, cls, removeCls, upsertElement } from "../../utils/css";
import {
	calculatePercentage,
	fillAllocationsFromParent,
	formatHours,
	roundHours,
	sortCategoriesByName,
} from "../../utils/time-budget-utils";
import { ActionButton } from "../shared/action-button";
import { HorizontalDragController } from "../shared/horizontal-drag-controller";
import type { CategoryBudgetInfo } from "./parent-budget-tracker";

const DEBOUNCE_MS = 300;
const BUDGET_EPSILON = 0.01;

interface AllocationEditorResult {
	allocations: TimeAllocation[];
	cancelled: boolean;
}

interface AllocationRowRefs {
	item: HTMLElement;
	input: HTMLInputElement;
	bar: HTMLElement;
	label: HTMLElement;
	barWrapper: HTMLElement;
	budgetInfoContainer: HTMLElement | null;
	parentBudgetInfo: HTMLElement | null;
	childBudgetInfo: HTMLElement | null;
}

export class AllocationEditorModal extends Modal {
	private state: AllocationState;
	private allocationListEl: HTMLElement | null = null;
	private result: AllocationEditorResult = { allocations: [], cancelled: true };
	private resolvePromise: ((result: AllocationEditorResult) => void) | null = null;
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;
	private focusedCategoryId: string | null = null;
	private scrollPosition = 0;
	private rowRefs = new Map<string, AllocationRowRefs>();
	private dragController: HorizontalDragController | null = null;
	private dragCategoryId: string | null = null;
	private undoButton: ActionButton | null = null;
	private redoButton: ActionButton | null = null;

	constructor(
		app: App,
		private categories: Category[],
		initialAllocations: TimeAllocation[],
		private totalHoursAvailable: number,
		private parentBudgets: Map<string, CategoryBudgetInfo>,
		private childBudgets: Map<string, CategoryBudgetInfo>
	) {
		super(app);
		this.state = new AllocationState(initialAllocations);
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
		this.rowRefs.clear();
		this.contentEl.empty();
	}

	private renderSummary(): void {
		const summary = upsertElement(this.contentEl, "div", cls("allocation-summary"), (el) => {
			el.empty();
		});

		const summaryControls = summary.createDiv({ cls: cls("summary-controls") });

		if (this.parentBudgets.size > 0) {
			const fillFromParentBtn = summaryControls.createEl("button", {
				text: "Fill parent",
				cls: cls("fill-from-parent-btn"),
			});
			fillFromParentBtn.addEventListener("click", () => {
				this.state.saveState();
				this.applyFillFromParent();
			});
		}

		this.undoButton = new ActionButton(
			summaryControls,
			"Undo",
			() => this.undo(),
			() => !this.state.canUndo()
		);

		const summaryStats = summaryControls.createDiv({ cls: cls("summary-stats") });

		const totalAllocated = this.getTotalAllocated();
		const remaining = this.totalHoursAvailable - totalAllocated;
		const allocatedPercentage = calculatePercentage(totalAllocated, this.totalHoursAvailable);
		const remainingPercentage = calculatePercentage(remaining, this.totalHoursAvailable);

		const allocatedItem = summaryStats.createDiv({ cls: cls("summary-item") });
		allocatedItem.createSpan({ text: "Allocated:", cls: cls("summary-label") });
		const allocatedValue = allocatedItem.createSpan({
			text: `${formatHours(totalAllocated)}h (${allocatedPercentage.toFixed(1)}%)`,
			cls: cls("summary-value"),
		});

		const statusClass = allocatedPercentage > 100 ? "over" : allocatedPercentage >= 80 ? "warning" : "under";
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

		this.redoButton = new ActionButton(
			summaryControls,
			"Redo",
			() => this.redo(),
			() => !this.state.canRedo()
		);
	}

	private renderAllocationList(): void {
		this.allocationListEl = this.contentEl.createDiv({ cls: cls("allocation-list") });
		this.saveScrollPosition();

		this.allocationListEl.empty();
		this.rowRefs.clear();

		const sortedCategories = sortCategoriesByName(this.categories);

		for (const category of sortedCategories) {
			const currentHours = this.state.allocations.get(category.name) ?? 0;
			const parentBudget = this.getReactiveParentBudget(category.name);
			const percentage = calculatePercentage(currentHours, this.totalHoursAvailable);

			const item = this.allocationListEl.createDiv({ cls: cls("allocation-item") });
			item.dataset.categoryId = category.name;
			item.id = `allocation-item-${category.name}`;

			const topRow = item.createDiv({ cls: cls("allocation-top-row") });

			const colorDot = topRow.createSpan({ cls: cls("category-color-dot-large") });
			colorDot.style.backgroundColor = category.color;

			topRow.createSpan({ text: category.name, cls: cls("category-name") });

			const budgetInfoContainer = topRow.createDiv({ cls: cls("budget-info-container") });
			let parentBudgetInfo: HTMLElement | null = null;
			let childBudgetInfo: HTMLElement | null = null;

			if (parentBudget) {
				parentBudgetInfo = budgetInfoContainer.createSpan({ cls: cls("parent-budget-info") });
				const isOver = parentBudget.allocated > parentBudget.total + BUDGET_EPSILON && parentBudget.total > 0;
				const parentPercentage = calculatePercentage(parentBudget.allocated, parentBudget.total);

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
				checkbox.checked = this.state.fillFromParent.get(category.name) ?? false;
				checkbox.addEventListener("change", () => {
					this.state.fillFromParent.set(category.name, checkbox.checked);
				});

				const checkboxLabel = checkboxContainer.createSpan({
					text: "Fill from parent",
					cls: cls("fill-from-parent-label"),
				});
				checkboxLabel.addEventListener("click", () => {
					checkbox.checked = !checkbox.checked;
					this.state.fillFromParent.set(category.name, checkbox.checked);
				});
			}

			const childBudget = this.childBudgets.get(category.name);
			if (childBudget) {
				const allocated = childBudget.allocated ?? 0;
				const total = childBudget.total ?? 0;
				const percentage = calculatePercentage(allocated, total);
				childBudgetInfo = budgetInfoContainer.createSpan({ cls: cls("child-budget-info") });
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
			input.dataset.categoryId = category.name;

			input.addEventListener("focus", () => {
				this.focusedCategoryId = category.name;
			});

			input.addEventListener("input", () => {
				const value = Number.parseFloat(input.value) || 0;
				this.state.saveState();
				this.state.allocations.set(category.name, value);
				this.scheduleUpdate();
			});

			inputContainer.createSpan({ text: "hours", cls: cls("input-suffix") });

			const quickFillContainer = inputRow.createDiv({ cls: cls("quick-fill-container") });
			this.createQuickFillButtons(quickFillContainer, category.name, input);

			const percentageContainer = inputRow.createDiv({ cls: cls("percentage-container") });

			const percentageBarWrapper = percentageContainer.createDiv({ cls: cls("percentage-bar-wrapper draggable") });
			const percentageBar = percentageBarWrapper.createDiv({ cls: cls("percentage-bar") });
			percentageBar.style.width = `${Math.min(percentage, 100)}%`;
			percentageBar.style.backgroundColor = category.color;

			this.setupBarDragHandlers(percentageBarWrapper, category.name);

			const percentageLabel = percentageContainer.createSpan({
				text: `${percentage.toFixed(1)}%`,
				cls: cls("percentage-label"),
			});

			if (parentBudget) {
				if (parentBudget.allocated > parentBudget.total + BUDGET_EPSILON && parentBudget.total > 0) {
					addCls(item, "over-budget");
				}
			}

			this.rowRefs.set(category.name, {
				item,
				input,
				bar: percentageBar,
				label: percentageLabel,
				barWrapper: percentageBarWrapper,
				budgetInfoContainer: parentBudget || childBudget ? budgetInfoContainer : null,
				parentBudgetInfo,
				childBudgetInfo,
			});
		}

		this.restoreScrollPosition();
		this.scrollToFocusedCategory();
	}

	private renderActions(): void {
		const actions = this.contentEl.createDiv({ cls: cls("allocation-actions") });

		// Left side: Create new category
		const leftActions = actions.createDiv({ cls: cls("allocation-actions-left") });
		const createCategoryBtn = leftActions.createEl("button", {
			text: "+ Create new category",
			cls: cls("action-btn", "create-category-btn"),
		});
		createCategoryBtn.addEventListener("click", () => {
			this.showCreateCategoryInput();
		});

		// Right side: Cancel and Save
		const rightActions = actions.createDiv({ cls: cls("allocation-actions-right") });
		const cancelBtn = rightActions.createEl("button", {
			text: "Cancel",
			cls: cls("action-btn"),
		});
		cancelBtn.addEventListener("click", () => {
			this.result = { allocations: [], cancelled: true };
			this.close();
		});

		const saveBtn = rightActions.createEl("button", {
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

	private setupGlobalDragListeners(): void {
		this.dragController = new HorizontalDragController(
			(clientX) => this.handleDragMove(clientX),
			() => this.endDrag()
		);
		this.dragController.bind(this.contentEl);
	}

	private handleDragMove(clientX: number): void {
		if (!this.dragCategoryId) return;

		const refs = this.rowRefs.get(this.dragCategoryId);
		if (!refs) return;

		const rect = refs.barWrapper.getBoundingClientRect();
		const relativeX = Math.max(0, Math.min(clientX - rect.left, rect.width));
		const percentage = (relativeX / rect.width) * 100;
		const hours = Math.round((percentage / 100) * this.totalHoursAvailable * 10) / 10;

		this.state.allocations.set(this.dragCategoryId, hours);
		refs.input.value = hours > 0 ? String(hours) : "";

		this.updateAllocationItemStates();
		this.renderSummary();
	}

	private endDrag(): void {
		this.dragCategoryId = null;
		document.body.classList.remove(cls("dragging"));
	}

	private setupBarDragHandlers(barWrapper: HTMLElement, categoryId: string): void {
		const startDrag = (clientX: number) => {
			this.dragCategoryId = categoryId;
			document.body.classList.add(cls("dragging"));
			this.state.saveState();

			const rect = barWrapper.getBoundingClientRect();
			const relativeX = Math.max(0, Math.min(clientX - rect.left, rect.width));
			const percentage = (relativeX / rect.width) * 100;
			const hours = roundHours((percentage / 100) * this.totalHoursAvailable);

			this.state.allocations.set(categoryId, hours);

			const refs = this.rowRefs.get(categoryId);
			if (refs) {
				refs.input.value = hours > 0 ? String(hours) : "";
			}

			this.updateAllocationItemStates();
			this.renderSummary();

			this.dragController?.start();
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
				this.state.saveState();
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
			this.state.saveState();
			const percentValue = Number.parseFloat(customInput.value) || 0;
			const clampedPercent = Math.max(0, Math.min(100, percentValue));
			const useParent = this.state.fillFromParent.get(categoryId) ?? false;
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
		const useParent = this.state.fillFromParent.get(categoryId) ?? false;
		const parentBudget = this.parentBudgets.get(categoryId);
		const baseAmount = useParent && parentBudget ? parentBudget.total : this.totalHoursAvailable;

		if (preset === "max") {
			if (useParent && parentBudget) {
				return roundHours(parentBudget.remaining);
			}
			const currentForThis = this.state.allocations.get(categoryId) ?? 0;
			const otherAllocations = this.getTotalAllocated() - currentForThis;
			return Math.max(0, this.totalHoursAvailable - otherAllocations);
		}
		return roundHours(baseAmount * preset);
	}

	private applyValue(categoryId: string, value: number, input: HTMLInputElement): void {
		this.state.allocations.set(categoryId, value);
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
		const focusedRefs = this.focusedCategoryId ? this.rowRefs.get(this.focusedCategoryId) : null;
		const selectionStart = focusedRefs?.input.selectionStart ?? null;
		const selectionEnd = focusedRefs?.input.selectionEnd ?? null;

		this.saveScrollPosition();

		this.renderSummary();
		this.updateAllocationItemStates();

		this.restoreScrollPosition();

		if (this.focusedCategoryId && focusedRefs) {
			focusedRefs.input.focus();
			if (selectionStart !== null && selectionEnd !== null) {
				focusedRefs.input.setSelectionRange(selectionStart, selectionEnd);
			}
		}
	}

	private updateAllocationItemStates(): void {
		const sortedCategories = sortCategoriesByName(this.categories);

		for (const category of sortedCategories) {
			const refs = this.rowRefs.get(category.name);
			if (!refs) continue;

			const currentHours = this.state.allocations.get(category.name) ?? 0;
			const parentBudget = this.getReactiveParentBudget(category.name);
			const percentage = calculatePercentage(currentHours, this.totalHoursAvailable);

			if (refs.budgetInfoContainer) {
				if (refs.parentBudgetInfo && parentBudget) {
					const isOver = parentBudget.allocated > parentBudget.total + BUDGET_EPSILON && parentBudget.total > 0;
					const parentPercentage = calculatePercentage(parentBudget.allocated, parentBudget.total);

					removeCls(refs.parentBudgetInfo, "over-budget");
					if (isOver) {
						addCls(refs.parentBudgetInfo, "over-budget");
						refs.parentBudgetInfo.textContent = `⚠️ Parent: ${formatHours(parentBudget.allocated)}h / ${formatHours(parentBudget.total)}h (${parentPercentage.toFixed(1)}%)`;
					} else {
						refs.parentBudgetInfo.textContent = `Parent: ${formatHours(parentBudget.allocated)}h / ${formatHours(parentBudget.total)}h (${parentPercentage.toFixed(1)}%)`;
					}
				}

				const childBudget = this.childBudgets.get(category.name);
				if (childBudget) {
					const allocated = childBudget.allocated ?? 0;
					const total = childBudget.total ?? 0;
					const percentage = calculatePercentage(allocated, total);
					if (!refs.childBudgetInfo) {
						refs.childBudgetInfo = refs.budgetInfoContainer.createSpan({ cls: cls("child-budget-info") });
					}
					refs.childBudgetInfo.textContent = `Child allocated: ${formatHours(allocated)}h (${percentage.toFixed(1)}%)`;
				} else if (refs.childBudgetInfo) {
					refs.childBudgetInfo.remove();
					refs.childBudgetInfo = null;
				}
			}

			refs.bar.style.width = `${Math.min(percentage, 100)}%`;
			refs.label.textContent = `${percentage.toFixed(1)}%`;

			removeCls(refs.item, "over-budget");
			if (parentBudget) {
				if (parentBudget.allocated > parentBudget.total + BUDGET_EPSILON && parentBudget.total > 0) {
					addCls(refs.item, "over-budget");
				}
			}
		}
	}

	private showCreateCategoryInput(): void {
		const existingInput = this.contentEl.querySelector<HTMLInputElement>(
			`.${cls("create-category-input-wrapper")} input`
		);
		if (existingInput) {
			existingInput.focus();
			return;
		}

		const inputWrapper = upsertElement(this.contentEl, "div", cls("create-category-input-wrapper"), (el) => {
			el.empty();
		});

		const actionsEl = this.contentEl.querySelector(`.${cls("allocation-actions")}`);
		if (actionsEl && this.allocationListEl && inputWrapper.parentElement !== this.contentEl) {
			this.contentEl.insertBefore(inputWrapper, actionsEl);
		}

		const inputContainer = inputWrapper.createDiv({ cls: cls("create-category-input-container") });

		const input = inputContainer.createEl("input", {
			type: "text",
			placeholder: "Enter category name...",
			cls: cls("create-category-input"),
		});

		const buttonGroup = inputContainer.createDiv({ cls: cls("create-category-buttons") });

		const confirmBtn = buttonGroup.createEl("button", {
			text: "Add",
			cls: cls("action-btn primary small"),
		});

		const cancelBtn = buttonGroup.createEl("button", {
			text: "Cancel",
			cls: cls("action-btn small"),
		});

		// Focus input
		input.focus();

		// Confirm handler
		const handleConfirm = () => {
			const categoryName = input.value.trim();
			if (categoryName) {
				inputWrapper.remove();
				this.createNewCategory(categoryName);
			}
		};

		// Cancel handler
		const handleCancel = () => {
			inputWrapper.remove();
		};

		confirmBtn.addEventListener("click", handleConfirm);
		cancelBtn.addEventListener("click", handleCancel);

		// Enter to confirm, Escape to cancel
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				handleConfirm();
			} else if (e.key === "Escape") {
				e.preventDefault();
				handleCancel();
			}
		});
	}

	private createNewCategory(categoryName: string): void {
		if (this.state.allocations.has(categoryName)) {
			new Notice(`Category "${categoryName}" already exists`);
			this.focusedCategoryId = categoryName;
			this.updateViewsWithFocusPreservation();
			return;
		}

		// Save current state for undo
		this.state.saveState();

		this.state.allocations.set(categoryName, 0);

		const categoryIndex = this.categories.length;
		const defaultColor = getDefaultCategoryColor(categoryIndex);
		this.categories.push({
			name: categoryName,
			color: defaultColor,
		});

		this.focusedCategoryId = categoryName;

		this.saveScrollPosition();
		this.renderAllocationList();
		this.renderSummary();
		this.restoreScrollPosition();
		this.scrollToFocusedCategory();

		new Notice(`Category "${categoryName}" added`);
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

	private getTotalAllocated(): number {
		return Array.from(this.state.allocations.values()).reduce((total, hours) => total + hours, 0);
	}

	/**
	 * Calculate reactive parent budget that includes current (unsaved) allocations.
	 * This shows how the parent budget would look if we saved right now.
	 */
	private getReactiveParentBudget(categoryName: string): CategoryBudgetInfo | undefined {
		const parentBudget = this.parentBudgets.get(categoryName);
		if (!parentBudget) return undefined;

		const currentAllocation = this.state.allocations.get(categoryName) ?? 0;

		const originalAllocation = this.state.getOriginalAllocation(categoryName);
		const allocationDelta = currentAllocation - originalAllocation;

		return {
			categoryName: parentBudget.categoryName,
			total: parentBudget.total,
			allocated: parentBudget.allocated + allocationDelta,
			remaining: parentBudget.remaining - allocationDelta,
		};
	}

	private getAllocationsArray(): TimeAllocation[] {
		const allocations: TimeAllocation[] = [];
		for (const [categoryName, hours] of this.state.allocations) {
			if (hours > 0) {
				allocations.push({ categoryName, hours });
			}
		}
		return allocations;
	}

	private saveScrollPosition(): void {
		this.scrollPosition = this.allocationListEl?.scrollTop ?? 0;
	}

	private restoreScrollPosition(): void {
		if (this.allocationListEl && this.scrollPosition > 0) {
			this.allocationListEl.scrollTop = this.scrollPosition;
		}
	}

	private scrollToFocusedCategory(): void {
		if (!this.focusedCategoryId) return;

		const refs = this.rowRefs.get(this.focusedCategoryId);
		if (refs) {
			refs.item.scrollIntoView({ behavior: "smooth", block: "nearest" });
		}
	}

	private executeHistoryOperation(operation: () => Map<string, number> | null): void {
		const state = operation();
		if (state) {
			this.updateAllInputs();
			this.updateViewsWithFocusPreservation();
		}
		this.undoButton?.update();
		this.redoButton?.update();
	}

	private undo(): void {
		this.executeHistoryOperation(() => this.state.undo());
	}

	private redo(): void {
		this.executeHistoryOperation(() => this.state.redo());
	}

	private updateAllInputs(): void {
		for (const [categoryName, hours] of this.state.allocations) {
			const refs = this.rowRefs.get(categoryName);
			if (refs) {
				refs.input.value = hours > 0 ? String(hours) : "";
			}
		}
	}

	private applyFillFromParent(): void {
		if (this.parentBudgets.size === 0) {
			return;
		}

		const filledAllocations = fillAllocationsFromParent(this.parentBudgets, this.totalHoursAvailable);

		this.state.allocations.clear();

		for (const allocation of filledAllocations) {
			this.state.allocations.set(allocation.categoryName, allocation.hours);
		}

		this.updateAllInputs();
		this.updateViewsWithFocusPreservation();
	}
}
