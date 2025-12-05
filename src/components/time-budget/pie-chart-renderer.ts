import { ArcElement, Chart, type ChartConfiguration, Legend, PieController, Tooltip } from "chart.js";
import type { Category, TimeAllocation } from "../../types";
import { addCls, cls } from "../../utils/css";

Chart.register(ArcElement, Tooltip, Legend, PieController);

export interface PieChartData {
	labels: string[];
	values: number[];
	colors: string[];
}

export function preparePieChartData(allocations: TimeAllocation[], categories: Category[]): PieChartData {
	const categoryMap = new Map(categories.map((c) => [c.id, c]));

	const labels: string[] = [];
	const values: number[] = [];
	const colors: string[] = [];

	for (const allocation of allocations) {
		const category = categoryMap.get(allocation.categoryId);
		if (category && allocation.hours > 0) {
			labels.push(category.name);
			values.push(allocation.hours);
			colors.push(category.color);
		}
	}

	return { labels, values, colors };
}

export function createPieChartConfig(data: PieChartData, title?: string): ChartConfiguration<"pie"> {
	return {
		type: "pie",
		data: {
			labels: data.labels,
			datasets: [
				{
					data: data.values,
					backgroundColor: data.colors,
					borderColor: data.colors.map(() => "rgba(255, 255, 255, 0.2)"),
					borderWidth: 2,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: true,
			plugins: {
				legend: {
					position: "right",
					labels: {
						color: "#ffffff",
						font: {
							size: 12,
						},
						padding: 12,
						usePointStyle: true,
						pointStyle: "circle",
					},
				},
				tooltip: {
					callbacks: {
						label: (context) => {
							const value = context.parsed;
							const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
							const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
							return `${context.label}: ${value}h (${percentage}%)`;
						},
					},
				},
				title: title
					? {
							display: true,
							text: title,
							color: "var(--text-normal)",
							font: {
								size: 14,
								weight: "bold",
							},
						}
					: { display: false },
			},
		},
	};
}

export class PieChartRenderer {
	private chart: Chart<"pie"> | null = null;
	private canvas: HTMLCanvasElement;

	constructor(private container: HTMLElement) {
		this.canvas = container.createEl("canvas", {
			cls: cls("pie-chart-canvas"),
		});
	}

	render(allocations: TimeAllocation[], categories: Category[], title?: string): void {
		if (this.chart) {
			this.chart.destroy();
		}

		const data = preparePieChartData(allocations, categories);

		if (data.values.length === 0) {
			this.renderEmptyState();
			return;
		}

		const config = createPieChartConfig(data, title);
		this.chart = new Chart(this.canvas, config);
	}

	private renderEmptyState(): void {
		addCls(this.canvas, "hidden");
		const emptyEl = this.container.createDiv({ cls: cls("pie-chart-empty") });
		emptyEl.setText("No time allocated yet");
	}

	destroy(): void {
		if (this.chart) {
			this.chart.destroy();
			this.chart = null;
		}
	}
}
