import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins";
import type { App } from "obsidian";
import { Notice, Setting } from "obsidian";

import { SETTINGS_DEFAULTS } from "../../constants";
import type { SettingsStore } from "../../core/settings-store";
import { PrismaCalendarService } from "../../services/prisma-calendar";
import type { PeriodicPlannerSettingsSchema } from "../../types";
import type { SettingsSection } from "../../types/settings";
import { ActivityWatchInjector } from "../../utils/activity-watch";
import { IntegrationInjector } from "../../utils/integration-shared";
import { PrismaCalendarInjector } from "../../utils/prisma-calendar";

export class IntegrationsSection implements SettingsSection {
	readonly id = "integrations";
	readonly label = "Integrations";

	constructor(
		private uiBuilder: SettingsUIBuilder<typeof PeriodicPlannerSettingsSchema>,
		private settingsStore: SettingsStore,
		private app: App
	) {}

	render(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Integrations").setHeading();

		containerEl.createEl("p", {
			text: "Configure third-party integrations to enhance your periodic planning workflow.",
			cls: "setting-item-description",
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "integrationConcurrency",
			name: "Batch processing concurrency",
			desc: "Maximum number of notes to process in parallel when running batch operations",
			min: 1,
			max: 100,
			step: 1,
		});

		new Setting(containerEl).setName("ActivityWatch").setHeading();

		containerEl.createEl("p", {
			text: "Connect to ActivityWatch to automatically track and visualize your computer usage in daily notes. ActivityWatch data is only added to past daily notes.",
			cls: "setting-item-description",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "activityWatch.enabled",
			name: "Enable ActivityWatch",
			desc: "Enable ActivityWatch integration for daily notes",
		});

		this.uiBuilder.addText(containerEl, {
			key: "activityWatch.apiUrl",
			name: "ActivityWatch API URL",
			desc: "The URL of your ActivityWatch server (default: http://localhost:5600)",
			placeholder: SETTINGS_DEFAULTS.ACTIVITY_WATCH_URL,
		});

		this.uiBuilder.addText(containerEl, {
			key: "activityWatch.heading",
			name: "ActivityWatch heading",
			desc: "The heading to use for ActivityWatch sections in daily notes",
			placeholder: SETTINGS_DEFAULTS.ACTIVITY_WATCH_HEADING,
		});

		this.uiBuilder.addText(containerEl, {
			key: "activityWatch.codeFence",
			name: "Code fence name",
			desc: "The code fence language identifier for ActivityWatch blocks (requires plugin reload to take effect)",
			placeholder: SETTINGS_DEFAULTS.ACTIVITY_WATCH_CODE_FENCE,
		});

		new Setting(containerEl).setName("Prisma Calendar").setHeading();

		const prismaDesc = containerEl.createEl("p", {
			cls: "setting-item-description",
		});
		prismaDesc.appendText("Connect to ");
		prismaDesc.createEl("a", {
			text: "Prisma Calendar",
			href: "https://github.com/Real1tyy/Prisma-Calendar",
		});
		prismaDesc.appendText(
			" to automatically embed event statistics in periodic notes. Statistics are only added to past periodic notes."
		);

		this.uiBuilder.addToggle(containerEl, {
			key: "prismaCalendar.enabled",
			name: "Enable Prisma Calendar",
			desc: "Enable Prisma Calendar integration for periodic notes. Requires Prisma Calendar Pro.",
			onChanged: () => {
				const enabled = this.settingsStore.currentSettings.prismaCalendar.enabled;
				if (!enabled) return;

				if (!PrismaCalendarService.isPrismaAvailable()) {
					new Notice("Prisma Calendar plugin is not installed or not enabled.");
					return;
				}

				if (!PrismaCalendarService.isPrismaPro()) {
					new Notice(
						"Prisma Calendar integration requires Prisma Calendar Pro. " +
							"Visit matejvavroproductivity.com/tools/prisma-calendar/ to upgrade."
					);
				}
			},
		});

		this.uiBuilder.addText(containerEl, {
			key: "prismaCalendar.heading",
			name: "Prisma Calendar heading",
			desc: "The heading to use for Prisma Calendar sections in periodic notes",
			placeholder: SETTINGS_DEFAULTS.PRISMA_CALENDAR_HEADING,
		});

		this.uiBuilder.addText(containerEl, {
			key: "prismaCalendar.codeFence",
			name: "Code fence name",
			desc: "The code fence language identifier for Prisma Calendar blocks (requires plugin reload to take effect)",
			placeholder: SETTINGS_DEFAULTS.PRISMA_CALENDAR_CODE_FENCE,
		});

		this.uiBuilder.addDropdown(containerEl, {
			key: "prismaCalendar.mode",
			name: "Aggregation mode",
			desc: "How to aggregate event statistics: by category or by event name",
			options: {
				category: "Category",
				name: "Event name",
			},
		});

		new Setting(containerEl).setName("Templater").setHeading();

		containerEl.createEl("p", {
			text: "Use Templater to create periodic notes from templates. Configure folder templates in Templater's settings to automatically apply templates when creating notes in specific directories.",
			cls: "setting-item-description",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "templater.enabled",
			name: "Enable Templater",
			desc: "Use Templater templates when creating periodic notes",
		});

		this.uiBuilder.addText(containerEl, {
			key: "templater.dailyTemplate",
			name: "Daily note template",
			desc: "Path to the template file for daily notes (e.g., Templates/Daily.md)",
			placeholder: "Templates/Daily.md",
		});

		this.uiBuilder.addText(containerEl, {
			key: "templater.weeklyTemplate",
			name: "Weekly note template",
			desc: "Path to the template file for weekly notes (e.g., Templates/Weekly.md)",
			placeholder: "Templates/Weekly.md",
		});

		this.uiBuilder.addText(containerEl, {
			key: "templater.monthlyTemplate",
			name: "Monthly note template",
			desc: "Path to the template file for monthly notes (e.g., Templates/Monthly.md)",
			placeholder: "Templates/Monthly.md",
		});

		this.uiBuilder.addText(containerEl, {
			key: "templater.quarterlyTemplate",
			name: "Quarterly note template",
			desc: "Path to the template file for quarterly notes (e.g., Templates/Quarterly.md)",
			placeholder: "Templates/Quarterly.md",
		});

		this.uiBuilder.addText(containerEl, {
			key: "templater.yearlyTemplate",
			name: "Yearly note template",
			desc: "Path to the template file for yearly notes (e.g., Templates/Yearly.md)",
			placeholder: "Templates/Yearly.md",
		});

		new Setting(containerEl).setName("Actions").setHeading();

		this.renderProcessButton(containerEl, {
			name: "Process all daily notes (ActivityWatch)",
			desc: "Scan all past daily notes and add ActivityWatch data to notes that don't have it yet. This will not affect today's note or future notes.",
			InjectorClass: ActivityWatchInjector,
			integrationLabel: "ActivityWatch",
		});

		this.renderProcessButton(containerEl, {
			name: "Process all periodic notes (Prisma Calendar)",
			desc: "Scan all past periodic notes and add Prisma Calendar statistics to notes that don't have them yet. This will not affect today's note or future notes. Requires Prisma Calendar Pro.",
			InjectorClass: PrismaCalendarInjector,
			integrationLabel: "Prisma Calendar",
			requiresPrismaPro: true,
		});
	}

