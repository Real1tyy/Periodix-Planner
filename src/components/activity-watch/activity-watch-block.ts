import { type App, MarkdownRenderChild } from "obsidian";
import { type ActivityWatchData, parseActivityWatchBlock } from "../../types/activity-watch";
import { addCls, cls } from "../../utils/css";
import { formatSecondsToHours, formatSecondsToHoursMinutes } from "../../utils/time-budget-utils";
import { type PieChartData, PieChartRenderer } from "../shared/pie-chart";
import { EnlargedChartModal } from "../time-budget/enlarged-chart-modal";

const APP_COLORS = [
	"#3B82F6", // Blue
	"#10B981", // Green
	"#8B5CF6", // Purple
	"#F59E0B", // Amber
	"#EF4444", // Red
	"#EC4899", // Pink
	"#06B6D4", // Cyan
	"#84CC16", // Lime
	"#F97316", // Orange
	"#14B8A6", // Teal
];

type SortColumn = "name" | "duration";
type SortDirection = "asc" | "desc";

export class ActivityWatchBlockRenderer extends MarkdownRenderChild {
	private pieChartRenderer: PieChartRenderer | null = null;
	private sortColumn: SortColumn = "duration";
	private sortDirection: SortDirection = "desc";
	private data: ActivityWatchData | null = null;
	private isRendering: boolean = false;

	constructor(
		containerEl: HTMLElement,
		private app: App,
		private sourceContent: string
	) {
		super(containerEl);
	}

	onload(): void {
		void this.renderContent();
	}

	onunload(): void {
		if (this.pieChartRenderer) {
			this.pieChartRenderer.destroy();
			this.pieChartRenderer = null;
		}
		this.containerEl.removeClass("periodic-planner-activity-watch-initialized");
	}

	private async renderContent(): Promise<void> {
		if (this.isRendering) return;

		this.isRendering = true;
		const el = this.containerEl;

		try {
			el.empty();
			el.addClass(cls("activity-watch-block"));

			const data = parseActivityWatchBlock(this.sourceContent);
			if (!data) {
				this.renderError(el, "Invalid ActivityWatch data format");
				return;
			}

			this.data = data;

			this.renderHeader(el, data);
			this.renderTable(el, data);

			const pieChartContainer = el.createDiv({
				cls: cls("pie-chart-container"),
			});
			this.renderPieChart(pieChartContainer, data);
			this.renderEnlargeButton(el);
		} catch (error) {
			this.renderError(el, error instanceof Error ? error.message : "Unknown error");
		} finally {
			this.isRendering = false;
		}
	}

	private renderError(el: HTMLElement, message: string): void {
		const errorEl = el.createDiv({ cls: cls("time-budget-error") });
		errorEl.setText(`⚠️ ${message}`);
	}

	private renderHeader(el: HTMLElement, data: ActivityWatchData): void {
		const header = el.createDiv({ cls: cls("time-budget-header") });

		const title = header.createEl("h3", { text: "Activity Summary" });
		addCls(title, "time-budget-title");

		const totalHours = formatSecondsToHours(data.totalActiveTime);
		const totalSeconds = Math.floor(data.totalActiveTime);

		const summary = header.createDiv({ cls: cls("time-budget-summary") });
		const statsRow = summary.createDiv({ cls: cls("stats-row") });

		const item = statsRow.createDiv({ cls: cls("stat-item") });
		item.createSpan({ text: "Total", cls: cls("stat-label") });
		item.createSpan({
			text: `${totalHours}h (${totalSeconds}s)`,
			cls: cls("stat-value"),
		});
	}

