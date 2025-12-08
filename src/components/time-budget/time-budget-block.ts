import { type App, type MarkdownPostProcessorContext, TFile } from "obsidian";
import type { PeriodType } from "../../constants";
import type { PeriodIndex } from "../../core/period-index";
import type { Category, IndexedPeriodNote, PeriodicPlannerSettings, TimeAllocation } from "../../types";
import { addCls, cls } from "../../utils/css";
import { formatHours, roundHours, sortAllocationsByCategoryName } from "../../utils/time-budget-utils";
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
import { PieChartRenderer } from "./pie-chart-renderer";

export class TimeBudgetBlockRenderer {
	private pieChartRenderer: PieChartRenderer | null = null;

	constructor(
		private app: App,
		private settings: PeriodicPlannerSettings,
		private periodIndex: PeriodIndex
	) {}

	async render(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
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
		const childBudgets = await getChildBudgetsFromIndex(
			file,
			periodType,
			allocations,
			this.periodIndex,
			this.settings.categories
		);

		this.renderHeader(el, totalHours, allocations, periodType, childBudgets.totalChildrenAllocated);
		this.renderAllocationTable(
			el,
			allocations,
			this.settings.categories,
			periodType,
			parentBudgets.budgets,
			childBudgets.budgets,
			totalHours
		);
		this.renderPieChart(el, allocations, this.settings.categories);
		this.renderEditButton(
			el,
			file,
			periodType,
			allocations,
			totalHours,
			parentBudgets.budgets,
			childBudgets.budgets,
			ctx
		);
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

		const summary = header.createDiv({ cls: cls("time-budget-summary") });

		const statsRow = summary.createDiv({ cls: cls("stats-row") });

		this.createStatItem(statsRow, "Total", `${formatHours(totalHours)}h`);
		this.createStatItem(
			statsRow,
			"Allocated",
			`${formatHours(totalAllocated)}h (${percentage.toFixed(1)}%)`,
			percentage > 100 ? "over" : undefined
		);
		this.createStatItem(statsRow, "Remaining", `${formatHours(remaining)}h`, remaining < 0 ? "over" : undefined);

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

		if (percentage > 100) {
			addCls(progressFill, "over-budget");
		} else if (percentage >= 80) {
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

	private renderAllocationTable(
		el: HTMLElement,
		allocations: TimeAllocation[],
		categories: Category[],
		periodType: PeriodType,
		parentBudgets: Map<string, CategoryBudgetInfo>,
		childBudgets: Map<string, CategoryBudgetInfo>,
		totalHours: number
	): void {
		if (allocations.length === 0) {
			const emptyEl = el.createDiv({ cls: cls("time-budget-empty") });
			emptyEl.setText("No time allocations yet. Click edit to add categories.");
			return;
		}

		const showParent = periodType !== "yearly";
		const showChild = periodType !== "daily";

		const table = el.createEl("table", { cls: cls("allocation-table") });

		const thead = table.createEl("thead");
		const headerRow = thead.createEl("tr");
		headerRow.createEl("th", { text: "Category" });
		headerRow.createEl("th", { text: "Hours" });
		if (showParent) headerRow.createEl("th", { text: "Parent budget" });
		if (showChild) headerRow.createEl("th", { text: "Child allocated" });
		headerRow.createEl("th", { text: "Status" });

		const tbody = table.createEl("tbody");
		const categoryMap = new Map(categories.map((c) => [c.id, c]));

		const sortedAllocations = sortAllocationsByCategoryName(allocations, categories);

		for (const allocation of sortedAllocations) {
			const category = categoryMap.get(allocation.categoryId);
			if (!category) continue;

			const row = tbody.createEl("tr");

			const nameCell = row.createEl("td");
			const colorDot = nameCell.createSpan({ cls: cls("category-color-dot") });
			colorDot.style.backgroundColor = category.color;
			nameCell.createSpan({ text: category.name });

			const percentage = totalHours > 0 ? (allocation.hours / totalHours) * 100 : 0;
			row.createEl("td", { text: `${formatHours(allocation.hours)}h (${percentage.toFixed(1)}%)` });

			if (showParent) {
				const parentBudget = parentBudgets.get(allocation.categoryId);
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
				const childBudget = childBudgets.get(allocation.categoryId);
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
			const parentBudget = parentBudgets.get(allocation.categoryId);
			const childBudget = childBudgets.get(allocation.categoryId);

			let hasIssue = false;
			if (showParent && parentBudget && allocation.hours > parentBudget.remaining && parentBudget.remaining >= 0) {
				statusCell.createSpan({ text: "⚠️ Over parent", cls: cls("status-over") });
				addCls(row, "over-budget-row");
				hasIssue = true;
			} else if (showChild && childBudget && childBudget.allocated > childBudget.total) {
				statusCell.createSpan({ text: "⚠️ Children over", cls: cls("status-over") });
				addCls(row, "over-budget-row");
				hasIssue = true;
			}

			if (!hasIssue) {
				statusCell.createSpan({ text: "✓", cls: cls("status-ok") });
			}
		}
	}

	private renderPieChart(el: HTMLElement, allocations: TimeAllocation[], categories: Category[]): void {
		if (allocations.length === 0) return;

		const chartContainer = el.createDiv({ cls: cls("pie-chart-container") });
		this.pieChartRenderer = new PieChartRenderer(chartContainer);
		this.pieChartRenderer.render(allocations, categories);
	}

	private renderEditButton(
		el: HTMLElement,
		file: TFile,
		periodType: PeriodType,
		currentAllocations: TimeAllocation[],
		totalHours: number,
		parentBudgets: Map<string, { total: number; allocated: number; remaining: number; categoryId: string }>,
		childBudgets: Map<string, { categoryId: string; total: number; allocated: number; remaining: number }>,
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
				childBudgets,
				`${periodType.charAt(0).toUpperCase() + periodType.slice(1)}: ${file.basename}`
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
		const newContent = serializeAllocations(allocations, this.settings.categories);

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

	destroy(): void {
		if (this.pieChartRenderer) {
			this.pieChartRenderer.destroy();
		}
	}
}
