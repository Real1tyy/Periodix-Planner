import { type App, type MarkdownPostProcessorContext, TFile } from "obsidian";
import type { PeriodType } from "../../constants";
import type { Category, PeriodicPlannerSettings, TimeAllocation } from "../../types";
import { addCls, cls } from "../../utils/css";
import { getHoursForPeriodType } from "../../utils/time-budget-utils";
import { AllocationEditorModal } from "./allocation-editor-modal";
import {
    getTotalAllocatedHours,
    parseAllocationBlock,
    resolveAllocations,
    serializeAllocations,
} from "./allocation-parser";
import { getParentBudgets } from "./parent-budget-tracker";
import { PieChartRenderer } from "./pie-chart-renderer";

export class TimeBudgetBlockRenderer {
	private pieChartRenderer: PieChartRenderer | null = null;

	constructor(
		private app: App,
		private settings: PeriodicPlannerSettings
	) {}

	async render(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
		el.empty();
		el.addClass(cls("time-budget-block"));

		const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
		if (!(file instanceof TFile)) {
			this.renderError(el, "Cannot find file");
			return;
		}

		const cache = this.app.metadataCache.getFileCache(file);
		const rawPeriodType: unknown = cache?.frontmatter?.[this.settings.properties.periodTypeProp];
		const periodType = typeof rawPeriodType === "string" ? (rawPeriodType as PeriodType) : undefined;

		if (!periodType) {
			this.renderError(el, "This note is not a periodic note (missing Period Type)");
			return;
		}

		const parsed = parseAllocationBlock(source);
		const { resolved: allocations, unresolved } = resolveAllocations(parsed.allocations, this.settings.categories);

		if (unresolved.length > 0) {
			this.renderWarnings(el, unresolved);
		}

		const rawHours: unknown = cache?.frontmatter?.[this.settings.properties.hoursAvailableProp];
		const totalHours =
			typeof rawHours === "number" ? rawHours : getHoursForPeriodType(this.settings.timeBudget, periodType);

		const parentBudgets = await getParentBudgets(this.app, file, periodType, this.settings);

		this.renderHeader(el, totalHours, allocations);
		this.renderAllocationTable(el, allocations, this.settings.categories, parentBudgets.budgets);
		this.renderPieChart(el, allocations, this.settings.categories);
		this.renderEditButton(el, file, periodType, allocations, totalHours, parentBudgets.budgets, ctx);
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

	private renderHeader(el: HTMLElement, totalHours: number, allocations: TimeAllocation[]): void {
		const header = el.createDiv({ cls: cls("time-budget-header") });

		const title = header.createEl("h3", { text: "Time budget" });
		addCls(title, "time-budget-title");

		const totalAllocated = Math.round(getTotalAllocatedHours(allocations) * 10) / 10;
		const remaining = Math.round((totalHours - totalAllocated) * 10) / 10;
		const percentage = totalHours > 0 ? (totalAllocated / totalHours) * 100 : 0;

		const summary = header.createDiv({ cls: cls("time-budget-summary") });

		const statsRow = summary.createDiv({ cls: cls("stats-row") });

		this.createStatItem(statsRow, "Total", `${totalHours}h`);
		this.createStatItem(statsRow, "Allocated", `${totalAllocated}h`, percentage > 100 ? "over" : undefined);
		this.createStatItem(statsRow, "Remaining", `${remaining}h`, remaining < 0 ? "over" : undefined);

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
		parentBudgets: Map<string, { total: number; remaining: number }>
	): void {
		if (allocations.length === 0) {
			const emptyEl = el.createDiv({ cls: cls("time-budget-empty") });
			emptyEl.setText("No time allocations yet. Click edit to add categories.");
			return;
		}

		const table = el.createEl("table", { cls: cls("allocation-table") });

		const thead = table.createEl("thead");
		const headerRow = thead.createEl("tr");
		headerRow.createEl("th", { text: "Category" });
		headerRow.createEl("th", { text: "Hours" });
		headerRow.createEl("th", { text: "Parent budget" });
		headerRow.createEl("th", { text: "Status" });

		const tbody = table.createEl("tbody");
		const categoryMap = new Map(categories.map((c) => [c.id, c]));

		for (const allocation of allocations) {
			const category = categoryMap.get(allocation.categoryId);
			if (!category) continue;

			const row = tbody.createEl("tr");

			const nameCell = row.createEl("td");
			const colorDot = nameCell.createSpan({ cls: cls("category-color-dot") });
			colorDot.style.backgroundColor = category.color;
			nameCell.createSpan({ text: category.name });

			row.createEl("td", { text: `${allocation.hours}h` });

			const parentBudget = parentBudgets.get(allocation.categoryId);
			if (parentBudget) {
				row.createEl("td", { text: `${parentBudget.remaining}h remaining` });

				const statusCell = row.createEl("td");
				if (allocation.hours > parentBudget.remaining && parentBudget.remaining >= 0) {
					statusCell.createSpan({ text: "⚠️ Over budget", cls: cls("status-over") });
					addCls(row, "over-budget-row");
				} else {
					statusCell.createSpan({ text: "✓", cls: cls("status-ok") });
				}
			} else {
				row.createEl("td", { text: "—" });
				row.createEl("td", { text: "—" });
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
				`${periodType.charAt(0).toUpperCase() + periodType.slice(1)}: ${file.basename}`
			);

			void modal.openAndWait().then((result) => {
				if (!result.cancelled) {
					void this.updateCodeBlock(file, result.allocations, ctx);
				}
			});
		});
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

	destroy(): void {
		if (this.pieChartRenderer) {
			this.pieChartRenderer.destroy();
		}
	}
}
