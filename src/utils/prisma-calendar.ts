import type { DateTime } from "luxon";
import type { PeriodType } from "../constants";
import { PrismaCalendarService } from "../services/prisma-calendar";
import { IntegrationInjector } from "./integration-shared";

export class PrismaCalendarInjector extends IntegrationInjector {
	protected integrationName = "PrismaCalendar";

	protected isEnabled(): boolean {
		return this.settings.prismaCalendar.enabled;
	}

	protected getHeading(): string {
		return this.settings.prismaCalendar.heading;
	}

	protected getPastCheckDate(_periodStart: DateTime, periodEnd: DateTime): DateTime {
		return periodEnd;
	}

	protected getFolders(): string[] {
		return [
			this.settings.directories.dailyFolder,
			this.settings.directories.weeklyFolder,
			this.settings.directories.monthlyFolder,
			this.settings.directories.quarterlyFolder,
			this.settings.directories.yearlyFolder,
		];
	}

	protected isValidPeriodType(): boolean {
		return true;
	}

	protected async fetchAndGenerateCodeBlock(
		periodStart: DateTime,
		periodEnd: DateTime,
		periodType: PeriodType
	): Promise<string | null> {
		const service = new PrismaCalendarService();
		const data = await service.getStatisticsForPeriod(
			periodStart,
			periodEnd,
			periodType,
			this.settings.prismaCalendar.mode
		);
		if (!data) return null;
		return PrismaCalendarService.generateCodeBlock(data, this.settings.prismaCalendar.codeFence);
	}
}
