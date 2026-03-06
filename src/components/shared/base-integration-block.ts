import { type App, MarkdownRenderChild } from "obsidian";
import { addCls, cls } from "../../utils/css";
import { type PieChartData, PieChartRenderer } from "./pie-chart";
import { EnlargedChartModal } from "../time-budget/enlarged-chart-modal";

export const INTEGRATION_COLORS = [
	"#3B82F6",
	"#10B981",
	"#8B5CF6",
	"#F59E0B",
	"#EF4444",
	"#EC4899",
	"#06B6D4",
	"#84CC16",
	"#F97316",
	"#14B8A6",
];

export interface IntegrationEntry {
	name: string;
	duration: number;
}

export abstract class BaseIntegrationBlockRenderer<TData> extends MarkdownRenderChild {
	protected pieChartRenderer: PieChartRenderer | null = null;
	protected sortColumn = "duration";
	protected sortDirection: "asc" | "desc" = "desc";
	protected data: TData | null = null;
	private isRendering = false;

	constructor(
		containerEl: HTMLElement,
		protected app: App,
		protected sourceContent: string
	) {
		super(containerEl);
	}

	protected abstract blockCssClass: string;
	protected abstract initCssClass: string;
	protected abstract errorLabel: string;

	protected abstract parseData(source: string): TData | null;
	protected abstract getEntries(data: TData): IntegrationEntry[];
	protected abstract renderHeader(el: HTMLElement, data: TData): void;
	protected abstract renderTable(el: HTMLElement, data: TData): void;
	protected abstract chartTitle(data: TData): string;
	protected abstract formatChartValue(value: number): string;
	protected abstract durationToHours(duration: number): number;

	onload(): void {
		void this.renderContent();
	}

	onunload(): void {
		if (this.pieChartRenderer) {
			this.pieChartRenderer.destroy();
			this.pieChartRenderer = null;
		}
		this.containerEl.removeClass(this.initCssClass);
	}

	protected renderView(el: HTMLElement, data: TData): void {
		this.renderHeader(el, data);
		this.renderTable(el, data);

		const pieChartContainer = el.createDiv({ cls: cls("pie-chart-container") });
		this.renderPieChart(pieChartContainer, data);
		this.renderEnlargeButton(el);
	}

	protected rerender(): void {
		if (!this.data) return;
		const el = this.containerEl;
		el.empty();
		el.addClass(cls(this.blockCssClass));
		this.renderView(el, this.data);
	}

	protected createSortableHeader(headerRow: HTMLTableRowElement, label: string, column: string): void {
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
			this.rerender();
		});
	}

	private async renderContent(): Promise<void> {
		if (this.isRendering) return;

		this.isRendering = true;
		const el = this.containerEl;

		try {
			el.empty();
			el.addClass(cls(this.blockCssClass));

			const data = this.parseData(this.sourceContent);
			if (!data) {
				this.renderError(el, this.errorLabel);
				return;
			}

			this.data = data;
			this.renderView(el, data);
		} catch (error) {
			this.renderError(el, error instanceof Error ? error.message : "Unknown error");
		} finally {
			this.isRendering = false;
		}
	}

	private renderError(el: HTMLElement, message: string): void {
		const errorEl = el.createDiv({ cls: cls("time-budget-error") });
		errorEl.setText(message);
	}

	private renderPieChart(container: HTMLElement, data: TData): void {
		if (this.pieChartRenderer) {
			this.pieChartRenderer.destroy();
		}

		const chartData = this.prepareChartData(data);
		this.pieChartRenderer = new PieChartRenderer(container);
		this.pieChartRenderer.render(chartData, {
			valueFormatter: (value) => this.formatChartValue(value),
		});
	}

	private renderEnlargeButton(el: HTMLElement): void {
		const entries = this.data ? this.getEntries(this.data) : [];
		if (entries.length === 0) return;

		const buttonContainer = el.createDiv({ cls: cls("edit-button-container") });
		const enlargeBtn = buttonContainer.createEl("button", {
			text: "Enlarge chart",
			cls: cls("enlarge-chart-btn"),
		});

		enlargeBtn.addEventListener("click", () => {
			if (this.data) this.openEnlargedChart();
		});
	}

	private openEnlargedChart(): void {
		if (!this.data) return;

		const entries = this.getEntries(this.data);

		const allocations = entries.map((entry) => ({
			categoryName: entry.name,
			hours: this.durationToHours(entry.duration),
		}));

		const categories = entries.map((entry, index) => ({
			id: entry.name,
			name: entry.name,
			color: INTEGRATION_COLORS[index % INTEGRATION_COLORS.length],
			description: "",
			createdAt: Date.now(),
		}));

		new EnlargedChartModal(this.app, allocations, categories, this.chartTitle(this.data)).open();
	}

	private prepareChartData(data: TData): PieChartData {
		const entries = this.getEntries(data);
		const labels: string[] = [];
		const values: number[] = [];
		const colors: string[] = [];

		for (let i = 0; i < entries.length; i++) {
			const entry = entries[i];
			if (entry.duration > 0) {
				labels.push(entry.name);
				values.push(entry.duration);
				colors.push(INTEGRATION_COLORS[i % INTEGRATION_COLORS.length]);
			}
		}

		return { labels, values, colors };
	}
}
