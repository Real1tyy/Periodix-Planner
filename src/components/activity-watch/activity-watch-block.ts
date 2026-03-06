import { type ActivityWatchData, parseActivityWatchBlock } from "../../types/activity-watch";
import { addCls, cls } from "../../utils/css";
import { formatSecondsToHours, formatSecondsToHoursMinutes } from "../../utils/time-budget-utils";
import { BaseIntegrationBlockRenderer, type IntegrationEntry } from "../shared/base-integration-block";

export class ActivityWatchBlockRenderer extends BaseIntegrationBlockRenderer<ActivityWatchData> {
	protected blockCssClass = "activity-watch-block";
	protected initCssClass = "periodic-planner-activity-watch-initialized";
	protected errorLabel = "⚠️ Invalid ActivityWatch data format";

	protected parseData(source: string): ActivityWatchData | null {
		return parseActivityWatchBlock(source);
	}

	protected getEntries(data: ActivityWatchData): IntegrationEntry[] {
		return data.apps;
	}

	protected chartTitle(): string {
		return "Activity Summary";
	}

	protected formatChartValue(value: number): string {
		const hours = (value / 3600).toFixed(2);
		return `${value}s (${hours}h)`;
	}

	protected durationToHours(duration: number): number {
		return duration / 3600;
	}

	protected renderHeader(el: HTMLElement, data: ActivityWatchData): void {
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

	protected renderTable(el: HTMLElement, data: ActivityWatchData): void {
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
		const sortedApps = this.sortItems(data.apps);

		for (const app of sortedApps) {
			const row = tbody.createEl("tr");
			row.createEl("td", { text: app.name });
			row.createEl("td", { text: formatSecondsToHoursMinutes(app.duration) });

			const percentage = data.totalActiveTime > 0 ? (app.duration / data.totalActiveTime) * 100 : 0;
			row.createEl("td", { text: `${percentage.toFixed(1)}%` });
		}
	}

	private sortItems(apps: Array<{ name: string; duration: number }>): Array<{ name: string; duration: number }> {
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
}
