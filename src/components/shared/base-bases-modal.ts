import { type App, Component, MarkdownRenderer, Modal } from "obsidian";
import { PERIOD_TYPE_LABELS, type PeriodType } from "../../constants";
import type { SettingsStore } from "../../core/settings-store";
import { cls } from "../../utils/css";
import { getEnabledPeriodTypes } from "../../utils/period-navigation";

export abstract class BaseBasesModal extends Modal {
	protected component: Component;
	protected markdownContainerEl: HTMLElement | null = null;

	constructor(
		app: App,
		protected settingsStore: SettingsStore,
		protected visiblePeriodTypes?: PeriodType[]
	) {
		super(app);
		this.component = new Component();
	}

	onOpen(): void {
		this.component.load();
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass(cls(this.getModalCssClass()));

		contentEl.createEl("h2", { text: this.getTitle() });

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

	protected async renderBasesView(): Promise<void> {
		if (!this.markdownContainerEl) return;

		this.markdownContainerEl.empty();

		const basesMarkdown = this.buildBasesMarkdown();

		await MarkdownRenderer.render(
			this.app,
			basesMarkdown,
			this.markdownContainerEl,
			this.getSourcePath(),
			this.component
		);
	}

	protected buildBasesMarkdown(): string {
		const filterSection = this.buildFilterSection();
		const enabledPeriodTypes = getEnabledPeriodTypes(this.settingsStore.currentSettings.generation);

		const visibleTypes = this.visiblePeriodTypes
			? enabledPeriodTypes.filter((type) => this.visiblePeriodTypes?.includes(type))
			: enabledPeriodTypes;

		const periodTypeProp = this.settingsStore.currentSettings.properties.periodTypeProp;

		const allPeriodsOrderArray = this.buildOrderArray(true);
		const specificPeriodOrderArray = this.buildOrderArray(false);

		const viewBlocks = visibleTypes.map((periodType) => {
			return `  - type: table
    name: ${PERIOD_TYPE_LABELS[periodType]}
    filters:
      and:
        - note["${periodTypeProp}"] == "${periodType}"
    order:
${specificPeriodOrderArray}
    sort:
      - property: file.name
        direction: ASC`;
		});

		return `\`\`\`base
${filterSection}
views:
  - type: table
    name: All Periods
    order:
${allPeriodsOrderArray}
    sort:
      - property: file.name
        direction: ASC
${viewBlocks.join("\n")}
\`\`\``;
	}

	protected buildOrderArray(includeAllPeriods: boolean): string {
		const props = this.settingsStore.currentSettings.properties;
		const basesPropertiesToShow = this.settingsStore.currentSettings.basesView.propertiesToShow;
		const additionalProperties = basesPropertiesToShow
			? basesPropertiesToShow
					.split(",")
					.map((prop) => prop.trim())
					.filter((prop) => prop.length > 0)
			: [];

		const baseOrderProperties = [
			"file.name",
			...(includeAllPeriods ? [props.periodTypeProp] : []),
			props.parentProp,
			props.nextProp,
			props.previousProp,
			props.hoursAvailableProp,
			props.hoursSpentProp,
			...additionalProperties,
		];

		return baseOrderProperties.map((prop) => `      - ${prop}`).join("\n");
	}

	protected abstract getModalCssClass(): string;
	protected abstract getTitle(): string;
	protected abstract getSourcePath(): string;
	protected abstract buildFilterSection(): string;
}
