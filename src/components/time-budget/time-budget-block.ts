import { type App, type MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from "obsidian";
import type { Subscription } from "rxjs";
import type { PeriodType } from "../../constants";
import type { PeriodIndex } from "../../core/period-index";
import type { Category, IndexedPeriodNote, PeriodicPlannerSettings, TimeAllocation } from "../../types";
import { addCls, cls } from "../../utils/css";
import { fillAllocationsFromParent, formatHours, roundHours } from "../../utils/time-budget-utils";
import { AllocationEditorModal } from "./allocation-editor-modal";
import {
	getTotalAllocatedHours,
	parseAllocationBlock,
	resolveAllocations,
	serializeAllocations,
} from "./allocation-parser";
import { getChildBudgetsFromIndex } from "./child-budget-calculator";
import { EnlargedChartModal } from "./enlarged-chart-modal";
import { type CategoryBudgetInfo, getParentBudgets } from "./parent-budget-tracker";
import { type PieChartRenderer, renderTimeBudgetPieChart } from "./pie-chart-renderer";

type SortColumn = "name" | "hours" | "parentBudget" | "childAllocated";
type SortDirection = "asc" | "desc";

export class TimeBudgetBlockRenderer extends MarkdownRenderChild {
	private pieChartRenderer: PieChartRenderer | null = null;
	private sortColumn: SortColumn = "name";
	private sortDirection: SortDirection = "asc";
	private tableData: {
		allocations: TimeAllocation[];
		categories: Category[];
		periodType: PeriodType;
		parentBudgets: Map<string, CategoryBudgetInfo>;
		childBudgets: Map<string, CategoryBudgetInfo>;
		totalHours: number;
	} | null = null;
	private tableContainer: HTMLElement | null = null;
	private tableInsertBefore: HTMLElement | null = null;
	private indexSubscription: Subscription | null = null;
	private isRendering: boolean = false;

	constructor(
		containerEl: HTMLElement,
		private app: App,
		private settings: PeriodicPlannerSettings,
		private periodIndex: PeriodIndex,
		private sourceContent: string,
		private context: MarkdownPostProcessorContext
	) {
		super(containerEl);
	}

	onload(): void {
		this.setupIndexListener();
		void this.renderContent();
	}

	onunload(): void {
		if (this.pieChartRenderer) {
			this.pieChartRenderer.destroy();
			this.pieChartRenderer = null;
		}
		if (this.indexSubscription) {
			this.indexSubscription.unsubscribe();
			this.indexSubscription = null;
		}
		this.containerEl.removeClass("periodic-planner-initialized");
	}

	private setupIndexListener(): void {
		const filePath = this.context.sourcePath;

		this.indexSubscription = this.periodIndex.events$.subscribe((event) => {
			if (event.type === "period-updated" && event.filePath === filePath) {
				void this.renderContent();
			}
		});
	}

	private async renderContent(): Promise<void> {
		// Prevent concurrent renders
		if (this.isRendering) {
			return;
		}

		// Allow empty source content (empty code block should still render)
		if (this.sourceContent === null || this.sourceContent === undefined || !this.context) {
			return;
		}

		this.isRendering = true;

		const el = this.containerEl;
		const source = this.sourceContent;
		const ctx = this.context;

		try {
			el.empty();
			el.addClass(cls("time-budget-block"));

			const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!(file instanceof TFile)) {
				this.renderError(el, "Cannot find file");
				return;
			}
			const entry = await this.retryGetEntryForFile(file);
			if (!entry) {
				this.renderError(el, "This note is not indexed yet. Please wait for indexing to complete.");
				return;
			}

			const { periodType, hoursAvailable: totalHours } = entry;

			const parsed = parseAllocationBlock(source);
			const { unresolved, resolved: allocations } = resolveAllocations(parsed.allocations, this.settings.categories);

			if (unresolved.length > 0) {
				this.renderWarnings(el, unresolved);
			}

			const parentBudgets = await getParentBudgets(entry, this.settings, this.periodIndex);

			let finalAllocations = allocations;
			if (
				this.settings.timeBudget.autoInheritParentPercentages &&
				allocations.length === 0 &&
				parentBudgets.budgets.size > 0
			) {
				const inheritedAllocations = fillAllocationsFromParent(parentBudgets.budgets, totalHours);
				if (inheritedAllocations.length > 0) {
					await this.updateCodeBlock(file, inheritedAllocations, ctx);
					finalAllocations = inheritedAllocations;
				}
			}

			const childBudgets = getChildBudgetsFromIndex(
				file,
				periodType,
				finalAllocations,
				this.periodIndex,
				this.settings.generation
			);

			this.renderHeader(el, totalHours, finalAllocations, periodType, childBudgets.totalChildrenAllocated);

			this.tableData = {
				allocations: finalAllocations,
				categories: this.settings.categories,
				periodType,
				parentBudgets: parentBudgets.budgets,
				childBudgets: childBudgets.budgets,
				totalHours,
			};
			this.tableContainer = el;

			const pieChartContainer = el.createDiv({ cls: cls("pie-chart-container") });
			this.tableInsertBefore = pieChartContainer;

			this.renderAllocationTable();
			this.renderPieChart(pieChartContainer, finalAllocations, this.settings.categories);
			this.renderEditButton(
				el,
				file,
				periodType,
				finalAllocations,
				totalHours,
				parentBudgets.budgets,
				childBudgets.budgets,
				ctx
			);
		} finally {
			this.isRendering = false;
		}
	}

	private renderError(el: HTMLElement, message: string): void {
		const errorEl = el.createDiv({ cls: cls("time-budget-error") });
		errorEl.setText(`⚠️ ${message}`);
	}

	private renderWarnings(el: HTMLElement, unresolvedCategories: string[]): void {
		const warningEl = el.createDiv({ cls: cls("time-budget-warnings") });
		warningEl.createEl("strong", { text: "Unknown categories (ignored): " });
		warningEl.createSpan({ text: unresolvedCategories.join(", ") });
	}

	private renderHeader(
		el: HTMLElement,
		totalHours: number,
		allocations: TimeAllocation[],
		periodType: PeriodType,
		totalChildrenAllocated: number
	): void {
		const header = el.createDiv({ cls: cls("time-budget-header") });

		const title = header.createEl("h3", { text: "Time budget" });
		addCls(title, "time-budget-title");

		const totalAllocated = roundHours(getTotalAllocatedHours(allocations));
		const remaining = roundHours(totalHours - totalAllocated);
		const percentage = totalHours > 0 ? (totalAllocated / totalHours) * 100 : 0;

		const overBudgetThreshold = this.settings.ui.overBudgetThresholdPercent;
		const warningThreshold = this.settings.ui.warningThresholdPercent;

		// Tolerance for floating-point comparison (0.01%)
		const EPSILON = 0.01;

		const summary = header.createDiv({ cls: cls("time-budget-summary") });

		const statsRow = summary.createDiv({ cls: cls("stats-row") });

		this.createStatItem(statsRow, "Total", `${formatHours(totalHours)}h`);
		this.createStatItem(
			statsRow,
			"Allocated",
			`${formatHours(totalAllocated)}h (${percentage.toFixed(1)}%)`,
			percentage > overBudgetThreshold + EPSILON ? "over" : undefined
		);
		this.createStatItem(statsRow, "Remaining", `${formatHours(remaining)}h`, remaining < -EPSILON ? "over" : undefined);

		const showChild = periodType !== "daily";
		if (showChild) {
			const totalChildAllocatedHours = roundHours(totalChildrenAllocated);
			const childAllocatedPercentage = totalHours > 0 ? (totalChildrenAllocated / totalHours) * 100 : 0;
			this.createStatItem(
				statsRow,
				"Child Allocated",
				`${formatHours(totalChildAllocatedHours)}h (${childAllocatedPercentage.toFixed(1)}%)`
			);
		}

		const progressBar = summary.createDiv({ cls: cls("progress-bar-container") });
		const progressFill = progressBar.createDiv({ cls: cls("progress-bar-fill") });
		progressFill.style.width = `${Math.min(percentage, 100)}%`;
		if (percentage > overBudgetThreshold + EPSILON) {
			addCls(progressFill, "over-budget");
		} else if (percentage > warningThreshold + EPSILON) {
			addCls(progressFill, "warning");
		}
	}

	private createStatItem(container: HTMLElement, label: string, value: string, status?: string): void {
		const item = container.createDiv({ cls: cls("stat-item") });
		item.createSpan({ text: label, cls: cls("stat-label") });
		const valueEl = item.createSpan({ text: value, cls: cls("stat-value") });
		if (status) {
			addCls(valueEl, `status-${status}`);
		}
	}

	private renderAllocationTable(): void {
		if (!this.tableContainer || !this.tableData) return;

		const { allocations, categories, periodType, parentBudgets, childBudgets, totalHours } = this.tableData;

		const existingTable = this.tableContainer.querySelector(`table.${cls("allocation-table")}`);
		const existingEmpty = this.tableContainer.querySelector(`.${cls("time-budget-empty")}`);

		if (existingTable) {
			existingTable.remove();
		}
		if (existingEmpty) {
			existingEmpty.remove();
		}

		if (allocations.length === 0) {
			const emptyEl = this.tableContainer.createDiv({ cls: cls("time-budget-empty") });
			emptyEl.setText("No time allocations yet. Click edit to add categories.");
			if (this.tableInsertBefore) {
				this.tableContainer.insertBefore(emptyEl, this.tableInsertBefore);
			}
			return;
		}

		const showParent = periodType !== "yearly";
		const showChild = periodType !== "daily";

		const table = this.tableContainer.createEl("table", { cls: cls("allocation-table") });

		if (this.tableInsertBefore) {
			this.tableContainer.insertBefore(table, this.tableInsertBefore);
		}

		const thead = table.createEl("thead");
		const headerRow = thead.createEl("tr");

		this.createSortableHeader(headerRow, "Category", "name");
		this.createSortableHeader(headerRow, "Hours", "hours");
		if (showParent) this.createSortableHeader(headerRow, "Parent budget", "parentBudget");
		if (showChild) this.createSortableHeader(headerRow, "Child allocated", "childAllocated");
		headerRow.createEl("th", { text: "Status" });

		const tbody = table.createEl("tbody");
		const categoryMap = new Map(categories.map((c) => [c.name, c]));

		const sortedAllocations = this.sortAllocations(allocations, categories, parentBudgets, childBudgets);

		for (const allocation of sortedAllocations) {
			const category = categoryMap.get(allocation.categoryName);
			if (!category) continue;

			const row = tbody.createEl("tr");

			const nameCell = row.createEl("td");
			const colorDot = nameCell.createSpan({ cls: cls("category-color-dot") });
			colorDot.style.backgroundColor = category.color;
			nameCell.createSpan({ text: category.name });

			const percentage = totalHours > 0 ? (allocation.hours / totalHours) * 100 : 0;
			row.createEl("td", { text: `${formatHours(allocation.hours)}h (${percentage.toFixed(1)}%)` });

			if (showParent) {
				const parentBudget = parentBudgets.get(allocation.categoryName);
				if (parentBudget) {
					const parentPercentage = parentBudget.total > 0 ? (parentBudget.allocated / parentBudget.total) * 100 : 0;
					row.createEl("td", {
						text: `${formatHours(parentBudget.allocated)}h / ${formatHours(parentBudget.total)}h (${parentPercentage.toFixed(1)}%)`,
					});
				} else {
					row.createEl("td", { text: "—" });
				}
			}

			if (showChild) {
				const childBudget = childBudgets.get(allocation.categoryName);
				if (childBudget) {
					const childPercentage = childBudget.total > 0 ? (childBudget.allocated / childBudget.total) * 100 : 0;
					row.createEl("td", {
						text: `${formatHours(childBudget.allocated)}h / ${formatHours(childBudget.total)}h (${childPercentage.toFixed(1)}%)`,
					});
				} else {
					row.createEl("td", { text: "—" });
				}
			}

			const statusCell = row.createEl("td");
			const parentBudget = parentBudgets.get(allocation.categoryName);
			const childBudget = childBudgets.get(allocation.categoryName);

			// Tolerance for floating-point comparison (0.01 hours)
			const EPSILON = 0.01;

			let hasIssue = false;
			if (showParent && !parentBudget) {
				statusCell.createSpan({ text: "⚠️ Parent category not set", cls: cls("status-over") });
				addCls(row, "over-budget-row");
				hasIssue = true;
			} else if (showParent && parentBudget && parentBudget.allocated > parentBudget.total + EPSILON) {
				statusCell.createSpan({ text: "⚠️ Over parent", cls: cls("status-over") });
				addCls(row, "over-budget-row");
				hasIssue = true;
			} else if (showChild && childBudget && childBudget.allocated > childBudget.total + EPSILON) {
				statusCell.createSpan({ text: "⚠️ Children over", cls: cls("status-over") });
				addCls(row, "over-budget-row");
				hasIssue = true;
			}

			if (!hasIssue) {
				statusCell.createSpan({ text: "✓", cls: cls("status-ok") });
			}
		}
	}

	private createSortableHeader(headerRow: HTMLTableRowElement, label: string, column: SortColumn): void {
		const th = headerRow.createEl("th");
		const headerContent = th.createDiv({ cls: cls("sortable-header") });
		headerContent.createSpan({ text: label });

		const sortIndicator = headerContent.createSpan({ cls: cls("sort-indicator") });

		if (this.sortColumn === column) {
			addCls(headerContent, "sorted");
			sortIndicator.textContent = this.sortDirection === "asc" ? " ↑" : " ↓";
		} else {
			sortIndicator.textContent = " ⇅";
			addCls(sortIndicator, "unsorted");
		}

		headerContent.addEventListener("click", () => {
			if (this.sortColumn === column) {
				this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
			} else {
				this.sortColumn = column;
				this.sortDirection = "asc";
			}
			this.renderAllocationTable();
		});
	}

	private sortAllocations(
		allocations: TimeAllocation[],
		categories: Category[],
		parentBudgets: Map<string, CategoryBudgetInfo>,
		childBudgets: Map<string, CategoryBudgetInfo>
	): TimeAllocation[] {
		const categoryMap = new Map(categories.map((c) => [c.name, c]));
		const sorted = [...allocations];

		sorted.sort((a, b) => {
			let comparison = 0;

			switch (this.sortColumn) {
				case "name": {
					const nameA = categoryMap.get(a.categoryName)?.name ?? "";
					const nameB = categoryMap.get(b.categoryName)?.name ?? "";
					comparison = nameA.localeCompare(nameB);
					break;
				}
				case "hours": {
					comparison = a.hours - b.hours;
					break;
				}
				case "parentBudget": {
					const parentA = parentBudgets.get(a.categoryName);
					const parentB = parentBudgets.get(b.categoryName);
					const totalA = parentA?.total ?? 0;
					const totalB = parentB?.total ?? 0;
					comparison = totalA - totalB;
					break;
				}
				case "childAllocated": {
					const childA = childBudgets.get(a.categoryName);
					const childB = childBudgets.get(b.categoryName);
					const allocatedA = childA?.allocated ?? 0;
					const allocatedB = childB?.allocated ?? 0;
					comparison = allocatedA - allocatedB;
					break;
				}
			}

			return this.sortDirection === "asc" ? comparison : -comparison;
		});

		return sorted;
	}

	private renderPieChart(container: HTMLElement, allocations: TimeAllocation[], categories: Category[]): void {
		if (allocations.length === 0) return;

		this.pieChartRenderer = renderTimeBudgetPieChart(container, allocations, categories);
	}

	private renderEditButton(
		el: HTMLElement,
		file: TFile,
		periodType: PeriodType,
		currentAllocations: TimeAllocation[],
		totalHours: number,
		parentBudgets: Map<string, { total: number; allocated: number; remaining: number; categoryName: string }>,
		childBudgets: Map<string, { categoryName: string; total: number; allocated: number; remaining: number }>,
		ctx: MarkdownPostProcessorContext
	): void {
		const buttonContainer = el.createDiv({ cls: cls("edit-button-container") });

		const editBtn = buttonContainer.createEl("button", {
			text: "Edit allocations",
			cls: cls("edit-allocations-btn"),
		});

		editBtn.addEventListener("click", () => {
			const modal = new AllocationEditorModal(
				this.app,
				this.settings.categories,
				currentAllocations,
				totalHours,
				parentBudgets,
				childBudgets
			);

			void modal.openAndWait().then((result) => {
				if (!result.cancelled) {
					void this.updateCodeBlock(file, result.allocations, ctx);
				}
			});
		});

		if (currentAllocations.length > 0) {
			const enlargeBtn = buttonContainer.createEl("button", {
				text: "Enlarge chart",
				cls: cls("enlarge-chart-btn"),
			});

			enlargeBtn.addEventListener("click", () => {
				const periodLabel = `${periodType.charAt(0).toUpperCase() + periodType.slice(1)}: ${file.basename}`;
				new EnlargedChartModal(this.app, currentAllocations, this.settings.categories, periodLabel).open();
			});
		}
	}

	private async updateCodeBlock(
		file: TFile,
		allocations: TimeAllocation[],
		_ctx: MarkdownPostProcessorContext
	): Promise<void> {
		const content = await this.app.vault.read(file);
		const newContent = serializeAllocations(allocations);

		const updatedContent = content.replace(
			/```periodic-planner\n[\s\S]*?```/,
			`\`\`\`periodic-planner\n${newContent}\n\`\`\``
		);

		await this.app.vault.modify(file, updatedContent);
	}

	private async retryGetEntryForFile(
		file: TFile,
		maxRetries: number = 3,
		delayMs: number = 50
	): Promise<IndexedPeriodNote | undefined> {
		for (let attempt = 0; attempt < maxRetries; attempt++) {
			const entry = this.periodIndex.getEntryForFile(file);
			if (entry) {
				return entry;
			}

			if (attempt < maxRetries - 1) {
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
		}

		return undefined;
	}
}
