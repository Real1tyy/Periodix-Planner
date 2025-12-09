import type { TFile, Vault } from "obsidian";
import { parseAllocationBlock } from "../components/time-budget/allocation-parser";
import type { IndexedPeriodNote, PeriodChildren, PeriodicPlannerSettings } from "../types";
import { PERIOD_CONFIG } from "../types";
import { FrontmatterSchema } from "../types/schemas";
import { extractParentLinksFromFrontmatter, resolveFilePath } from "./frontmatter-utils";
import { getHoursForPeriodType } from "./time-budget-utils";

export async function extractCategoryAllocations(vault: Vault, file: TFile): Promise<Map<string, number>> {
	const allocations = new Map<string, number>();

	try {
		const content = await vault.read(file);
		const codeBlockMatch = content.match(/```periodic-planner\n([\s\S]*?)```/);

		if (!codeBlockMatch) {
			return allocations;
		}

		const parsed = parseAllocationBlock(codeBlockMatch[1]);

		for (const allocation of parsed.allocations) {
			allocations.set(allocation.categoryName, allocation.hours);
		}
	} catch (error) {
		console.debug(`Error extracting allocations from ${file.path}:`, error);
	}

	return allocations;
}

export async function parseFileToNote(
	file: TFile,
	frontmatter: Record<string, unknown>,
	vault: Vault,
	settings: PeriodicPlannerSettings
): Promise<IndexedPeriodNote | null> {
	const props = settings.properties;

	const extracted = {
		periodType: frontmatter[props.periodTypeProp],
		periodStart: frontmatter[props.periodStartProp],
		periodEnd: frontmatter[props.periodEndProp],
	};

	const result = FrontmatterSchema.safeParse(extracted);
	if (!result.success) {
		console.debug(`File ${file.path} is not a valid periodic note:`, result.error.format());
		return null;
	}

	const parentLinks = extractParentLinksFromFrontmatter(frontmatter, props);

	const rawHours: unknown = frontmatter[props.hoursAvailableProp];
	const hoursAvailable =
		typeof rawHours === "number" ? rawHours : getHoursForPeriodType(settings.timeBudget, result.data.periodType);

	const categoryAllocations = await extractCategoryAllocations(vault, file);
	const totalHoursSpent = Array.from(categoryAllocations.values()).reduce((sum, hours) => sum + hours, 0);
	const roundedHoursSpent = Math.round(totalHoursSpent * 10) / 10;

	return {
		file,
		filePath: file.path,
		periodType: result.data.periodType,
		periodStart: result.data.periodStart,
		periodEnd: result.data.periodEnd,
		noteName: file.basename,
		mtime: file.stat.mtime,
		hoursAvailable,
		hoursSpent: roundedHoursSpent,
		parentLinks,
		categoryAllocations,
	};
}

export function getParentFilePathsFromLinks(
	note: IndexedPeriodNote
): Array<{ parentFilePath: string; childrenKey: keyof PeriodChildren }> {
	const results: Array<{ parentFilePath: string; childrenKey: keyof PeriodChildren }> = [];
	const childrenKey = PERIOD_CONFIG[note.periodType].childrenKey;
	if (!childrenKey) return results;

	const links = note.parentLinks;
	const parentLinkKeys = ["parent", "week", "month", "quarter", "year"] as const;

	for (const linkKey of parentLinkKeys) {
		const linkValue = links[linkKey];
		if (linkValue) {
			results.push({
				parentFilePath: resolveFilePath(linkValue),
				childrenKey,
			});
		}
	}

	return results;
}
