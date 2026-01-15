import type { App } from "obsidian";
import { PERIOD_TYPE_LABELS, type PeriodType } from "../../constants";
import type { SettingsStore } from "../../core/settings-store";
import {
	type DirectorySettings,
	type GenerationSettings,
	ORDERED_PERIOD_TYPES,
	PERIOD_CONFIG,
	type PropertySettings,
} from "../../types";
import type { IndexedPeriodNote } from "../../types/period";
import { isPeriodTypeEnabled } from "../../utils/period-navigation";
import { BaseBasesModal } from "../shared/base-bases-modal";

export class PeriodChildrenBasesModal extends BaseBasesModal {
	constructor(
		app: App,
		private parent: IndexedPeriodNote,
		private directories: DirectorySettings,
		private properties: PropertySettings,
		private generationSettings: GenerationSettings,
		settingsStore: SettingsStore
	) {
		super(app, settingsStore, PeriodChildrenBasesModal.getVisiblePeriodTypes(parent, generationSettings));
	}

	private static getVisiblePeriodTypes(
		parent: IndexedPeriodNote,
		generationSettings: GenerationSettings
	): PeriodType[] {
		const parentIndex = ORDERED_PERIOD_TYPES.indexOf(parent.periodType);
		if (parentIndex === -1) return [];

		const childTypes = ORDERED_PERIOD_TYPES.slice(parentIndex + 1);

		return childTypes.filter((type) => isPeriodTypeEnabled(type, generationSettings));
	}

	protected getModalCssClass(): string {
		return "children-bases-modal";
	}

	protected getTitle(): string {
		return `${PERIOD_TYPE_LABELS[this.parent.periodType]}: ${this.parent.noteName}`;
	}

	protected getSourcePath(): string {
		return this.parent.file.path;
	}

	protected buildFilterSection(): string {
		const hierarchyFilter = this.buildHierarchyFilter();
		const childFolders = this.getChildFolders();

		if (childFolders.length === 0) {
			return "";
		}

		const orConditions = childFolders.map((folder) => `          - file.inFolder("${folder}")`).join("\n");

		return `filters:
  and:
    - or:
${orConditions}
${hierarchyFilter}`;
	}

	private getChildFolders(): string[] {
		const parentIndex = ORDERED_PERIOD_TYPES.indexOf(this.parent.periodType);
		if (parentIndex === -1) return [];

		const childTypes = ORDERED_PERIOD_TYPES.slice(parentIndex + 1);

		return childTypes
			.filter((type) => isPeriodTypeEnabled(type, this.generationSettings))
			.map((type) => this.directories[PERIOD_CONFIG[type].folderKey] as string);
	}

	private buildHierarchyFilter(): string {
		const filePath = this.parent.file.path.replace(/\.md$/, "");
		const noteName = this.parent.noteName;
		const linkKey = PERIOD_CONFIG[this.parent.periodType].linkKey;
		const propKey = linkKey ? (`${linkKey}Prop` as keyof PropertySettings) : null;
		const hierarchyProp = propKey ? (this.properties[propKey] as string) : (this.properties.parentProp as string);
		return `    - ${hierarchyProp} == ["[[${filePath}|${noteName}]]"]`;
	}
}
