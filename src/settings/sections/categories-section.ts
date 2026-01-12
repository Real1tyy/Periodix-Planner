import { nanoid } from "nanoid";
import { Setting } from "obsidian";
import type { Subscription } from "rxjs";
import { PieChartRenderer } from "../../components/shared/pie-chart";
import { SETTINGS_DEFAULTS } from "../../constants";
import type { GlobalStatistics, GlobalStatisticsAggregator } from "../../core";
import type { SettingsStore } from "../../core/settings-store";
import type { Category } from "../../types";
import type { SettingsSection } from "../../types/settings";
import { cls } from "../../utils/css";

export class CategoriesSection implements SettingsSection {
	readonly id = "categories";
	readonly label = "Categories";

	private categoriesContainer: HTMLElement | null = null;
	private statisticsContainer: HTMLElement | null = null;
	private pieChartRenderer: PieChartRenderer | null = null;
	private statsSubscription: Subscription | null = null;

	constructor(
		private settingsStore: SettingsStore,
		private globalStatsAggregator?: GlobalStatisticsAggregator
	) {}

	render(containerEl: HTMLElement): void {
		if (this.globalStatsAggregator) {
			this.renderGlobalStatistics(containerEl);
		}

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

	private renderGlobalStatistics(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Global statistics").setHeading();

		containerEl.createEl("p", {
			text: "Total time allocation across all top-level periodic notes.",
			cls: "setting-item-description",
		});

		this.statisticsContainer = containerEl.createDiv({ cls: cls("global-statistics") });

		const statistics = this.globalStatsAggregator?.getStatistics();
		if (statistics) {
			this.renderStatistics(statistics);
		}

		this.statsSubscription =
			this.globalStatsAggregator?.events$.subscribe((event) => {
				if (event.type === "statistics-updated") {
					this.renderStatistics(event.statistics);
				}
			}) ?? null;
	}

	private renderStatistics(statistics: GlobalStatistics): void {
		if (!this.statisticsContainer) {
			return;
		}

		this.statisticsContainer.empty();

		const categories = this.settingsStore.currentSettings.categories;

		if (statistics.categoryStats.length === 0) {
			this.statisticsContainer.createEl("p", {
				text: "No time allocations found. Create periodic notes and allocate time to see statistics.",
				cls: "setting-item-description",
			});
			return;
		}

		const listContainer = this.statisticsContainer.createDiv({ cls: cls("statistics-list") });
		const table = listContainer.createEl("table", { cls: cls("statistics-table") });
		const thead = table.createEl("thead");
		const headerRow = thead.createEl("tr");
		headerRow.createEl("th", { text: "Category" });
		headerRow.createEl("th", { text: "Notes" });
		headerRow.createEl("th", { text: "Total Hours" });
		headerRow.createEl("th", { text: "Percentage" });

		const tbody = table.createEl("tbody");
		const categoryMap = new Map(categories.map((c) => [c.id, c]));

		for (const stat of statistics.categoryStats) {
			const category = categoryMap.get(stat.categoryId);
			if (!category) {
				continue;
			}

			const percentage =
				statistics.totalHours > 0 ? ((stat.totalHours / statistics.totalHours) * 100).toFixed(1) : "0.0";

			const row = tbody.createEl("tr");

			const nameCell = row.createEl("td");
			const colorIndicator = nameCell.createSpan({ cls: cls("category-color-inline") });
			colorIndicator.style.backgroundColor = category.color;
			nameCell.appendText(` ${category.name}`);

			row.createEl("td", { text: stat.noteCount.toString() });
			row.createEl("td", { text: `${stat.totalHours.toFixed(1)}h` });
			row.createEl("td", { text: `${percentage}%` });
		}

		const totalRow = tbody.createEl("tr", { cls: cls("statistics-total-row") });
		totalRow.createEl("td", { text: "Total" });
		totalRow.createEl("td", { text: statistics.totalNotes.toString() });
		totalRow.createEl("td", { text: `${statistics.totalHours.toFixed(1)}h` });
		totalRow.createEl("td", { text: "100%" });

		const chartContainer = this.statisticsContainer.createDiv({ cls: cls("statistics-chart") });
		this.renderPieChart(chartContainer, statistics, categories);
	}

	private renderPieChart(
		container: HTMLElement,
		statistics: NonNullable<ReturnType<NonNullable<typeof this.globalStatsAggregator>["getStatistics"]>>,
		categories: Category[]
	): void {
		if (this.pieChartRenderer) {
			this.pieChartRenderer.destroy();
		}

		const categoryMap = new Map(categories.map((c) => [c.id, c]));
		const labels: string[] = [];
		const values: number[] = [];
		const colors: string[] = [];

		for (const stat of statistics.categoryStats) {
			const category = categoryMap.get(stat.categoryId);
			if (category && stat.totalHours > 0) {
				labels.push(category.name);
				values.push(stat.totalHours);
				colors.push(category.color);
			}
		}

		this.pieChartRenderer = new PieChartRenderer(container);
		this.pieChartRenderer.render({ labels, values, colors }, { valueFormatter: (value) => `${value.toFixed(1)}h` });
	}

	destroy(): void {
		this.statsSubscription?.unsubscribe();
		this.statsSubscription = null;
		this.pieChartRenderer?.destroy();
		this.pieChartRenderer = null;
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
