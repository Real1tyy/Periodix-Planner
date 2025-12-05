import type { Category, TimeAllocation } from "../../types";

export interface ParsedAllocation {
	categoryName: string;
	hours: number;
}

export interface AllocationParseResult {
	allocations: ParsedAllocation[];
	errors: string[];
}

export function parseAllocationBlock(content: string): AllocationParseResult {
	const allocations: ParsedAllocation[] = [];
	const errors: string[] = [];

	const lines = content.split("\n").filter((line) => line.trim().length > 0);

	for (const line of lines) {
		const trimmed = line.trim();
		const match = trimmed.match(/^([^:]+):\s*(\d+(?:\.\d+)?)\s*$/);

		if (match) {
			const categoryName = match[1].trim();
			const hours = Number.parseFloat(match[2]);

			if (categoryName && !Number.isNaN(hours) && hours >= 0) {
				allocations.push({ categoryName, hours });
			} else {
				errors.push(`Invalid allocation: ${trimmed}`);
			}
		} else if (trimmed.length > 0) {
			errors.push(`Cannot parse line: ${trimmed}`);
		}
	}

	return { allocations, errors };
}

export function resolveAllocations(
	parsed: ParsedAllocation[],
	categories: Category[]
): { resolved: TimeAllocation[]; unresolved: string[] } {
	const resolved: TimeAllocation[] = [];
	const unresolved: string[] = [];

	const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c]));

	for (const allocation of parsed) {
		const category = categoryMap.get(allocation.categoryName.toLowerCase());
		if (category) {
			resolved.push({
				categoryId: category.id,
				hours: allocation.hours,
			});
		} else {
			unresolved.push(allocation.categoryName);
		}
	}

	return { resolved, unresolved };
}

export function serializeAllocations(allocations: TimeAllocation[], categories: Category[]): string {
	const categoryMap = new Map(categories.map((c) => [c.id, c]));

	return allocations
		.map((a) => {
			const category = categoryMap.get(a.categoryId);
			return category ? `${category.name}: ${a.hours}` : null;
		})
		.filter(Boolean)
		.join("\n");
}

export function getTotalAllocatedHours(allocations: TimeAllocation[]): number {
	const sum = allocations.reduce((total, a) => total + a.hours, 0);
	return Math.round(sum * 10) / 10;
}
