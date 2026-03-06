import { DateTime } from "luxon";
import type { App, TFile } from "obsidian";
import pLimit from "p-limit";
import type { PeriodType } from "../constants";
import type { PeriodicPlannerSettings } from "../types";

export function isInPast(date: DateTime): boolean {
	const today = DateTime.now().startOf("day");
	return date < today;
}

export async function hasHeading(app: App, file: TFile, heading: string): Promise<boolean> {
	const content = await app.vault.read(file);
	return content.includes(heading);
}

export async function appendContentUnderHeading(
	app: App,
	file: TFile,
	heading: string,
	codeBlock: string
): Promise<void> {
	const content = `\n${heading}\n\n${codeBlock}\n`;
	const currentContent = await app.vault.read(file);
	await app.vault.modify(file, currentContent + content);
}

export function generateCodeBlock(data: unknown, codeFenceName: string): string {
	return `\`\`\`${codeFenceName}\n${JSON.stringify(data, null, 2)}\n\`\`\``;
}

export abstract class IntegrationInjector {
	constructor(
		protected app: App,
		protected settings: PeriodicPlannerSettings
	) {}

	protected abstract integrationName: string;

	protected abstract isEnabled(): boolean;
	protected abstract getHeading(): string;
	protected abstract getPastCheckDate(periodStart: DateTime, periodEnd: DateTime): DateTime;
	protected abstract getFolders(): string[];
	protected abstract isValidPeriodType(periodType: PeriodType): boolean;
	protected abstract fetchAndGenerateCodeBlock(
		periodStart: DateTime,
		periodEnd: DateTime,
		periodType: PeriodType
	): Promise<string | null>;

	checkEnabled(): boolean {
		return this.isEnabled();
	}

	async inject(file: TFile, periodStart: DateTime, periodEnd: DateTime, periodType: PeriodType): Promise<void> {
		if (!this.isEnabled()) return;
		if (!this.isValidPeriodType(periodType)) return;
		if (await hasHeading(this.app, file, this.getHeading())) return;
		if (!isInPast(this.getPastCheckDate(periodStart, periodEnd))) return;

		try {
			const codeBlock = await this.fetchAndGenerateCodeBlock(periodStart, periodEnd, periodType);
			if (!codeBlock) return;
			await appendContentUnderHeading(this.app, file, this.getHeading(), codeBlock);
		} catch (error) {
			console.error(`[${this.integrationName}] Failed to inject data for ${file.path}:`, error);
		}
	}

	async processAllNotes(): Promise<void> {
		if (!this.isEnabled()) return;

		const folders = this.getFolders();
		const allFiles = this.app.vault.getMarkdownFiles();
		const relevantFiles = allFiles.filter((file) => folders.some((folder) => file.path.startsWith(folder)));

		const limit = pLimit(this.settings.integrationConcurrency);
		const results = await Promise.all(relevantFiles.map((file) => limit(() => this.processFile(file))));

		const processed = results.filter(Boolean).length;
		console.log(`[${this.integrationName}] Processed ${processed} of ${relevantFiles.length} notes`);
	}

	private async processFile(file: TFile): Promise<boolean> {
		try {
			const cache = this.app.metadataCache.getFileCache(file);
			const frontmatter = cache?.frontmatter;
			if (!frontmatter) return false;

			const periodType = frontmatter[this.settings.properties.periodTypeProp] as PeriodType | undefined;
			if (!periodType || !this.isValidPeriodType(periodType)) return false;

			const periodStartStr = frontmatter[this.settings.properties.periodStartProp];
			const periodEndStr = frontmatter[this.settings.properties.periodEndProp];
			if (!periodStartStr || !periodEndStr) return false;

			const periodStart = DateTime.fromISO(periodStartStr);
			const periodEnd = DateTime.fromISO(periodEndStr);
			if (!periodStart.isValid || !periodEnd.isValid) return false;

			await this.inject(file, periodStart, periodEnd, periodType);
			return true;
		} catch (error) {
			console.error(`[${this.integrationName}] Error processing ${file.path}:`, error);
			return false;
		}
	}
}
