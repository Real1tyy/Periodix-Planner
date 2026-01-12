import type { Category, TimeAllocation } from "../../types";

interface ParsedAllocation {
	categoryName: string;
	hours: number;
}

interface AllocationParseResult {
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

	const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.name]));

	for (const allocation of parsed) {
		const categoryName = categoryMap.get(allocation.categoryName.toLowerCase());
		if (categoryName) {
			resolved.push({
				categoryName,
				hours: allocation.hours,
			});
		} else {
			unresolved.push(allocation.categoryName);
		}
	}

	return { resolved, unresolved };
}

export function serializeAllocations(allocations: TimeAllocation[]): string {
	return allocations.map((a) => `${a.categoryName}: ${a.hours}`).join("\n");
}

export function getTotalAllocatedHours(allocations: TimeAllocation[]): number {
	const sum = allocations.reduce((total, a) => total + a.hours, 0);
	return Math.round(sum * 10) / 10;
}
