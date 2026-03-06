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

	const notePropFilter = `note["${dateProperty}"]`;
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
        - ${notePropFilter} > "${startDateWithoutTz}"
        - ${notePropFilter} < "${endDateWithoutTz}"
    sort:
      - property: ${dateProperty}
        direction: DESC
    columnSize:
      note.${dateProperty}: ${dateColumnSize}
\`\`\`
`;
}

function buildOrderSection(propertiesToShow: string, dateProperty: string): string {
	const properties = new Set<string>();

	properties.add("file.name");
	properties.add(dateProperty);
	if (propertiesToShow && propertiesToShow.trim() !== "") {
		const userProperties = propertiesToShow
			.split(",")
			.map((p) => p.trim())
			.filter((p) => p.length > 0);
		for (const prop of userProperties) {
			properties.add(prop);
		}
	}
	const orderArray = Array.from(properties)
		.map((prop) => `      - ${prop}`)
		.join("\n");
	return `
    order:
${orderArray}`;
}
