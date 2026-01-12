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

		if (this.globalStatsAggregator) {
			this.renderGlobalStatisticsSummary(containerEl);
		}
	}

	private renderGlobalStatisticsSummary(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Global statistics").setHeading();

		containerEl.createEl("p", {
			text: "Total time allocation across all top-level periodic notes.",
			cls: "setting-item-description",
		});

		this.statisticsContainer = containerEl.createDiv({ cls: cls("global-statistics") });

		const statistics = this.globalStatsAggregator?.getStatistics();
		if (statistics) {
			this.renderPieChartSummary(statistics);
		}

		this.statsSubscription =
			this.globalStatsAggregator?.events$.subscribe((event) => {
				if (event.type === "statistics-updated") {
					this.renderPieChartSummary(event.statistics);
					if (this.categoriesContainer) {
						this.renderCategories(this.categoriesContainer);
					}
				}
			}) ?? null;
	}

	private renderPieChartSummary(statistics: GlobalStatistics): void {
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

		const chartContainer = this.statisticsContainer.createDiv({ cls: cls("statistics-chart") });
		this.renderPieChart(chartContainer, statistics, categories);
	}

	private renderPieChart(container: HTMLElement, statistics: GlobalStatistics, categories: Category[]): void {
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

		const statistics = this.globalStatsAggregator?.getStatistics();
		const statsMap = new Map(statistics?.categoryStats.map((s) => [s.categoryId, s]) ?? []);

		const sortedCategories = [...categories].sort((a, b) => {
			const statA = statsMap.get(a.id);
			const statB = statsMap.get(b.id);
			const hoursA = statA?.totalHours ?? 0;
			const hoursB = statB?.totalHours ?? 0;
			return hoursB - hoursA;
		});

		for (const category of sortedCategories) {
			this.renderCategory(containerEl, category, statsMap, statistics?.totalHours ?? 0);
		}
	}

	private renderCategory(
		containerEl: HTMLElement,
		category: Category,
		statsMap: Map<string, { categoryId: string; totalHours: number; noteCount: number }>,
		totalHours: number
	): void {
		const stat = statsMap.get(category.id);
		const noteCount = stat?.noteCount ?? 0;
		const hours = stat?.totalHours ?? 0;
		const percentage = totalHours > 0 ? ((hours / totalHours) * 100).toFixed(1) : "0.0";

		const description = category.description || "No description";
		const statsText = stat
			? `${description} · ${noteCount} notes · ${hours.toFixed(1)}h (${percentage}%)`
			: description;

		const setting = new Setting(containerEl).setName(category.name).setDesc(statsText);

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
