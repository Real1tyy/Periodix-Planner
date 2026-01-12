import { Setting } from "obsidian";
import type { Subscription } from "rxjs";
import { PieChartRenderer } from "../../components/shared/pie-chart";
import { SETTINGS_DEFAULTS } from "../../constants";
import type { CategoryTracker, GlobalStatistics, GlobalStatisticsAggregator } from "../../core";
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
	private trackerSubscription: Subscription | null = null;

	constructor(
		private settingsStore: SettingsStore,
		private globalStatsAggregator: GlobalStatisticsAggregator,
		private categoryTracker: CategoryTracker
	) {}

	render(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Time categories").setHeading();

		containerEl.createEl("p", {
			text: "Categories are automatically discovered from your periodic notes. Configure their colors below.",
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

		if (this.categoryTracker) {
			this.trackerSubscription = this.categoryTracker.events$.subscribe(() => {
				if (this.categoriesContainer) {
					this.renderCategories(this.categoriesContainer);
				}
			});
		}

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

		const categoryMap = new Map(categories.map((c) => [c.name, c]));
		const labels: string[] = [];
		const values: number[] = [];
		const colors: string[] = [];

		for (const stat of statistics.categoryStats) {
			const category = categoryMap.get(stat.categoryName);
			if (stat.totalHours > 0) {
				labels.push(stat.categoryName);
				values.push(stat.totalHours);
				colors.push(category?.color || this.getDefaultColor(labels.length - 1));
			}
		}

		this.pieChartRenderer = new PieChartRenderer(container);
		this.pieChartRenderer.render({ labels, values, colors }, { valueFormatter: (value) => `${value.toFixed(1)}h` });
	}

	destroy(): void {
		this.statsSubscription?.unsubscribe();
		this.statsSubscription = null;
		this.trackerSubscription?.unsubscribe();
		this.trackerSubscription = null;
		this.pieChartRenderer?.destroy();
		this.pieChartRenderer = null;
	}

	private renderCategories(containerEl: HTMLElement): void {
		containerEl.empty();

		const categories = this.settingsStore.currentSettings.categories;
		const trackedCategories = this.categoryTracker?.getCategories() || new Map();

		if (categories.length === 0 && trackedCategories.size === 0) {
			containerEl.createEl("p", {
				text: "No categories defined yet. Categories will appear here once you allocate time in your periodic notes.",
				cls: "setting-item-description",
			});
			return;
		}

		const statistics = this.globalStatsAggregator?.getStatistics();
		const statsMap = new Map(statistics?.categoryStats.map((s) => [s.categoryName, s]) ?? []);

		const allCategoryNames = new Set<string>();
		for (const category of categories) {
			allCategoryNames.add(category.name);
		}
		for (const [name] of trackedCategories) {
			allCategoryNames.add(name);
		}

		const sortedNames = Array.from(allCategoryNames).sort((a, b) => {
			const statA = statsMap.get(a);
			const statB = statsMap.get(b);
			const hoursA = statA?.totalHours ?? 0;
			const hoursB = statB?.totalHours ?? 0;
			return hoursB - hoursA;
		});

		for (const categoryName of sortedNames) {
			const category = categories.find((c) => c.name === categoryName);
			const tracked = trackedCategories.get(categoryName);
			const stat = statsMap.get(categoryName);

			this.renderCategory(containerEl, categoryName, category, tracked, stat, statistics?.totalHours ?? 0);
		}
	}

	private renderCategory(
		containerEl: HTMLElement,
		categoryName: string,
		category: Category | undefined,
		tracked: { nodeCount: number; color: string } | undefined,
		stat: { totalHours: number; noteCount: number } | undefined,
		totalHours: number
	): void {
		const noteCount = stat?.noteCount ?? 0;
		const hours = stat?.totalHours ?? 0;
		const percentage = totalHours > 0 ? ((hours / totalHours) * 100).toFixed(1) : "0.0";

		const statsText = stat ? `${noteCount} notes · ${hours.toFixed(1)}h (${percentage}%)` : "Not used in any notes";

		const setting = new Setting(containerEl).setName(categoryName).setDesc(statsText);

		const color = category?.color || tracked?.color || this.getDefaultColor(0);
		const colorIndicator = setting.nameEl.createSpan({ cls: cls("category-color") });
		colorIndicator.style.backgroundColor = color;
		setting.nameEl.prepend(colorIndicator);

		setting.addColorPicker((picker) => {
			picker.setValue(color).onChange(async (value) => {
				await this.updateCategoryColor(categoryName, value);
			});
		});

		setting.addExtraButton((btn) => {
			btn
				.setIcon("trash")
				.setTooltip("Delete category")
				.onClick(async () => {
					await this.deleteCategory(categoryName);
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
			name: `Category ${categories.length + 1}`,
			color: SETTINGS_DEFAULTS.DEFAULT_CATEGORY_COLORS[colorIndex],
		};

		await this.settingsStore.updateSettings((s) => ({
			...s,
			categories: [...s.categories, newCategory],
		}));

		if (this.categoriesContainer) {
			this.renderCategories(this.categoriesContainer);
		}
	}

	private async updateCategoryColor(name: string, color: string): Promise<void> {
		await this.settingsStore.updateSettings((s) => {
			const existingCategory = s.categories.find((c) => c.name === name);
			if (existingCategory) {
				return {
					...s,
					categories: s.categories.map((c) => (c.name === name ? { ...c, color } : c)),
				};
			}
			return {
				...s,
				categories: [...s.categories, { name, color }],
			};
		});
	}

	private async deleteCategory(name: string): Promise<void> {
		await this.settingsStore.updateSettings((s) => ({
			...s,
			categories: s.categories.filter((c) => c.name !== name),
		}));
	}

	private getDefaultColor(index: number): string {
		return SETTINGS_DEFAULTS.DEFAULT_CATEGORY_COLORS[index % SETTINGS_DEFAULTS.DEFAULT_CATEGORY_COLORS.length];
	}
}
