import { Setting } from "obsidian";
import type { Subscription } from "rxjs";
import { PieChartRenderer } from "../../components/shared/pie-chart";
import { PERIOD_TYPE_LABELS, type PeriodType } from "../../constants";
import type { CategoryTracker, GlobalStatisticsAggregator, PeriodTypeStatistics } from "../../core";
import type { SettingsStore } from "../../core/settings-store";
import type { Category } from "../../types";
import { ORDERED_PERIOD_TYPES } from "../../types/config";
import type { SettingsSection } from "../../types/settings";
import { getDefaultCategoryColor, hexToRgb } from "../../utils/color-utils";
import { cls } from "../../utils/css";
import { getEnabledPeriodTypes } from "../../utils/period-navigation";

type CatPeriodStat = { noteCount: number; totalHours: number };
type StatsIndex = Map<PeriodType, Map<string, CatPeriodStat>>;

type CategoryRowVM = {
	name: string;
	color: string;
	totalNotes: number;
	perPeriodNoteCounts: Partial<Record<PeriodType, number>>;
	selectedHours: number;
	selectedPct: string;
	statsText: string;
	sortKey: number;
};

export class CategoriesSection implements SettingsSection {
	readonly id = "categories";
	readonly label = "Categories";

	private categoriesContainer: HTMLElement | null = null;
	private statisticsContainer: HTMLElement | null = null;
	private pieChartRenderer: PieChartRenderer | null = null;
	private statsSubscription: Subscription | null = null;
	private trackerSubscription: Subscription | null = null;
	private selectedPeriodType: PeriodType | null = null;

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

		this.renderPeriodTypeSelector(containerEl);

		this.categoriesContainer = containerEl.createDiv({ cls: cls("categories-list") });
		this.renderCategories(this.categoriesContainer);

		this.trackerSubscription = this.categoryTracker.events$.subscribe(() => {
			if (this.categoriesContainer) this.renderCategories(this.categoriesContainer);
		});

