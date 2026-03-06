import type { DateTime } from "luxon";
import type { PeriodType } from "../constants";
import { PERIOD_TYPE_LABELS } from "../constants";
import type { BasesViewSettings } from "../types/schemas";
import { formatPeriodIntervalForBases } from "../utils/date-utils";

export interface BasesMarkdownOptions {
	periodType: PeriodType;
	periodName: string;
	periodStart: DateTime;
	periodEnd: DateTime;
	settings: BasesViewSettings;
}

export function generateBasesMarkdown(options: BasesMarkdownOptions): string {
	const { periodType, periodStart, periodEnd, settings } = options;
	const { tasksDirectory, dateProperty, propertiesToShow, dateColumnSize } = settings;

	const noteProp = `note["${dateProperty}"]`;
	const orderSection = buildOrderSection(propertiesToShow, dateProperty);

	const { start: startDateWithoutTz, end: endDateWithoutTz } = formatPeriodIntervalForBases(periodStart, periodEnd);

	return `
\`\`\`base
views:
  - type: table
    name: ${PERIOD_TYPE_LABELS[periodType]} Tasks${orderSection}
    filters:
      and:
        - file.inFolder("${tasksDirectory}")
        - ${noteProp} > "${startDateWithoutTz}"
        - ${noteProp} < "${endDateWithoutTz}"
    sort:
      - property: ${noteProp}
        direction: DESC
    columnSize:
      ${noteProp}: ${dateColumnSize}
\`\`\`
`;
}

function buildOrderSection(propertiesToShow: string, dateProperty: string): string {
	const props = [
		"file.name",
		`note["${dateProperty}"]`,
		...(propertiesToShow
			? propertiesToShow
					.split(",")
					.map((p) => p.trim())
					.filter(Boolean)
					.map((p) => `note["${p}"]`)
			: []),
	];

	return `
    order:
${props.map((p) => `      - ${p}`).join("\n")}`;
}
