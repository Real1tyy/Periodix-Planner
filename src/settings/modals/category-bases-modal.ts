import { type App, Component, MarkdownRenderer, Modal } from "obsidian";
import { PERIOD_TYPE_LABELS } from "../../constants";
import type { SettingsStore } from "../../core/settings-store";
import type { IndexedPeriodNote } from "../../types/period";
import { buildBasesFilePathFilters } from "../../utils/bases-utils";
import { cls } from "../../utils/css";
import { getEnabledPeriodTypes } from "../../utils/period-navigation";

export class CategoryBasesModal extends Modal {
	private component: Component;
	private markdownContainerEl: HTMLElement | null = null;

	constructor(
		app: App,
		private categoryName: string,
		private notes: IndexedPeriodNote[],
		private settingsStore: SettingsStore
	) {
		super(app);
		this.component = new Component();
	}

	onOpen(): void {
		this.component.load();
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass(cls("category-bases-modal"));

		contentEl.createEl("h2", { text: `Category: ${this.categoryName}` });

		this.markdownContainerEl = contentEl.createDiv({
			cls: cls("bases-markdown-container"),
		});

		void this.renderBasesView();
	}

	onClose(): void {
		this.component.unload();
		this.contentEl.empty();
		this.markdownContainerEl = null;
	}

	private async renderBasesView(): Promise<void> {
		if (!this.markdownContainerEl) return;

		this.markdownContainerEl.empty();

		const basesMarkdown = this.buildBasesMarkdown();

		await MarkdownRenderer.render(this.app, basesMarkdown, this.markdownContainerEl, "", this.component);
	}

	private buildBasesMarkdown(): string {
		const filePathFilters = buildBasesFilePathFilters(this.notes);
		const orderArray = this.buildOrderArray();
		const enabledPeriodTypes = getEnabledPeriodTypes(this.settingsStore.currentSettings.generation);

		const periodTypeProp = this.settingsStore.currentSettings.properties.periodTypeProp;

		const viewBlocks = enabledPeriodTypes.map((periodType) => {
			return `  - type: table
    name: ${PERIOD_TYPE_LABELS[periodType]}
    filters:
      and:
        - note["${periodTypeProp}"] == "${periodType}"`;
		});

		return `\`\`\`base
filters:
  or:
${filePathFilters}
views:
  - type: table
    name: All Periods
    order:
${orderArray}
    sort:
      - property: file.name
        direction: ASC
${viewBlocks.join("\n")}
\`\`\``;
	}

	private buildOrderArray(): string {
		const props = this.settingsStore.currentSettings.properties;
		const orderProperties = ["file.name", props.periodTypeProp, props.parentProp, props.hoursAvailableProp];

		return orderProperties.map((prop) => `      - ${prop}`).join("\n");
	}
}
