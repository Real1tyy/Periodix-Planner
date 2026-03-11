import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

import { generateBasesMarkdown } from "../src/core/bases";
import type { BasesViewSettings } from "../src/types/schemas";

function createSettings(overrides: Partial<BasesViewSettings> = {}): BasesViewSettings {
	return {
		tasksDirectory: "Tasks",
		dateProperty: "Sort Date",
		propertiesToShow: "Category, Goal, Status",
		showRibbonIcon: true,
		dateColumnSize: 150,
		sidebarPosition: "left",
		...overrides,
	};
}

describe("generateBasesMarkdown", () => {
	const periodStart = DateTime.fromISO("2026-03-09T00:00:00");
	const periodEnd = DateTime.fromISO("2026-03-15T23:59:59");

	it("uses note[] syntax only in filters, not in order section", () => {
		const result = generateBasesMarkdown({
			periodType: "daily",
			periodName: "2026-03-10",
			periodStart,
			periodEnd,
			settings: createSettings(),
		});

		const orderMatch = result.match(/order:\n((?:\s+- .+\n?)+)/);
		expect(orderMatch).toBeTruthy();
		const orderLines = orderMatch![1]
			.trim()
			.split("\n")
			.map((l) => l.trim());

		for (const line of orderLines) {
			expect(line).not.toMatch(/note\["/);
		}

		expect(orderLines).toContain("- file.name");
		expect(orderLines).toContain("- Sort Date");
		expect(orderLines).toContain("- Category");
		expect(orderLines).toContain("- Goal");
		expect(orderLines).toContain("- Status");
	});

	it("uses note[] syntax in filters", () => {
		const result = generateBasesMarkdown({
			periodType: "weekly",
			periodName: "2026-W11",
			periodStart,
			periodEnd,
			settings: createSettings(),
		});

		expect(result).toContain('note["Sort Date"] >');
		expect(result).toContain('note["Sort Date"] <');
	});

	it("handles empty propertiesToShow", () => {
		const result = generateBasesMarkdown({
			periodType: "daily",
			periodName: "2026-03-10",
			periodStart,
			periodEnd,
			settings: createSettings({ propertiesToShow: "" }),
		});

		const orderMatch = result.match(/order:\n((?:\s+- .+\n?)+)/);
		const orderLines = orderMatch![1]
			.trim()
			.split("\n")
			.map((l) => l.trim());

		expect(orderLines).toEqual(["- file.name", "- Sort Date"]);
	});

	it("handles single-word property names in order", () => {
		const result = generateBasesMarkdown({
			periodType: "monthly",
			periodName: "2026-03",
			periodStart,
			periodEnd,
			settings: createSettings({ dateProperty: "Date", propertiesToShow: "Status" }),
		});

		const orderMatch = result.match(/order:\n((?:\s+- .+\n?)+)/);
		const orderLines = orderMatch![1]
			.trim()
			.split("\n")
			.map((l) => l.trim());

		expect(orderLines).toContain("- Date");
		expect(orderLines).toContain("- Status");

		for (const line of orderLines) {
			expect(line).not.toMatch(/note\["/);
		}
	});
});