	private renderProcessButton(
		containerEl: HTMLElement,
		config: {
			name: string;
			desc: string;
			InjectorClass: new (...args: ConstructorParameters<typeof IntegrationInjector>) => IntegrationInjector;
			integrationLabel: string;
			requiresPrismaPro?: boolean;
		}
	): void {
		new Setting(containerEl)
			.setName(config.name)
			.setDesc(config.desc)
			.addButton((button) => {
				button.setButtonText("Process now").onClick(async () => {
					if (config.requiresPrismaPro && !PrismaCalendarService.isPrismaPro()) {
						new Notice(
							"Prisma Calendar integration requires Prisma Calendar Pro. " +
								"Visit matejvavroproductivity.com/tools/prisma-calendar/ to upgrade."
						);
						return;
					}

					const settings = this.settingsStore.currentSettings;
					const injector = new config.InjectorClass(this.app, settings);

					if (!injector.checkEnabled()) {
						new Notice(`${config.integrationLabel} integration is disabled. Enable it first.`);
						return;
					}

					button.setDisabled(true);
					button.setButtonText("Processing...");

					try {
						await injector.processAllNotes();
						new Notice(`${config.integrationLabel} data processing complete!`);
					} catch (error) {
						console.error(`Error processing notes:`, error);
						new Notice(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
					} finally {
						button.setDisabled(false);
						button.setButtonText("Process now");
					}
				});
			});
	}
}
