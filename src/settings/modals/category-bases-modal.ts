import type { App } from "obsidian";
import { BaseBasesModal } from "../../components/shared/base-bases-modal";
import type { SettingsStore } from "../../core/settings-store";
import type { IndexedPeriodNote } from "../../types/period";
import { buildBasesFilePathFilters } from "../../utils/bases-utils";

export class CategoryBasesModal extends BaseBasesModal {
	constructor(
		app: App,
		private categoryName: string,
		private notes: IndexedPeriodNote[],
		settingsStore: SettingsStore
	) {
		super(app, settingsStore);
	}

	protected getModalCssClass(): string {
		return "category-bases-modal";
	}

	protected getTitle(): string {
		return `Category: ${this.categoryName}`;
	}

	protected getSourcePath(): string {
		return "";
	}

	protected buildFilterSection(): string {
		const filePathFilters = buildBasesFilePathFilters(this.notes);
		return `filters:
  or:
${filePathFilters}`;
	}
}
