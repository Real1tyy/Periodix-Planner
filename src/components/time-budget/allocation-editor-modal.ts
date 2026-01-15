import { type App, Modal, Notice } from "obsidian";
import type { PeriodType } from "src/constants";
import { getDefaultCategoryColor } from "src/utils/color-utils";
import { AllocationState } from "../../core/allocation-state";
import type { Category, PeriodicPlannerSettings, TimeAllocation } from "../../types";
import { addCls, cls, removeCls, setCssVar, upsertElement } from "../../utils/css";
import {
	calculatePercentage,
	fillAllocationsFromParent,
	formatBudgetDisplay,
	formatHours,
	formatHoursWithPercentage,
	formatInputValue,
	roundHours,
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
	private scrollPosition = 0;
	private rowRefs = new Map<string, AllocationRowRefs>();
	private dragController: HorizontalDragController | null = null;
	private dragCategoryId: string | null = null;
	private undoButton: ActionButton | null = null;
	private redoButton: ActionButton | null = null;
	private typingInputs = new Set<string>();
	private typingStartValues = new Map<string, number>();
	private summaryAllocatedValue: HTMLElement | null = null;
	private summaryRemainingValue: HTMLElement | null = null;
	private hideUnusedCategories: boolean;

	constructor(
		app: App,
		private categories: Category[],
		initialAllocations: TimeAllocation[],
		private totalHoursAvailable: number,
		private parentBudgets: Map<string, CategoryBudgetInfo>,
		private childBudgets: Map<string, CategoryBudgetInfo>,
		private periodType: PeriodType,
		private settings: PeriodicPlannerSettings
	) {
		super(app);
		this.state = new AllocationState(initialAllocations);
		this.state.saveState();
		this.hideUnusedCategories = this.shouldHideUnusedByDefault();
	}

	async openAndWait(): Promise<AllocationEditorResult> {
		return new Promise((resolve) => {
			this.resolvePromise = resolve;
			this.open();
		});
	}

	private shouldHideUnusedByDefault(): boolean {
		if (this.periodType === "yearly") {
			return false;
		}
		return this.settings.timeBudget.hideUnusedCategoriesInEditor;
	}

	private shouldShowHideUnusedCheckbox(): boolean {
		return this.periodType !== "yearly";
	}

	private shouldShowCategory(categoryName: string): boolean {
		if (!this.hideUnusedCategories) {
			return true;
		}

		const currentAllocation = this.state.allocations.get(categoryName) ?? 0;
		const parentBudget = this.parentBudgets.get(categoryName);
		if (currentAllocation > 0 || (parentBudget && parentBudget.total > 0)) {
			return true;
		}
		return false;
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
		this.commitAllTypingInputs();
		if (this.resolvePromise) {
			this.resolvePromise(this.result);
		}
		this.rowRefs.clear();
		this.contentEl.empty();
	}

	/**
	 * Updates parent and child budget data with new values.
	 * Called by TimeBudgetBlock when related notes change.
	 */
	updateBudgets(parentBudgets: Map<string, CategoryBudgetInfo>, childBudgets: Map<string, CategoryBudgetInfo>): void {
		this.parentBudgets = parentBudgets;
		this.childBudgets = childBudgets;

		this.renderAllocationList();
	}

	private renderSummary(): void {
		this.renderSummaryShell();
		this.updateSummaryValues();
	}

	private renderSummaryShell(): void {
		const summary = upsertElement(this.contentEl, "div", cls("allocation-summary"), (el) => {
			el.empty();
		});

		const summaryControls = summary.createDiv({ cls: cls("summary-controls") });

		this.undoButton = new ActionButton(
			summaryControls,
			"Undo",
			() => this.undo(),
			() => !this.state.canUndo()
		);

		const summaryStats = summaryControls.createDiv({ cls: cls("summary-stats") });

		const allocatedItem = summaryStats.createDiv({ cls: cls("summary-item") });
		allocatedItem.createSpan({ text: "Allocated:", cls: cls("summary-label") });
		this.summaryAllocatedValue = allocatedItem.createSpan({
			cls: cls("summary-value"),
		});

		const remainingItem = summaryStats.createDiv({ cls: cls("summary-item") });
		remainingItem.createSpan({ text: "Remaining:", cls: cls("summary-label") });
		this.summaryRemainingValue = remainingItem.createSpan({
			cls: cls("summary-value"),
		});

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

		const hasParentBudgets = this.parentBudgets.size > 0;
		const shouldShowHideUnused = this.shouldShowHideUnusedCheckbox();

		if (hasParentBudgets || shouldShowHideUnused) {
			const secondaryControls = summary.createDiv({ cls: cls("summary-secondary-controls") });

			if (hasParentBudgets) {
				const fillFromParentBtn = secondaryControls.createEl("button", {
					text: "Fill parent",
					cls: cls("fill-from-parent-btn"),
				});
				fillFromParentBtn.addEventListener("click", () => {
					this.applyFillFromParent();
					this.state.saveState();
					this.updateHistoryButtons();
				});
			}

			if (shouldShowHideUnused) {
				const hideUnusedContainer = secondaryControls.createDiv({ cls: cls("hide-unused-container") });

				const hideUnusedCheckbox = hideUnusedContainer.createEl("input", {
					type: "checkbox",
					cls: cls("hide-unused-checkbox"),
				});
				hideUnusedCheckbox.checked = this.hideUnusedCategories;
				hideUnusedCheckbox.addEventListener("change", () => {
					this.hideUnusedCategories = hideUnusedCheckbox.checked;
					this.reRenderAllocationList();
				});

				const hideUnusedLabel = hideUnusedContainer.createSpan({
					text: "Hide unused",
					cls: cls("hide-unused-label"),
				});
				hideUnusedLabel.addEventListener("click", () => {
					hideUnusedCheckbox.checked = !hideUnusedCheckbox.checked;
					this.hideUnusedCategories = hideUnusedCheckbox.checked;
					this.reRenderAllocationList();
				});
			}
		}
	}

	private updateSummaryValues(): void {
		if (!this.summaryAllocatedValue || !this.summaryRemainingValue) {
			return;
		}

		const totalAllocated = this.getTotalAllocated();
		const remaining = this.totalHoursAvailable - totalAllocated;
		const allocatedPercentage = calculatePercentage(totalAllocated, this.totalHoursAvailable);
		const remainingPercentage = calculatePercentage(remaining, this.totalHoursAvailable);

		this.summaryAllocatedValue.textContent = formatHoursWithPercentage(totalAllocated, allocatedPercentage);
		const statusClass = allocatedPercentage > 100 ? "over" : allocatedPercentage >= 80 ? "warning" : "under";
		removeCls(this.summaryAllocatedValue, "status-over", "status-warning", "status-under");
		addCls(this.summaryAllocatedValue, `status-${statusClass}`);

		this.summaryRemainingValue.textContent = formatHoursWithPercentage(remaining, remainingPercentage);
		if (remaining < 0) {
			addCls(this.summaryRemainingValue, "status-over");
		} else {
			removeCls(this.summaryRemainingValue, "status-over");
		}
	}

	private renderAllocationList(): void {
		this.saveScrollPosition();

		if (!this.allocationListEl) {
			this.allocationListEl = this.contentEl.createDiv({ cls: cls("allocation-list") });
		}

		this.allocationListEl.empty();
		this.rowRefs.clear();

		const allCategoryNames = new Set([
			...this.categories.map((c) => c.name),
			...Array.from(this.state.allocations.keys()),
		]);

		const sortedCategoryNames = Array.from(allCategoryNames)
			.filter((name) => this.shouldShowCategory(name))
			.sort((a, b) => a.localeCompare(b));

		for (const categoryName of sortedCategoryNames) {
			const category = this.categories.find((c) => c.name === categoryName) ?? {
				name: categoryName,
				color: getDefaultCategoryColor(this.categories.length),
			};
			const currentHours = this.state.allocations.get(categoryName) ?? 0;
			const parentBudget = this.getReactiveParentBudget(categoryName);
			const percentage = calculatePercentage(currentHours, this.totalHoursAvailable);

			const item = this.allocationListEl.createDiv({ cls: cls("allocation-item") });
			item.dataset.categoryId = categoryName;
			item.id = `allocation-item-${categoryName}`;

			const topRow = item.createDiv({ cls: cls("allocation-top-row") });

			const colorDot = topRow.createSpan({ cls: cls("category-color-dot-large") });
			setCssVar(colorDot, "category-color", category.color);

			topRow.createSpan({ text: categoryName, cls: cls("category-name") });

			const budgetInfoContainer = topRow.createDiv({ cls: cls("budget-info-container") });
			const parentBudgetInfo = parentBudget
				? this.setupParentBudget(topRow, budgetInfoContainer, categoryName, parentBudget)
				: null;
			const childBudgetInfo = this.setupChildBudget(budgetInfoContainer, categoryName);

			if (!parentBudget && !childBudgetInfo) {
				budgetInfoContainer.remove();
			}

			const inputRow = item.createDiv({ cls: cls("allocation-input-row") });

			const inputContainer = inputRow.createDiv({ cls: cls("allocation-input-container") });

			const input = inputContainer.createEl("input", {
				type: "number",
				cls: cls("allocation-input"),
				value: formatInputValue(currentHours),
			});
			input.min = "0";
			input.step = "0.001";
			input.dataset.categoryId = categoryName;

			input.addEventListener("focus", () => {
				if (!this.typingInputs.has(categoryName)) {
					this.typingInputs.add(categoryName);
					this.typingStartValues.set(categoryName, this.state.allocations.get(categoryName) ?? 0);
				}
			});

			input.addEventListener("blur", () => {
				if (this.debounceTimer) {
					clearTimeout(this.debounceTimer);
					this.debounceTimer = null;
				}
				if (this.typingInputs.has(categoryName)) {
					const value = Number.parseFloat(input.value) || 0;
					this.state.allocations.set(categoryName, value);
					this.typingInputs.delete(categoryName);

					const startValue = this.typingStartValues.get(categoryName) ?? 0;
					this.typingStartValues.delete(categoryName);

					if (value !== startValue) {
						this.state.saveState();
						this.updateHistoryButtons();
					}

					input.value = formatInputValue(this.state.allocations.get(categoryName) ?? 0);
					this.scheduleUpdate();
				}
			});

			input.addEventListener("input", () => {
				const value = Number.parseFloat(input.value) || 0;
				this.state.allocations.set(categoryName, value);
				this.scheduleUpdate();
			});

			inputContainer.createSpan({ text: "hours", cls: cls("input-suffix") });

			const quickFillContainer = inputRow.createDiv({ cls: cls("quick-fill-container") });
			this.createQuickFillButtons(quickFillContainer, categoryName, input);

			const percentageContainer = inputRow.createDiv({ cls: cls("percentage-container") });

			const percentageBarWrapper = percentageContainer.createDiv({ cls: cls("percentage-bar-wrapper draggable") });
			const percentageBar = percentageBarWrapper.createDiv({ cls: cls("percentage-bar") });
			setCssVar(percentageBar, "percentage-width", `${Math.min(percentage, 100)}%`);
			setCssVar(percentageBar, "category-color", category.color);

			this.setupBarDragHandlers(percentageBarWrapper, categoryName);

			const percentageLabel = percentageContainer.createSpan({
				text: `${percentage.toFixed(1)}%`,
				cls: cls("percentage-label"),
			});

			if (parentBudget) {
				if (parentBudget.allocated > parentBudget.total + BUDGET_EPSILON && parentBudget.total > 0) {
					addCls(item, "over-budget");
				}
			}

			this.rowRefs.set(categoryName, {
				item,
				input,
				bar: percentageBar,
				label: percentageLabel,
				barWrapper: percentageBarWrapper,
				budgetInfoContainer: parentBudget || childBudgetInfo ? budgetInfoContainer : null,
				parentBudgetInfo,
				childBudgetInfo,
			});
		}

		this.restoreScrollPosition();
	}

	private setupParentBudget(
		topRow: HTMLElement,
		budgetInfoContainer: HTMLElement,
		categoryName: string,
		parentBudget: CategoryBudgetInfo
	): HTMLElement {
		const parentBudgetInfo = budgetInfoContainer.createSpan({ cls: cls("parent-budget-info") });
		const isOver = parentBudget.allocated > parentBudget.total + BUDGET_EPSILON && parentBudget.total > 0;
		const parentPercentage = calculatePercentage(parentBudget.allocated, parentBudget.total);

		if (isOver) {
			addCls(parentBudgetInfo, "over-budget");
			parentBudgetInfo.setText(
				`⚠️ Parent: ${formatBudgetDisplay(parentBudget.allocated, parentBudget.total, parentPercentage)}`
			);
		} else {
			parentBudgetInfo.setText(
				`Parent: ${formatBudgetDisplay(parentBudget.allocated, parentBudget.total, parentPercentage)}`
			);
		}

		const checkboxContainer = topRow.createDiv({ cls: cls("fill-from-parent-container") });

		const checkbox = checkboxContainer.createEl("input", {
			type: "checkbox",
			cls: cls("fill-from-parent-checkbox"),
		});
		checkbox.checked = this.state.fillFromParent.get(categoryName) ?? false;
		checkbox.addEventListener("change", () => {
			this.state.fillFromParent.set(categoryName, checkbox.checked);
		});

		const checkboxLabel = checkboxContainer.createSpan({
			text: "Fill from parent",
			cls: cls("fill-from-parent-label"),
		});
		checkboxLabel.addEventListener("click", () => {
			checkbox.checked = !checkbox.checked;
			this.state.fillFromParent.set(categoryName, checkbox.checked);
		});

		return parentBudgetInfo;
	}

	private setupChildBudget(budgetInfoContainer: HTMLElement, categoryName: string): HTMLElement | null {
		const childBudget = this.childBudgets.get(categoryName);
		if (!childBudget) {
			return null;
		}

		const allocated = childBudget.allocated ?? 0;
		const total = childBudget.total ?? 0;
		const percentage = calculatePercentage(allocated, total);
		const childBudgetInfo = budgetInfoContainer.createSpan({ cls: cls("child-budget-info") });
		childBudgetInfo.setText(`Child allocated: ${formatHoursWithPercentage(allocated, percentage)}`);

		return childBudgetInfo;
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
			this.commitAllTypingInputs();
			this.result = { allocations: [], cancelled: true };
			this.close();
		});

		const saveBtn = rightActions.createEl("button", {
			text: "Save allocations",
			cls: cls("action-btn primary"),
		});
		saveBtn.addEventListener("click", () => {
			this.commitAllTypingInputs();
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
		const hours = Math.max(0, roundHours((percentage / 100) * this.totalHoursAvailable));

		if (!Number.isNaN(hours)) {
			this.state.allocations.set(this.dragCategoryId, hours);
			refs.input.value = formatInputValue(hours);

			this.updateAllocationItemStates();
			this.updateSummaryValues();
		}
	}

	private endDrag(): void {
		this.dragCategoryId = null;
		document.body.classList.remove(cls("dragging"));
		this.state.saveState();
		this.updateHistoryButtons();
	}

	private setupBarDragHandlers(barWrapper: HTMLElement, categoryId: string): void {
		const startDrag = (clientX: number) => {
			this.dragCategoryId = categoryId;
			document.body.classList.add(cls("dragging"));

			const rect = barWrapper.getBoundingClientRect();
			const relativeX = Math.max(0, Math.min(clientX - rect.left, rect.width));
			const percentage = (relativeX / rect.width) * 100;
			const hours = roundHours((percentage / 100) * this.totalHoursAvailable);

			this.state.allocations.set(categoryId, hours);

			const refs = this.rowRefs.get(categoryId);
			if (refs) {
				refs.input.value = formatInputValue(hours);
			}

			this.updateAllocationItemStates();
			this.updateSummaryValues();

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
				const oldValue = this.state.allocations.get(categoryId) ?? 0;
				const newValue = this.calculatePresetValue(preset.value, categoryId);

				if (newValue !== oldValue) {
					this.applyValue(categoryId, newValue, input);
					this.state.saveState();
					this.updateHistoryButtons();
				}
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
			const percentValue = Number.parseFloat(customInput.value) || 0;
			const clampedPercent = Math.max(0, Math.min(100, percentValue));
			const useParent = this.state.fillFromParent.get(categoryId) ?? false;
			const parentBudget = this.parentBudgets.get(categoryId);
			const baseAmount = useParent && parentBudget ? parentBudget.total : this.totalHoursAvailable;
			const newValue = roundHours((clampedPercent / 100) * baseAmount);
			const oldValue = this.state.allocations.get(categoryId) ?? 0;

			if (newValue !== oldValue) {
				this.applyValue(categoryId, newValue, input);
				this.state.saveState();
				this.updateHistoryButtons();
			}

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
		input.value = formatInputValue(value);
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
		this.saveScrollPosition();

		this.updateSummaryValues();
		this.updateAllocationItemStates();

		this.restoreScrollPosition();
	}

	private updateAllocationItemStates(): void {
		const allCategoryNames = new Set([
			...this.categories.map((c) => c.name),
			...Array.from(this.state.allocations.keys()),
		]);

		for (const categoryName of allCategoryNames) {
			const refs = this.rowRefs.get(categoryName);
			if (!refs) continue;

			const currentHours = this.state.allocations.get(categoryName) ?? 0;
			const parentBudget = this.getReactiveParentBudget(categoryName);
			const percentage = calculatePercentage(currentHours, this.totalHoursAvailable);

			if (refs.budgetInfoContainer) {
				if (refs.parentBudgetInfo && parentBudget) {
					const isOver = parentBudget.allocated > parentBudget.total + BUDGET_EPSILON && parentBudget.total > 0;
					const parentPercentage = calculatePercentage(parentBudget.allocated, parentBudget.total);

					removeCls(refs.parentBudgetInfo, "over-budget");
					if (isOver) {
						addCls(refs.parentBudgetInfo, "over-budget");
						refs.parentBudgetInfo.textContent = `⚠️ Parent: ${formatBudgetDisplay(parentBudget.allocated, parentBudget.total, parentPercentage)}`;
					} else {
						refs.parentBudgetInfo.textContent = `Parent: ${formatBudgetDisplay(parentBudget.allocated, parentBudget.total, parentPercentage)}`;
					}
				}

				const childBudget = this.childBudgets.get(categoryName);
				if (childBudget) {
					const allocated = childBudget.allocated ?? 0;
					const total = childBudget.total ?? 0;
					const percentage = calculatePercentage(allocated, total);
					if (!refs.childBudgetInfo) {
						refs.childBudgetInfo = refs.budgetInfoContainer.createSpan({ cls: cls("child-budget-info") });
					}
					refs.childBudgetInfo.textContent = `Child allocated: ${formatHoursWithPercentage(allocated, percentage)}`;
				} else if (refs.childBudgetInfo) {
					refs.childBudgetInfo.remove();
					refs.childBudgetInfo = null;
				}
			}

			setCssVar(refs.bar, "percentage-width", `${Math.min(percentage, 100)}%`);
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

		input.focus();

		const handleConfirm = () => {
			const categoryName = input.value.trim();
			if (categoryName) {
				inputWrapper.remove();
				this.createNewCategory(categoryName);
			}
		};

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
			this.scrollToCategoryById(categoryName);
			return;
		}

		this.state.allocations.set(categoryName, 0);
		this.state.saveState();

		this.reRenderAllocationList();
		this.renderSummary();

		this.scrollToCategoryById(categoryName);
		this.updateHistoryButtons();

		new Notice(`Category "${categoryName}" added. Assign time to save it.`);
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
			this.commitAllTypingInputs();
			this.result = {
				allocations: this.getAllocationsArray(),
				cancelled: false,
			};
			this.close();
			return false;
		});
	}

	private commitAllTypingInputs(): void {
		for (const [category, refs] of this.rowRefs) {
			if (this.typingInputs.has(category)) {
				const value = Number.parseFloat(refs.input.value) || 0;
				this.state.allocations.set(category, value);
			}
		}
		this.typingInputs.clear();
	}

	private updateHistoryButtons(): void {
		this.undoButton?.update();
		this.redoButton?.update();
	}

	private getTotalAllocated(): number {
		return Array.from(this.state.allocations.values()).reduce((total, hours) => total + hours, 0);
	}

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
		if (this.allocationListEl !== null) {
			this.allocationListEl.scrollTop = this.scrollPosition;
		}
	}

	private reRenderAllocationList(): void {
		this.saveScrollPosition();
		this.renderAllocationList();
		this.restoreScrollPosition();
	}

	private scrollToCategoryById(categoryId: string): void {
		const refs = this.rowRefs.get(categoryId);
		if (refs) {
			refs.item.scrollIntoView({ behavior: "smooth", block: "nearest" });
		}
	}

	private executeHistoryOperation(operation: () => Map<string, number> | null): void {
		const state = operation();
		if (state) {
			this.reRenderAllocationList();
			this.renderSummary();
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

	private applyFillFromParent(): void {
		if (this.parentBudgets.size === 0) {
			return;
		}

		const filledAllocations = fillAllocationsFromParent(this.parentBudgets, this.totalHoursAvailable);

		this.state.allocations.clear();

		for (const allocation of filledAllocations) {
			this.state.allocations.set(allocation.categoryName, allocation.hours);
		}

		this.reRenderAllocationList();
		this.renderSummary();
	}
}
