import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins";
import { Setting } from "obsidian";
import { SETTINGS_DEFAULTS } from "../../constants";
import type { PeriodicPlannerSettingsSchema } from "../../types";
import type { SettingsSection } from "../../types/settings";

export class GenerationSection implements SettingsSection {
	readonly id = "generation";
	readonly label = "Generation";

	constructor(private uiBuilder: SettingsUIBuilder<typeof PeriodicPlannerSettingsSchema>) {}

	render(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Note generation").setHeading();

		containerEl.createEl("p", {
			text: "Configure how periodic notes are automatically generated.",
			cls: "setting-item-description",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "generation.autoGenerateOnLoad",
			name: "Auto-generate on load",
			desc: "Automatically generate the next period's note when Obsidian loads",
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "generation.generatePeriodsAhead",
			name: "Generate periods ahead",
			desc: "How many periods into the future to generate (1-10)",
			min: 1,
			max: 10,
			step: 1,
		});

		new Setting(containerEl).setName("Enabled period types").setHeading();

		containerEl.createEl("p", {
			text: "Select which period types to generate and track. Disabled periods will be skipped in navigation and time budget calculations.",
			cls: "setting-item-description",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "generation.enableDaily",
			name: "Enable daily notes",
			desc: "Generate and track daily periodic notes",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "generation.enableWeekly",
			name: "Enable weekly notes",
			desc: "Generate and track weekly periodic notes",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "generation.enableMonthly",
			name: "Enable monthly notes",
			desc: "Generate and track monthly periodic notes",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "generation.enableQuarterly",
			name: "Enable quarterly notes",
			desc: "Generate and track quarterly periodic notes",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "generation.enableYearly",
			name: "Enable yearly notes",
			desc: "Generate and track yearly periodic notes",
		});

		new Setting(containerEl).setName("PDF note linking").setHeading();

		containerEl.createEl("p", {
			text: "Automatically add links to corresponding PDF files with the same name as the periodic note.",
			cls: "setting-item-description",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "generation.includePdfFrontmatter",
			name: "Include PDF link in frontmatter",
			desc: "Add a frontmatter property linking to a PDF file with the same name (e.g., Daily/04-12-2025.pdf)",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "generation.includePdfContent",
			name: "Include PDF embed in content",
			desc: "Add an embedded PDF viewer after the frontmatter",
		});

		this.uiBuilder.addText(containerEl, {
			key: "generation.pdfNoteProp",
			name: "PDF frontmatter property name",
			desc: "The property name used in frontmatter for the PDF link",
			placeholder: SETTINGS_DEFAULTS.PDF_NOTE_PROP,
		});

		this.uiBuilder.addText(containerEl, {
			key: "generation.pdfContentHeader",
			name: "PDF content header",
			desc: "The header text displayed above the embedded PDF",
			placeholder: SETTINGS_DEFAULTS.PDF_CONTENT_HEADER,
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "generation.enablePdfCommands",
			name: "Enable PDF commands",
			desc: "Also expose commands to open PDF versions of notes if they exist (e.g., Open today's daily note (PDF))",
		});

		new Setting(containerEl).setName("Time budget code block").setHeading();

		containerEl.createEl("p", {
			text: "Configure automatic insertion of the periodic-planner code block into new periodic notes.",
			cls: "setting-item-description",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "generation.autoInsertCodeBlock",
			name: "Auto-insert code block",
			desc: "Automatically add the periodic-planner code block to newly generated periodic notes",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "generation.includePlanHeading",
			name: "Add heading above code block",
			desc: "Add a Markdown heading above the periodic-planner code block",
		});

		this.uiBuilder.addText(containerEl, {
			key: "generation.planHeadingContent",
			name: "Plan heading content",
			desc: "The Markdown heading to add above the code block (e.g., ## plan)",
			placeholder: SETTINGS_DEFAULTS.PLAN_HEADING_CONTENT,
		});

		new Setting(containerEl).setName("Bases view embedding").setHeading();

		containerEl.createEl("p", {
			text: "Automatically embed Bases task view in newly generated periodic notes.",
			cls: "setting-item-description",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "generation.includeBasesInGeneration",
			name: "Include Bases view in generation",
			desc: "Automatically add Bases task filtering view to newly generated periodic notes",
		});

		this.uiBuilder.addText(containerEl, {
			key: "generation.basesHeading",
			name: "Bases heading",
			desc: "The Markdown heading to add above the Bases view (e.g., ## Bases)",
			placeholder: SETTINGS_DEFAULTS.BASES_HEADING,
		});

		new Setting(containerEl).setName("Startup behavior").setHeading();

		containerEl.createEl("p", {
			text: "Configure actions to perform when the plugin loads.",
			cls: "setting-item-description",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "generation.openYesterdayPdfOnStartup",
			name: "Open yesterday's PDF on startup",
			desc: "Automatically open yesterday's daily note PDF in a detached window when Obsidian loads (only if not already open)",
		});
	}
}
