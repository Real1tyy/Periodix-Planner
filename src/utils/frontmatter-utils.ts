import type { App, CachedMetadata, TFile } from "obsidian";
import type { PeriodType } from "../constants";
import type { PeriodLinks, PropertySettings } from "../types";
import type { PeriodInfo } from "./date-utils";

export function extractLinkTarget(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const match = value.match(/\[\[([^\]|]+)/);
	return match ? match[1]?.trim() : null;
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
	return getLinkFromFrontmatter(cache, props.parentProp);
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

export function extractParentLinksFromFrontmatter(
	frontmatter: Record<string, unknown>,
	props: PropertySettings
): {
	parent?: string;
	week?: string;
	month?: string;
	quarter?: string;
	year?: string;
} {
	return {
		parent: extractLinkTarget(frontmatter[props.parentProp]) ?? undefined,
		week: extractLinkTarget(frontmatter[props.weekProp]) ?? undefined,
		month: extractLinkTarget(frontmatter[props.monthProp]) ?? undefined,
		quarter: extractLinkTarget(frontmatter[props.quarterProp]) ?? undefined,
		year: extractLinkTarget(frontmatter[props.yearProp]) ?? undefined,
	};
}

export function resolveFilePath(linkPath: string): string {
	return linkPath.endsWith(".md") ? linkPath : `${linkPath}.md`;
}

export function extractFilenameFromPath(filePath: string): string {
	const pathWithoutExt = filePath.replace(/\.md$/, "");
	const parts = pathWithoutExt.split("/");
	return parts[parts.length - 1] || pathWithoutExt;
}

interface ParsedWikiLink {
	fullPath: string;
	fileName: string;
	alias: string | null;
}

export function createWikiLink(fullPath: string, alias: string): string {
	const cleanPath = fullPath.replace(/\.md$/, "");
	return `[[${cleanPath}|${alias}]]`;
}

export function parseWikiLink(link: string): ParsedWikiLink | null {
	if (typeof link !== "string") return null;

	const match = link.match(/\[\[([^\]]+)\]\]/);
	if (!match) return null;

	const content = match[1];
	const pipeIndex = content.indexOf("|");

	let fullPath: string;
	let alias: string | null;

	if (pipeIndex >= 0) {
		fullPath = content.slice(0, pipeIndex).trim();
		alias = content.slice(pipeIndex + 1).trim() || null;
	} else {
		fullPath = content.trim();
		alias = null;
	}

	if (!fullPath) return null;

	const pathParts = fullPath.split("/");
	const fileName = pathParts[pathParts.length - 1] || fullPath;

	return {
		fullPath: fullPath.replace(/\.md$/, ""),
		fileName: fileName.replace(/\.md$/, ""),
		alias,
	};
}

export function assignPeriodPropertiesToFrontmatter(
	fm: Record<string, unknown>,
	props: PropertySettings,
	periodType: PeriodType,
	periodInfo: PeriodInfo,
	links: PeriodLinks,
	hoursAvailable: number,
	onlyIfUndefined: boolean = false
): void {
	const setIfNeeded = (key: string, value: unknown): void => {
		if (onlyIfUndefined && fm[key] !== undefined) return;
		fm[key] = value;
	};

	const setLinkIfNeeded = (propKey: string, link: string | null | undefined): void => {
		if (!link) return;
		if (onlyIfUndefined && fm[propKey] !== undefined) return;
		fm[propKey] = link;
	};

	setIfNeeded(props.periodTypeProp, periodType);
	setIfNeeded(props.periodStartProp, periodInfo.start);
	setIfNeeded(props.periodEndProp, periodInfo.end);

	setLinkIfNeeded(props.previousProp, links.previous);
	setLinkIfNeeded(props.nextProp, links.next);
	setLinkIfNeeded(props.parentProp, links.parent);
	setLinkIfNeeded(props.weekProp, links.week);
	setLinkIfNeeded(props.monthProp, links.month);
	setLinkIfNeeded(props.quarterProp, links.quarter);
	setLinkIfNeeded(props.yearProp, links.year);

	setIfNeeded(props.hoursAvailableProp, hoursAvailable);
}
