import { type PrismaCalendarData, parsePrismaCalendarBlock } from "../../types/prisma-calendar";
import { addCls, cls } from "../../utils/css";
import { formatSecondsToHours, formatSecondsToHoursMinutes } from "../../utils/time-budget-utils";
import { BaseIntegrationBlockRenderer, type IntegrationEntry } from "../shared/base-integration-block";

export class PrismaCalendarBlockRenderer extends BaseIntegrationBlockRenderer<PrismaCalendarData> {
	protected blockCssClass = "prisma-calendar-block";
	protected initCssClass = "periodic-planner-prisma-calendar-initialized";
	protected errorLabel = "Warning: Invalid Prisma Calendar data format";

	protected parseData(source: string): PrismaCalendarData | null {
		return parsePrismaCalendarBlock(source);
	}

	protected getEntries(data: PrismaCalendarData): IntegrationEntry[] {
		return data.entries;
	}

	protected chartTitle(data: PrismaCalendarData): string {
		const modeLabel = data.mode === "category" ? "Category" : "Name";
		return `Prisma Calendar — ${modeLabel} Summary`;
	}

	protected formatChartValue(value: number): string {
		return formatSecondsToHoursMinutes(value / 1000);
	}

	protected durationToHours(duration: number): number {
		return duration / 3_600_000;
	}

	protected renderHeader(el: HTMLElement, data: PrismaCalendarData): void {
		const header = el.createDiv({ cls: cls("time-budget-header") });

		const modeLabel = data.mode === "category" ? "Category" : "Name";
		const title = header.createEl("h3", { text: `Prisma Calendar — ${modeLabel} Summary` });
		addCls(title, "time-budget-title");

		const totalHours = formatSecondsToHours(data.totalDuration / 1000);

		const summary = header.createDiv({ cls: cls("time-budget-summary") });
		const statsRow = summary.createDiv({ cls: cls("stats-row") });

		const totalItem = statsRow.createDiv({ cls: cls("stat-item") });
		totalItem.createSpan({ text: "Total Time", cls: cls("stat-label") });
		totalItem.createSpan({ text: `${totalHours}h`, cls: cls("stat-value") });

		const eventsItem = statsRow.createDiv({ cls: cls("stat-item") });
		eventsItem.createSpan({ text: "Events", cls: cls("stat-label") });
		eventsItem.createSpan({ text: `${data.totalEvents}`, cls: cls("stat-value") });

		if (data.doneEvents > 0 || data.undoneEvents > 0) {
			const doneItem = statsRow.createDiv({ cls: cls("stat-item") });
			doneItem.createSpan({ text: "Done", cls: cls("stat-label") });
			doneItem.createSpan({
				text: `${data.doneEvents}/${data.doneEvents + data.undoneEvents}`,
				cls: cls("stat-value"),
			});
		}
	}

	protected renderTable(el: HTMLElement, data: PrismaCalendarData): void {
		if (data.entries.length === 0) {
			const emptyEl = el.createDiv({ cls: cls("time-budget-empty") });
			emptyEl.setText("No calendar data available");
			return;
		}

		const table = el.createEl("table", { cls: cls("allocation-table") });
		const thead = table.createEl("thead");
		const headerRow = thead.createEl("tr");

		this.createSortableHeader(headerRow, data.mode === "category" ? "Category" : "Event", "name");
		this.createSortableHeader(headerRow, "Duration", "duration");
		headerRow.createEl("th", { text: "%" });
		this.createSortableHeader(headerRow, "Count", "count");

		const tbody = table.createEl("tbody");
		const sortedEntries = this.sortItems(data.entries);

		for (const entry of sortedEntries) {
			const row = tbody.createEl("tr");
			row.createEl("td", { text: entry.name });
			row.createEl("td", { text: entry.durationFormatted });
			row.createEl("td", { text: entry.percentage });
			row.createEl("td", { text: `${entry.count}` });
		}
	}

	private sortItems(entries: PrismaCalendarData["entries"]): PrismaCalendarData["entries"] {
		const sorted = [...entries];

		sorted.sort((a, b) => {
			let comparison = 0;
			if (this.sortColumn === "name") {
				comparison = a.name.localeCompare(b.name);
			} else if (this.sortColumn === "duration") {
				comparison = a.duration - b.duration;
			} else if (this.sortColumn === "count") {
				comparison = a.count - b.count;
			}
			return this.sortDirection === "asc" ? comparison : -comparison;
		});

		return sorted;
	}
}
