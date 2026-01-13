import { type App, Modal, Notice } from "obsidian";
import type { PeriodIndex } from "../../core/period-index";
import { bulkDeleteCategory } from "../../utils/category-operations";
import { cls } from "../../utils/css";

export class CategoryDeleteModal extends Modal {
	private confirmButton: HTMLButtonElement | null = null;

	constructor(
		app: App,
		private periodIndex: PeriodIndex,
		private categoryName: string,
		private onSuccess: () => void
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;

		contentEl.empty();
		contentEl.addClass(cls("category-delete-confirm-modal"));

		contentEl.createEl("h2", { text: "Delete category" });

		const notesWithCategory = this.periodIndex
			.getAllNotes()
			.filter((note) => note.categoryAllocations.has(this.categoryName));

		contentEl.createEl("p", {
			text: `Are you sure you want to delete "${this.categoryName}"?`,
		});

		if (notesWithCategory.length > 0) {
			contentEl.createEl("p", {
				text: `This will remove the category from ${notesWithCategory.length} note(s).`,
				cls: "mod-warning",
			});
		} else {
			contentEl.createEl("p", {
				text: "This category is not currently used in any notes.",
				cls: "setting-item-description",
			});
		}

		const buttonContainer = contentEl.createDiv({ cls: cls("modal-buttons") });

		const cancelButton = buttonContainer.createEl("button", { text: "Cancel" });
		cancelButton.addEventListener("click", () => {
			this.close();
		});

		this.confirmButton = buttonContainer.createEl("button", {
			text: "Delete",
			cls: "mod-warning",
		});
		this.confirmButton.addEventListener("click", () => {
			void this.handleDelete();
		});
	}

	private async handleDelete(): Promise<void> {
		if (!this.confirmButton) return;

		this.confirmButton.disabled = true;
		this.confirmButton.setText("Deleting...");

		try {
			const result = await bulkDeleteCategory(this.app, this.periodIndex, this.categoryName, {
				onComplete: () => {
					setTimeout(() => {
						this.onSuccess();
					}, 150);
				},
			});

			if (result.filesWithErrors.length > 0) {
				new Notice(
					`Deleted category from ${result.filesModified.length} note(s), but ${result.filesWithErrors.length} failed. Check console for details. Please restart Obsidian for changes to fully propagate.`
				);
				console.error("Errors deleting category:", result.filesWithErrors);
			} else {
				new Notice(
					`Successfully deleted category from ${result.filesModified.length} note(s). Please restart Obsidian for changes to fully propagate.`
				);
			}

			this.close();
		} catch (error) {
			new Notice(`Error deleting category: ${error instanceof Error ? error.message : String(error)}`);
			console.error("Error deleting category:", error);
			if (this.confirmButton) {
				this.confirmButton.disabled = false;
				this.confirmButton.setText("Delete");
			}
		}
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
