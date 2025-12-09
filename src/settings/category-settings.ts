import { nanoid } from "nanoid";
import { Setting } from "obsidian";
import { SETTINGS_DEFAULTS } from "../constants";
import type { SettingsStore } from "../core/settings-store";
import type { Category } from "../types";
import { cls } from "../utils/css";

export class CategorySettings {
	private categoriesContainer: HTMLElement | null = null;

	constructor(private settingsStore: SettingsStore) {}

	display(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Time categories").setHeading();

		containerEl.createEl("p", {
			text: "Define categories for time allocation. These categories will be available when budgeting time in your periodic notes.",
			cls: "setting-item-description",
		});

		new Setting(containerEl).setName("Add new category").addButton((btn) => {
			btn
				.setButtonText("Add category")
				.setCta()
				.onClick(async () => {
					await this.addCategory();
				});
		});

		this.categoriesContainer = containerEl.createDiv({ cls: cls("categories-list") });
		this.renderCategories(this.categoriesContainer);
	}

	private renderCategories(containerEl: HTMLElement): void {
		containerEl.empty();

		const categories = this.settingsStore.currentSettings.categories;

		if (categories.length === 0) {
			containerEl.createEl("p", {
				text: "No categories defined yet. Add a category to start budgeting your time.",
				cls: "setting-item-description",
			});
			return;
		}

		for (const category of categories) {
			this.renderCategory(containerEl, category);
		}
	}

	private renderCategory(containerEl: HTMLElement, category: Category): void {
		const setting = new Setting(containerEl).setName(category.name).setDesc(category.description || "No description");

		const colorIndicator = setting.nameEl.createSpan({ cls: cls("category-color") });
		colorIndicator.style.backgroundColor = category.color;
		setting.nameEl.prepend(colorIndicator);

		setting.addExtraButton((btn) => {
			btn
				.setIcon("pencil")
				.setTooltip("Edit category")
				.onClick(() => {
					this.editCategory(category, containerEl);
				});
		});

		setting.addExtraButton((btn) => {
			btn
				.setIcon("trash")
				.setTooltip("Delete category")
				.onClick(async () => {
					await this.deleteCategory(category.id);
					this.renderCategories(containerEl.parentElement!.querySelector(`.${cls("categories-list")}`)!);
				});
		});
	}

	private async addCategory(): Promise<void> {
		const categories = this.settingsStore.currentSettings.categories;

		if (categories.length >= SETTINGS_DEFAULTS.MAX_CATEGORIES) {
			return;
		}

		const colorIndex = categories.length % SETTINGS_DEFAULTS.DEFAULT_CATEGORY_COLORS.length;
		const newCategory: Category = {
			id: nanoid(),
			name: `Category ${categories.length + 1}`,
			color: SETTINGS_DEFAULTS.DEFAULT_CATEGORY_COLORS[colorIndex],
			createdAt: Date.now(),
		};

		await this.settingsStore.updateSettings((s) => ({
			...s,
			categories: [...s.categories, newCategory],
		}));

		if (this.categoriesContainer) {
			this.renderCategories(this.categoriesContainer);
		}
	}

	private editCategory(category: Category, containerEl: HTMLElement): void {
		const setting = new Setting(containerEl).setClass(cls("category-edit"));

		setting.addText((text) => {
			text
				.setPlaceholder("Category name")
				.setValue(category.name)
				.onChange(async (value) => {
					await this.updateCategory(category.id, { name: value });
				});
		});

		setting.addColorPicker((picker) => {
			picker.setValue(category.color).onChange(async (value) => {
				await this.updateCategory(category.id, { color: value });
			});
		});

		setting.addText((text) => {
			text
				.setPlaceholder("Description (optional)")
				.setValue(category.description || "")
				.onChange(async (value) => {
					await this.updateCategory(category.id, { description: value || undefined });
				});
		});

		setting.addButton((btn) => {
			btn.setButtonText("Done").onClick(() => {
				this.renderCategories(containerEl.parentElement!.querySelector(`.${cls("categories-list")}`)!);
			});
		});
	}

	private async updateCategory(id: string, updates: Partial<Category>): Promise<void> {
		await this.settingsStore.updateSettings((s) => ({
			...s,
			categories: s.categories.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c)),
		}));
	}

	private async deleteCategory(id: string): Promise<void> {
		await this.settingsStore.updateSettings((s) => ({
			...s,
			categories: s.categories.filter((c) => c.id !== id),
		}));
	}
}
