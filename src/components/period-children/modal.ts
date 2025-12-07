import { type App, Modal } from "obsidian";
import { PERIOD_TYPE_LABELS } from "../../constants";
import type { IndexedPeriodNote, PeriodChildren } from "../../types";
import { cls } from "../../utils/css";
import { formatPeriodDateRange } from "../../utils/date-utils";

export class PeriodChildrenModal extends Modal {
	constructor(
		app: App,
		private parent: IndexedPeriodNote,
		private children: PeriodChildren,
		private onSelect: (entry: IndexedPeriodNote) => void
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass(cls("children-modal"));

		const title = `${PERIOD_TYPE_LABELS[this.parent.periodType]}: ${this.parent.noteName}`;
		contentEl.createEl("h2", { text: title });

		this.renderChildrenSection("Quarters", this.children.quarters);
		this.renderChildrenSection("Months", this.children.months);
		this.renderChildrenSection("Weeks", this.children.weeks);
		this.renderChildrenSection("Days", this.children.days);

		if (this.isEmpty()) {
			contentEl.createEl("p", {
				text: "No child notes found for this period.",
				cls: cls("empty-message"),
			});
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private renderChildrenSection(label: string, entries?: IndexedPeriodNote[]): void {
		if (!entries || entries.length === 0) return;

		const section = this.contentEl.createDiv({ cls: cls("children-section") });
		section.createEl("h3", { text: label });

		const list = section.createEl("ul", { cls: cls("children-list") });
		for (const entry of entries) {
			const item = list.createEl("li", { cls: cls("children-item") });
			const link = item.createEl("a", {
				text: entry.noteName,
				cls: cls("children-link"),
			});

			link.addEventListener("click", (e) => {
				e.preventDefault();
				this.onSelect(entry);
				this.close();
			});

			const dateRange = formatPeriodDateRange(entry.periodType, entry.periodStart, entry.periodEnd);
			if (dateRange) {
				item.createSpan({ text: ` (${dateRange})`, cls: cls("date-range") });
			}
		}
	}

	private isEmpty(): boolean {
		return (
			!this.children.quarters?.length &&
			!this.children.months?.length &&
			!this.children.weeks?.length &&
			!this.children.days?.length
		);
	}
}
