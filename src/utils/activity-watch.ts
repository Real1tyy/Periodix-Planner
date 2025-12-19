import { DateTime } from "luxon";
import type { App, TFile } from "obsidian";
import { PERIOD_TYPES } from "../constants";
import { ActivityWatchService } from "../services/activity-watch";
import type { PeriodicPlannerSettings } from "../types";

export async function hasActivityWatchHeading(app: App, file: TFile, heading: string): Promise<boolean> {
	const content = await app.vault.read(file);
	return content.includes(heading);
}

export function isInPast(date: DateTime): boolean {
	const today = DateTime.now().startOf("day");
	return date < today;
}

export async function injectActivityWatchContent(
	app: App,
	file: TFile,
	date: DateTime,
	settings: PeriodicPlannerSettings
): Promise<void> {
	const { activityWatch } = settings;

	if (!activityWatch.enabled) return;
	if (await hasActivityWatchHeading(app, file, activityWatch.heading)) return;
	if (!isInPast(date)) return;

	try {
		const awService = new ActivityWatchService(activityWatch.apiUrl);
		const appData = await awService.getDailyAppUsage(date);
		const codeBlock = ActivityWatchService.generateActivityWatchCodeBlock(appData, activityWatch.codeFence);
		const content = `\n${activityWatch.heading}\n\n${codeBlock}\n`;

		const currentContent = await app.vault.read(file);
		await app.vault.modify(file, currentContent + content);
	} catch (error) {
		console.error(`[ActivityWatch] Failed to inject data for ${file.path}:`, error);
	}
}

export async function processAllDailyNotesForActivityWatch(app: App, settings: PeriodicPlannerSettings): Promise<void> {
	if (!settings.activityWatch.enabled) return;

	const dailyFolder = settings.directories.dailyFolder;
	const allFiles = app.vault.getMarkdownFiles();
	const dailyFiles = allFiles.filter((file) => file.path.startsWith(dailyFolder));

	const promises = dailyFiles.map(async (file) => {
		try {
			const cache = app.metadataCache.getFileCache(file);
			const frontmatter = cache?.frontmatter;
			if (!frontmatter) return false;

			const periodType = frontmatter[settings.properties.periodTypeProp];
			if (periodType !== PERIOD_TYPES.DAILY) return false;

			const periodStartStr = frontmatter[settings.properties.periodStartProp];
			if (!periodStartStr) return false;

			const date = DateTime.fromISO(periodStartStr);
			if (!date.isValid) return false;

			await injectActivityWatchContent(app, file, date, settings);
			return true;
		} catch (error) {
			console.error(`[ActivityWatch] Error processing ${file.path}:`, error);
			return false;
		}
	});

	const results = await Promise.all(promises);
	const processed = results.filter(Boolean).length;

	console.log(`[ActivityWatch] Processed ${processed} of ${dailyFiles.length} daily notes`);
}
