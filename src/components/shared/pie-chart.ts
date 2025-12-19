import { ArcElement, Chart, type ChartConfiguration, Legend, PieController, Tooltip } from "chart.js";
import { addCls, cls } from "../../utils/css";

Chart.register(ArcElement, Tooltip, Legend, PieController);

export interface PieChartData {
	labels: string[];
	values: number[];
	colors: string[];
}

export interface PieChartConfig {
	title?: string;
	valueFormatter?: (value: number) => string;
}

export function createPieChartConfig(data: PieChartData, config?: PieChartConfig): ChartConfiguration<"pie"> {
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
			maintainAspectRatio: false,
			plugins: {
				legend: {
					position: "right",
					labels: {
						color: "#ffffff",
						font: {
							size: 11,
						},
						padding: 8,
						usePointStyle: true,
						pointStyle: "circle",
						boxWidth: 12,
						boxHeight: 12,
					},
					maxWidth: 200,
				},
				tooltip: {
					callbacks: {
						label: (context) => {
							const value = context.parsed;
							const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
							const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
							const formatted = config?.valueFormatter ? config.valueFormatter(value) : `${value}`;
							return `${context.label}: ${formatted} (${percentage}%)`;
						},
					},
				},
				title: config?.title
					? {
							display: true,
							text: config.title,
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

	render(data: PieChartData, config?: PieChartConfig): void {
		if (this.chart) {
			this.chart.destroy();
		}

		if (data.values.length === 0) {
			this.renderEmptyState();
			return;
		}

		const chartConfig = createPieChartConfig(data, config);
		this.chart = new Chart(this.canvas, chartConfig);
	}

	private renderEmptyState(): void {
		addCls(this.canvas, "hidden");
		const emptyEl = this.container.createDiv({ cls: cls("pie-chart-empty") });
		emptyEl.setText("No data available");
	}

	destroy(): void {
		if (this.chart) {
			this.chart.destroy();
			this.chart = null;
		}
	}
}
