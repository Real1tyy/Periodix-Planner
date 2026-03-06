import type { DateTime } from "luxon";
import { PERIOD_TYPES, type PeriodType } from "../constants";
import { ActivityWatchService } from "../services/activity-watch";
import { IntegrationInjector } from "./integration-shared";

export class ActivityWatchInjector extends IntegrationInjector {
	protected integrationName = "ActivityWatch";

	protected isEnabled(): boolean {
		return this.settings.activityWatch.enabled;
	}

	protected getHeading(): string {
		return this.settings.activityWatch.heading;
	}

	protected getPastCheckDate(periodStart: DateTime): DateTime {
		return periodStart;
	}

	protected getFolders(): string[] {
		return [this.settings.directories.dailyFolder];
	}

	protected isValidPeriodType(periodType: PeriodType): boolean {
		return periodType === PERIOD_TYPES.DAILY;
	}

	protected async fetchAndGenerateCodeBlock(periodStart: DateTime): Promise<string | null> {
		const service = new ActivityWatchService(this.settings.activityWatch.apiUrl);
		const appData = await service.getDailyAppUsage(periodStart);
		return ActivityWatchService.generateActivityWatchCodeBlock(appData, this.settings.activityWatch.codeFence);
	}
}
