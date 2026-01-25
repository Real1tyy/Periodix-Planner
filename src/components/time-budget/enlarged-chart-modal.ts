import { type App, Modal } from "obsidian";
import type { Category, TimeAllocation } from "../../types";
import { cls } from "../../utils/css";
import { type PieChartRenderer, renderTimeBudgetPieChart } from "./pie-chart-renderer";

export class EnlargedChartModal extends Modal {
	private pieChartRenderer: PieChartRenderer | null = null;

	constructor(
		app: App,
		private allocations: TimeAllocation[],
		private categories: Category[],
		private periodLabel: string
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass(cls("enlarged-chart-modal"));

		const header = contentEl.createDiv({ cls: cls("enlarged-chart-header") });
		header.createEl("h2", { text: this.periodLabel });

		const chartContainer = contentEl.createDiv({
			cls: cls("enlarged-chart-container"),
		});
		this.pieChartRenderer = renderTimeBudgetPieChart(chartContainer, this.allocations, this.categories);
	}

	onClose(): void {
		if (this.pieChartRenderer) {
			this.pieChartRenderer.destroy();
		}
		this.contentEl.empty();
	}
}
