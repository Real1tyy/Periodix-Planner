import { type App, Component, MarkdownRenderer, Modal } from "obsidian";
import { PERIOD_TYPE_LABELS, type PeriodType } from "../../constants";
import { type DirectorySettings, ORDERED_PERIOD_TYPES, PERIOD_CONFIG, type PropertySettings } from "../../types";
import type { IndexedPeriodNote } from "../../types/period";
import { addCls, cls, removeCls } from "../../utils/css";

type ChildPeriodType = Exclude<PeriodType, "yearly">;

interface BasesViewConfig {
	type: ChildPeriodType;
	label: string;
	folder: string;
}

export class PeriodChildrenBasesModal extends Modal {
	private component: Component;
	private selectedViewType: ChildPeriodType | "all" = "quarterly";
	private viewSelectorEl: HTMLElement | null = null;
	private markdownContainerEl: HTMLElement | null = null;
	private availableViews: BasesViewConfig[] = [];

	constructor(
		app: App,
		private parent: IndexedPeriodNote,
		private directories: DirectorySettings,
		private properties: PropertySettings
	) {
		super(app);
		this.component = new Component();
		this.availableViews = this.getAvailableViews();
		this.selectedViewType = this.availableViews[0]?.type ?? "quarterly";
	}

	onOpen(): void {
		this.component.load();
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass(cls("children-bases-modal"));

		const title = `${PERIOD_TYPE_LABELS[this.parent.periodType]}: ${this.parent.noteName}`;
		contentEl.createEl("h2", { text: title });

		this.createViewSelector();

		this.markdownContainerEl = contentEl.createDiv({
			cls: cls("bases-markdown-container"),
		});

		void this.renderSelectedView();
	}

	onClose(): void {
		this.component.unload();
		this.contentEl.empty();
		this.viewSelectorEl = null;
		this.markdownContainerEl = null;
	}

	private getAvailableViews(): BasesViewConfig[] {
		const parentIndex = ORDERED_PERIOD_TYPES.indexOf(this.parent.periodType);
		if (parentIndex === -1) return [];

		const childTypes = ORDERED_PERIOD_TYPES.slice(parentIndex + 1) as ChildPeriodType[];

		return childTypes.map((type) => ({
			type,
			label: PERIOD_TYPE_LABELS[type],
			folder: this.directories[PERIOD_CONFIG[type].folderKey],
		}));
	}

	private createViewSelector(): void {
		this.viewSelectorEl = this.contentEl.createDiv({
			cls: cls("bases-view-selector"),
		});

		for (const view of this.availableViews) {
			this.createViewButton(view.type, view.label);
		}

		if (this.availableViews.length > 1) {
			this.createViewButton("all", "All");
		}
	}

	private createViewButton(type: ChildPeriodType | "all", label: string): void {
		if (!this.viewSelectorEl) return;

		const button = this.viewSelectorEl.createEl("button", {
			text: label,
			cls: cls("bases-view-button"),
		});

		if (type === this.selectedViewType) {
			addCls(button, "is-active");
		}

		button.addEventListener("click", (e) => {
			e.preventDefault();
			this.selectedViewType = type;
			this.updateButtonStates();
			void this.renderSelectedView();
		});
	}

	private updateButtonStates(): void {
		if (!this.viewSelectorEl) return;

		const buttons = this.viewSelectorEl.querySelectorAll("button");
		const allViews = [...this.availableViews.map((v) => v.type), "all"];

		buttons.forEach((button, index) => {
			const viewType = allViews[index];
			if (viewType === this.selectedViewType) {
				addCls(button as HTMLElement, "is-active");
			} else {
				removeCls(button as HTMLElement, "is-active");
			}
		});
	}

	private async renderSelectedView(): Promise<void> {
		if (!this.markdownContainerEl) return;

		this.markdownContainerEl.empty();

		const basesMarkdown = this.buildBasesMarkdown();

		await MarkdownRenderer.render(
			this.app,
			basesMarkdown,
			this.markdownContainerEl,
			this.parent.file.path,
			this.component
		);
	}

	private buildBasesMarkdown(): string {
		if (this.selectedViewType === "all") {
			return this.buildAllViewsMarkdown();
		}

		const view = this.availableViews.find((v) => v.type === this.selectedViewType);
		if (!view) return "";

		return this.buildSingleViewMarkdown(view);
	}

	private buildSingleViewMarkdown(view: BasesViewConfig): string {
		const orderArray = this.buildOrderArray();
		const folder = view.folder;
		const hierarchyFilter = this.buildHierarchyFilter();

		return `\`\`\`base
views:
  - type: table
    name: ${view.label}
    filters:
      and:
        - file.inFolder("${folder}")
${hierarchyFilter}
    order:
${orderArray}
    sort:
      - property: file.name
        direction: ASC
\`\`\``;
	}

	private buildAllViewsMarkdown(): string {
		const orderArray = this.buildOrderArray();
		const hierarchyFilter = this.buildHierarchyFilter();
		const orConditions = this.availableViews.map((v) => `          - file.inFolder("${v.folder}")`).join("\n");

		return `\`\`\`base
views:
  - type: table
    name: All
    filters:
      and:
        - or:
${orConditions}
${hierarchyFilter}
    order:
${orderArray}
    sort:
      - property: file.name
        direction: ASC
\`\`\``;
	}

	private buildHierarchyFilter(): string {
		const filePath = this.parent.file.path.replace(/\.md$/, "");
		const noteName = this.parent.noteName;
		const linkKey = PERIOD_CONFIG[this.parent.periodType].linkKey;
		const propKey = linkKey ? (`${linkKey}Prop` as keyof PropertySettings) : null;
		const hierarchyProp = propKey ? this.properties[propKey] : this.properties.parentProp;
		return `        - ${hierarchyProp} == ["[[${filePath}|${noteName}]]"]`;
	}

	private buildOrderArray(): string {
		const props = this.properties;
		const orderProperties = [
			"file.name",
			props.parentProp,
			props.nextProp,
			props.previousProp,
			props.hoursAvailableProp,
		];

		return orderProperties.map((prop) => `      - ${prop}`).join("\n");
	}
}
