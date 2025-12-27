import type { Category, TimeAllocation } from "../../types";
import { sortAllocationsByCategoryName } from "../../utils/time-budget-utils";
import { type PieChartData, PieChartRenderer } from "../shared/pie-chart";

function preparePieChartData(allocations: TimeAllocation[], categories: Category[]): PieChartData {
	const categoryMap = new Map(categories.map((c) => [c.id, c]));

	const labels: string[] = [];
	const values: number[] = [];
	const colors: string[] = [];

	const sortedAllocations = sortAllocationsByCategoryName(allocations, categories);

	for (const allocation of sortedAllocations) {
		const category = categoryMap.get(allocation.categoryId);
		if (category && allocation.hours > 0) {
			labels.push(category.name);
			values.push(allocation.hours);
			colors.push(category.color);
		}
	}

	return { labels, values, colors };
}

export function renderTimeBudgetPieChart(
	container: HTMLElement,
	allocations: TimeAllocation[],
	categories: Category[],
	title?: string
): PieChartRenderer {
	const renderer = new PieChartRenderer(container);
	const data = preparePieChartData(allocations, categories);
	renderer.render(data, { title, valueFormatter: (value) => `${value}h` });
	return renderer;
}

export { PieChartRenderer };
