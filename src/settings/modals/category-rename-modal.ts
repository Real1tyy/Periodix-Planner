import { type App, Modal, Notice, Setting } from "obsidian";
import type { PeriodIndex } from "../../core/period-index";
import type { SettingsStore } from "../../core/settings-store";
import { bulkRenameCategory } from "../../utils/category-operations";
import { cls } from "../../utils/css";

export class CategoryRenameModal extends Modal {
	private newCategoryName = "";
	private submitButton: HTMLButtonElement | null = null;

	constructor(
		app: App,
		private periodIndex: PeriodIndex,
		private settingsStore: SettingsStore,
		private oldCategoryName: string,
		private onSuccess: () => void
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;

		contentEl.empty();
		contentEl.addClass(cls("category-rename-modal"));

		contentEl.createEl("h2", { text: "Rename category" });

		const notesWithCategory = this.periodIndex
			.getAllNotes()
			.filter((note) => note.categoryAllocations.has(this.oldCategoryName));

		contentEl.createEl("p", {
			text: `This will rename "${this.oldCategoryName}" in ${notesWithCategory.length} note(s).`,
			cls: "setting-item-description",
		});

		new Setting(contentEl).setName("Current name").addText((text) => {
			text.setValue(this.oldCategoryName);
			text.setDisabled(true);
		});

		new Setting(contentEl).setName("New name").addText((text) => {
			text.setValue(this.newCategoryName);
			text.setPlaceholder("Enter new category name");
			text.onChange((value) => {
				this.newCategoryName = value.trim();
				this.updateSubmitButton();
			});
			text.inputEl.focus();
			text.inputEl.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					void this.handleSubmit();
				}
			});
		});

		const buttonContainer = contentEl.createDiv({ cls: cls("modal-buttons") });

		const cancelButton = buttonContainer.createEl("button", { text: "Cancel" });
		cancelButton.addEventListener("click", () => {
			this.close();
		});

		this.submitButton = buttonContainer.createEl("button", {
			text: "Rename",
			cls: "mod-cta",
		});
		this.submitButton.addEventListener("click", () => {
			void this.handleSubmit();
		});

		this.updateSubmitButton();
	}

	private updateSubmitButton(): void {
		if (!this.submitButton) return;

		const isValid = this.newCategoryName.length > 0 && this.newCategoryName !== this.oldCategoryName;
		this.submitButton.disabled = !isValid;
	}

	private async handleSubmit(): Promise<void> {
		if (!this.submitButton || this.submitButton.disabled) return;

		if (this.newCategoryName === this.oldCategoryName) {
			new Notice("New name must be different from the current name");
			return;
		}

		if (this.newCategoryName.length === 0) {
			new Notice("Category name cannot be empty");
			return;
		}

		this.submitButton.disabled = true;
		this.submitButton.setText("Renaming...");

		try {
			const result = await bulkRenameCategory(this.app, this.periodIndex, this.oldCategoryName, this.newCategoryName, {
				onComplete: () => {
					setTimeout(() => {
						this.onSuccess();
					}, 150);
				},
			});

			const oldCategory = this.settingsStore.currentSettings.categories.find((c) => c.name === this.oldCategoryName);
			if (oldCategory) {
				await this.settingsStore.updateSettings((s) => {
					const withoutOld = s.categories.filter((c) => c.name !== this.oldCategoryName);
					const existing = withoutOld.find((c) => c.name === this.newCategoryName);
					if (existing) {
						return s;
					}
					return {
						...s,
						categories: [...withoutOld, { name: this.newCategoryName, color: oldCategory.color }],
					};
				});
			}

			if (result.filesWithErrors.length > 0) {
				new Notice(
					`Renamed category in ${result.filesModified.length} note(s), but ${result.filesWithErrors.length} failed. Check console for details. Please restart Obsidian for changes to fully propagate.`
				);
				console.error("Errors renaming category:", result.filesWithErrors);
			} else {
				new Notice(
					`Successfully renamed category in ${result.filesModified.length} note(s). Please restart Obsidian for changes to fully propagate.`
				);
			}

			this.close();
		} catch (error) {
			new Notice(`Error renaming category: ${error instanceof Error ? error.message : String(error)}`);
			console.error("Error renaming category:", error);
			if (this.submitButton) {
				this.submitButton.disabled = false;
				this.submitButton.setText("Rename");
			}
		}
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
