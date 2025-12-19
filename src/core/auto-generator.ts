import type { DateTime } from "luxon";
import type { App } from "obsidian";
import type { Observable, Subscription } from "rxjs";
import type { PeriodType } from "../constants";
import type { TemplateService } from "../services/template";
import { type NoteGenerationResult, ORDERED_PERIOD_TYPES, type PeriodicPlannerSettings } from "../types";
import { getNextPeriod, getStartOfPeriod, now } from "../utils/date-utils";
import { isPeriodTypeEnabled } from "../utils/period-navigation";
import { NoteGenerator } from "./note-generator";

export interface AutoGenerationSummary {
	created: number;
	existing: number;
	failed: number;
	results: Map<PeriodType, NoteGenerationResult[]>;
}

export class AutoGenerator {
	private settings: PeriodicPlannerSettings;
	private subscription: Subscription;
	private noteGenerator: NoteGenerator;

	constructor(app: App, settings$: Observable<PeriodicPlannerSettings>, templateService: TemplateService) {
		this.settings = null!;
		this.subscription = settings$.subscribe((settings) => {
			this.settings = settings;
		});
		this.noteGenerator = new NoteGenerator(app, settings$, templateService);
	}

	destroy(): void {
		this.subscription.unsubscribe();
		this.noteGenerator.destroy();
	}

	async runAutoGeneration(): Promise<AutoGenerationSummary> {
		const { generatePeriodsAhead } = this.settings.generation;
		const currentDt = now();

		const summary: AutoGenerationSummary = {
			created: 0,
			existing: 0,
			failed: 0,
			results: new Map(),
		};

		for (const periodType of ORDERED_PERIOD_TYPES) {
			if (!isPeriodTypeEnabled(periodType, this.settings.generation)) {
				continue;
			}

			const results = await this.generatePeriodsForType(currentDt, periodType, generatePeriodsAhead);
			summary.results.set(periodType, results);

			for (const result of results) {
				if (result.success) {
					if (result.alreadyExists) {
						summary.existing++;
					} else {
						summary.created++;
					}
				} else {
					summary.failed++;
				}
			}
		}

		return summary;
	}

	async generatePeriodsForType(
		baseDt: DateTime,
		periodType: PeriodType,
		periodsAhead: number
	): Promise<NoteGenerationResult[]> {
		const results: NoteGenerationResult[] = [];
		let currentPeriod = getStartOfPeriod(baseDt, periodType);

		for (let i = 0; i <= periodsAhead; i++) {
			const result = await this.noteGenerator.generateNote(currentPeriod, periodType);
			results.push(result);
			currentPeriod = getNextPeriod(currentPeriod, periodType);
		}

		return results;
	}

	async generateSingleNote(dt: DateTime, periodType: PeriodType): Promise<NoteGenerationResult> {
		return this.noteGenerator.generateNote(dt, periodType);
	}

	async generateAllForDate(dt: DateTime): Promise<Map<PeriodType, NoteGenerationResult>> {
		return this.noteGenerator.generateAllPeriodsForDate(dt);
	}

	shouldAutoGenerate(): boolean {
		return this.settings.generation.autoGenerateOnLoad;
	}

	getNoteGenerator(): NoteGenerator {
		return this.noteGenerator;
	}
}

export function formatAutoGenerationSummary(summary: AutoGenerationSummary): string {
	const lines: string[] = [];
	lines.push("Auto-generation complete:");
	lines.push(`  Created: ${summary.created}`);
	lines.push(`  Already existed: ${summary.existing}`);

	if (summary.failed > 0) {
		lines.push(`  Failed: ${summary.failed}`);
	}

	return lines.join("\n");
}
