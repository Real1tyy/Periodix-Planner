import type { App, CachedMetadata, TFile } from "obsidian";
import type { PeriodType } from "../constants";
import type { PropertySettings } from "../types";

export function extractLinkTarget(value: string): string | null {
	const match = value.match(/\[\[([^\]|]+)/);
	return match ? match[1] : null;
}

export function getLinkFromFrontmatter(cache: CachedMetadata | null, propName: string): string | null {
	const value = cache?.frontmatter?.[propName] as string | undefined;
	if (!value) return null;
	return extractLinkTarget(value);
}

export function getPeriodTypeFromFrontmatter(cache: CachedMetadata | null, props: PropertySettings): PeriodType | null {
	const periodType = cache?.frontmatter?.[props.periodTypeProp] as PeriodType | undefined;
	return periodType ?? null;
}

export function getParentLinkFromFrontmatter(cache: CachedMetadata | null, props: PropertySettings): string | null {
	if (!cache?.frontmatter) return null;

	const periodType = getPeriodTypeFromFrontmatter(cache, props);
	if (!periodType) return null;

	const parentPropMap: Record<string, string> = {
		daily: props.weekProp,
		weekly: props.monthProp,
		monthly: props.quarterProp,
		quarterly: props.yearProp,
	};

	const parentProp = parentPropMap[periodType];
	if (!parentProp) return null;

	const value = cache.frontmatter[parentProp] as string | undefined;
	return value ? extractLinkTarget(value) : null;
}

export function resolveNoteFile(app: App, linkTarget: string): TFile | null {
	return app.metadataCache.getFirstLinkpathDest(linkTarget, "");
}

export async function openNoteFile(app: App, file: TFile): Promise<void> {
	await app.workspace.getLeaf().openFile(file);
}

export function getActiveFileCache(app: App): { file: TFile; cache: CachedMetadata } | null {
	const file = app.workspace.getActiveFile();
	if (!file) return null;

	const cache = app.metadataCache.getFileCache(file);
	if (!cache) return null;

	return { file, cache };
}