	private renderTable(el: HTMLElement, data: ActivityWatchData): void {
		if (data.apps.length === 0) {
			const emptyEl = el.createDiv({ cls: cls("time-budget-empty") });
			emptyEl.setText("No activity data available");
			return;
		}

		const table = el.createEl("table", { cls: cls("allocation-table") });
		const thead = table.createEl("thead");
		const headerRow = thead.createEl("tr");

		this.createSortableHeader(headerRow, "Application", "name");
		this.createSortableHeader(headerRow, "Duration", "duration");
		headerRow.createEl("th", { text: "%" });

		const tbody = table.createEl("tbody");
		const sortedApps = this.sortApps(data.apps);

		for (const app of sortedApps) {
			const row = tbody.createEl("tr");

			row.createEl("td", { text: app.name });

			const formatted = formatSecondsToHoursMinutes(app.duration);
			row.createEl("td", { text: formatted });

			const percentage = data.totalActiveTime > 0 ? (app.duration / data.totalActiveTime) * 100 : 0;
			row.createEl("td", { text: `${percentage.toFixed(1)}%` });
		}
	}

	private createSortableHeader(headerRow: HTMLTableRowElement, label: string, column: SortColumn): void {
		const th = headerRow.createEl("th");
		const headerContent = th.createDiv({ cls: cls("sortable-header") });
		headerContent.createSpan({ text: label });

		const sortIndicator = headerContent.createSpan({
			cls: cls("sort-indicator"),
		});

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
			if (this.data) {
				const el = this.containerEl;
				el.empty();
				el.addClass(cls("activity-watch-block"));
				this.renderHeader(el, this.data);
				this.renderTable(el, this.data);
				const pieChartContainer = el.createDiv({
					cls: cls("pie-chart-container"),
				});
				this.renderPieChart(pieChartContainer, this.data);
				this.renderEnlargeButton(el);
			}
		});
	}

	private sortApps(apps: Array<{ name: string; duration: number }>): Array<{ name: string; duration: number }> {
		const sorted = [...apps];

		sorted.sort((a, b) => {
			let comparison = 0;

			if (this.sortColumn === "name") {
				comparison = a.name.localeCompare(b.name);
			} else if (this.sortColumn === "duration") {
				comparison = a.duration - b.duration;
			}

			return this.sortDirection === "asc" ? comparison : -comparison;
		});

		return sorted;
	}

	private renderPieChart(container: HTMLElement, data: ActivityWatchData): void {
		if (this.pieChartRenderer) {
			this.pieChartRenderer.destroy();
		}

		const chartData = this.prepareChartData(data);
		this.pieChartRenderer = new PieChartRenderer(container);
		this.pieChartRenderer.render(chartData, {
			valueFormatter: (value) => {
				const hours = (value / 3600).toFixed(2);
				return `${value}s (${hours}h)`;
			},
		});
	}

	private renderEnlargeButton(el: HTMLElement): void {
		if (!this.data || this.data.apps.length === 0) return;

		const buttonContainer = el.createDiv({ cls: cls("edit-button-container") });
		const enlargeBtn = buttonContainer.createEl("button", {
			text: "Enlarge chart",
			cls: cls("enlarge-chart-btn"),
		});

		enlargeBtn.addEventListener("click", () => {
			if (this.data) {
				this.openEnlargedChart();
			}
		});
	}

	private openEnlargedChart(): void {
		if (!this.data) return;

		const allocations = this.data.apps.map((app, _index) => ({
			categoryName: app.name,
			hours: app.duration / 3600,
		}));

		const categories = this.data.apps.map((app, index) => ({
			id: app.name,
			name: app.name,
			color: APP_COLORS[index % APP_COLORS.length],
			description: "",
			createdAt: Date.now(),
		}));

		new EnlargedChartModal(this.app, allocations, categories, "Activity Summary").open();
	}

	private prepareChartData(data: ActivityWatchData): PieChartData {
		const labels: string[] = [];
		const values: number[] = [];
		const colors: string[] = [];

		for (let i = 0; i < data.apps.length; i++) {
			const app = data.apps[i];
			if (app.duration > 0) {
				labels.push(app.name);
				values.push(app.duration);
				colors.push(APP_COLORS[i % APP_COLORS.length]);
			}
		}

		return { labels, values, colors };
	}
}