		this.renderGlobalStatisticsSummary(containerEl);
	}

	destroy(): void {
		this.statsSubscription?.unsubscribe();
		this.statsSubscription = null;
		this.trackerSubscription?.unsubscribe();
		this.trackerSubscription = null;
		this.pieChartRenderer?.destroy();
		this.pieChartRenderer = null;
	}

	private renderPeriodTypeSelector(containerEl: HTMLElement): void {
		const enabledPeriods = getEnabledPeriodTypes(this.settingsStore.currentSettings.generation);
		if (enabledPeriods.length === 0) return;

		if (!this.selectedPeriodType || !enabledPeriods.includes(this.selectedPeriodType)) {
			this.selectedPeriodType = enabledPeriods[0];
		}

		new Setting(containerEl).setName("View statistics for").addDropdown((dropdown) => {
			for (const periodType of enabledPeriods) {
				dropdown.addOption(periodType, PERIOD_TYPE_LABELS[periodType]);
			}
			if (this.selectedPeriodType) {
				dropdown.setValue(this.selectedPeriodType);
			}

			dropdown.onChange((value) => {
				this.selectedPeriodType = value as PeriodType;
				if (this.categoriesContainer) this.renderCategories(this.categoriesContainer);
				this.updateGlobalStatistics();
			});
		});
	}

	private renderGlobalStatisticsSummary(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Global statistics").setHeading();

		containerEl.createEl("p", {
			text: "Total time allocation across all top-level periodic notes.",
			cls: "setting-item-description",
		});

		this.statisticsContainer = containerEl.createDiv({ cls: cls("global-statistics") });

		this.statsSubscription = this.globalStatsAggregator.events$.subscribe((event) => {
			if (event.type === "statistics-updated") this.updateGlobalStatistics();
		});

		this.updateGlobalStatistics();
	}

	private updateGlobalStatistics(): void {
		if (!this.selectedPeriodType) return;

		const statistics = this.globalStatsAggregator.getStatisticsForPeriodType(this.selectedPeriodType);
		if (statistics) this.renderPieChartSummary(statistics);
	}

	private renderPieChartSummary(statistics: PeriodTypeStatistics): void {
		if (!this.statisticsContainer) return;

		this.statisticsContainer.empty();

		if (statistics.categoryStats.length === 0) {
			this.statisticsContainer.createEl("p", {
				text: "No time allocations found. Create periodic notes and allocate time to see statistics.",
				cls: "setting-item-description",
			});
			return;
		}

		const chartContainer = this.statisticsContainer.createDiv({ cls: cls("statistics-chart") });
		this.renderPieChart(chartContainer, statistics, this.settingsStore.currentSettings.categories);
	}

	private renderPieChart(container: HTMLElement, statistics: PeriodTypeStatistics, categories: Category[]): void {
		this.pieChartRenderer?.destroy();

		const categoryMap = new Map(categories.map((c) => [c.name, c]));
		const labels: string[] = [];
		const values: number[] = [];
		const colors: string[] = [];

		let i = 0;
		for (const stat of statistics.categoryStats) {
			if (stat.totalHours <= 0) continue;
			labels.push(stat.categoryName);
			values.push(stat.totalHours);
			colors.push(categoryMap.get(stat.categoryName)?.color || getDefaultCategoryColor(i++));
		}

		this.pieChartRenderer = new PieChartRenderer(container);
		this.pieChartRenderer.render({ labels, values, colors }, { valueFormatter: (v) => `${v.toFixed(1)}h` });
	}

	private renderCategories(containerEl: HTMLElement): void {
		containerEl.empty();

		const settingsCategories = this.settingsStore.currentSettings.categories;
		const trackedCategories = this.categoryTracker.getCategories();

		if (settingsCategories.length === 0 && trackedCategories.size === 0) {
			containerEl.createEl("p", {
				text: "No categories defined yet. Categories will appear here once you allocate time in your periodic notes.",
				cls: "setting-item-description",
			});
			return;
		}

		const stats = this.globalStatsAggregator.getStatistics();
		const statsIndex = this.buildStatsIndex(stats.byPeriodType);

		const settingsCatByName = new Map(settingsCategories.map((c) => [c.name, c]));
		const allNames = new Set<string>([...settingsCategories.map((c) => c.name), ...trackedCategories.keys()]);

		const selectedStats = this.selectedPeriodType ? stats.byPeriodType.get(this.selectedPeriodType) : undefined;
		const selectedTotalHours = selectedStats?.totalHours ?? 0;

		const vms: CategoryRowVM[] = [];
		let colorFallbackIdx = 0;

		for (const name of allNames) {
			const perPeriodNoteCounts: Partial<Record<PeriodType, number>> = {};
			let totalNotes = 0;

			for (const pt of ORDERED_PERIOD_TYPES) {
				const s = statsIndex.get(pt)?.get(name);
				const count = s?.noteCount ?? 0;
				if (count > 0) perPeriodNoteCounts[pt] = count;
				totalNotes += count;
			}

			const selectedHours = this.selectedPeriodType
				? (statsIndex.get(this.selectedPeriodType)?.get(name)?.totalHours ?? 0)
				: 0;

			const pct =
				this.selectedPeriodType && selectedTotalHours > 0
					? ((selectedHours / selectedTotalHours) * 100).toFixed(1)
					: "0.0";

			const settingsCat = settingsCatByName.get(name);
			const tracked = trackedCategories.get(name);

			const color = settingsCat?.color || tracked?.color || getDefaultCategoryColor(colorFallbackIdx++);

			const statsText = this.formatStatsText({
				totalNotes,
				perPeriodNoteCounts,
				selectedPeriodType: this.selectedPeriodType,
				selectedHours,
				selectedPct: pct,
			});

			vms.push({
				name,
				color,
				totalNotes,
				perPeriodNoteCounts,
				selectedHours,
				selectedPct: pct,
				statsText,
				sortKey: this.selectedPeriodType ? selectedHours : totalNotes,
			});
		}

		vms.sort((a, b) => b.sortKey - a.sortKey || a.name.localeCompare(b.name));

		for (const vm of vms) {
			this.renderCategoryRow(containerEl, vm);
		}
	}

	private buildStatsIndex(byPeriodType: Map<PeriodType, PeriodTypeStatistics>): StatsIndex {
		const index: StatsIndex = new Map();

		for (const [pt, stats] of byPeriodType) {
			const catMap = new Map<string, CatPeriodStat>();
			for (const c of stats.categoryStats) {
				catMap.set(c.categoryName, { noteCount: c.noteCount, totalHours: c.totalHours });
			}
			index.set(pt, catMap);
		}

		return index;
	}

	private formatStatsText(args: {
		totalNotes: number;
		perPeriodNoteCounts: Partial<Record<PeriodType, number>>;
		selectedPeriodType: PeriodType | null;
		selectedHours: number;
		selectedPct: string;
	}): string {
		const { totalNotes, perPeriodNoteCounts, selectedPeriodType, selectedHours, selectedPct } = args;

		if (totalNotes === 0) return "Not used in any notes";

		const parts: string[] = [`Total: ${totalNotes} notes`];

		for (const pt of ORDERED_PERIOD_TYPES) {
			const n = perPeriodNoteCounts[pt];
			if (n && n > 0) parts.push(`${PERIOD_TYPE_LABELS[pt]}: ${n}`);
		}

		const firstLine = parts.join(" · ");

		if (selectedPeriodType) {
			return `${firstLine}\n${PERIOD_TYPE_LABELS[selectedPeriodType]} hours: ${selectedHours.toFixed(1)}h (${selectedPct}%)`;
		}

		return firstLine;
	}

	private renderCategoryRow(containerEl: HTMLElement, vm: CategoryRowVM): void {
		const setting = new Setting(containerEl).setName(vm.name);

		const settingEl = setting.settingEl;
		settingEl.addClass(cls("category-row"));

		const rgb = hexToRgb(vm.color);
		if (rgb) {
			settingEl.style.setProperty("--category-color-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
		}

		const descContainer = setting.descEl;
		descContainer.empty();

		const statsLines = vm.statsText.split("\n");
		for (const line of statsLines) {
			descContainer.createDiv({ text: line, cls: "setting-item-description" });
		}

		setting.addColorPicker((picker) => {
			picker.setValue(vm.color).onChange(async (value) => {
				await this.updateCategoryColor(vm.name, value);
			});
		});
	}

	private async updateCategoryColor(name: string, color: string): Promise<void> {
		await this.settingsStore.updateSettings((s) => {
			const existing = s.categories.find((c) => c.name === name);
			if (existing) {
				return { ...s, categories: s.categories.map((c) => (c.name === name ? { ...c, color } : c)) };
			}
			return { ...s, categories: [...s.categories, { name, color }] };
		});

		if (this.categoriesContainer) {
			this.renderCategories(this.categoriesContainer);
		}
	}
}
