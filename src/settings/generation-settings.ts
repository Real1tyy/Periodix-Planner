import { Setting } from "obsidian";
import { SETTINGS_DEFAULTS } from "../constants";
import type { SettingsStore } from "../core/settings-store";

export class GenerationSettings {
	constructor(private settingsStore: SettingsStore) {}

	display(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Note generation").setHeading();

		containerEl.createEl("p", {
			text: "Configure how periodic notes are automatically generated.",
			cls: "setting-item-description",
		});

		new Setting(containerEl)
			.setName("Auto-generate on load")
			.setDesc("Automatically generate the next period's note when Obsidian loads")
			.addToggle((toggle) => {
				toggle.setValue(this.settingsStore.currentSettings.generation.autoGenerateOnLoad).onChange(async (value) => {
					await this.settingsStore.updateSettings((s) => ({
						...s,
						generation: {
							...s.generation,
							autoGenerateOnLoad: value,
						},
					}));
				});
			});

		new Setting(containerEl)
			.setName("Generate periods ahead")
			.setDesc("How many periods into the future to generate (1-5)")
			.addSlider((slider) => {
				slider
					.setLimits(1, 5, 1)
					.setValue(this.settingsStore.currentSettings.generation.generatePeriodsAhead)
					.setDynamicTooltip()
					.onChange(async (value) => {
						await this.settingsStore.updateSettings((s) => ({
							...s,
							generation: {
								...s.generation,
								generatePeriodsAhead: value,
							},
						}));
					});
			});

		new Setting(containerEl).setName("PDF note linking").setHeading();

		containerEl.createEl("p", {
			text: "Automatically add links to corresponding PDF files with the same name as the periodic note.",
			cls: "setting-item-description",
		});

		new Setting(containerEl)
			.setName("Include PDF link in frontmatter")
			.setDesc("Add a frontmatter property linking to a PDF file with the same name (e.g., Daily/04-12-2025.pdf)")
			.addToggle((toggle) => {
				toggle.setValue(this.settingsStore.currentSettings.generation.includePdfFrontmatter).onChange(async (value) => {
					await this.settingsStore.updateSettings((s) => ({
						...s,
						generation: {
							...s.generation,
							includePdfFrontmatter: value,
						},
					}));
				});
			});

		new Setting(containerEl)
			.setName("Include PDF embed in content")
			.setDesc("Add an embedded PDF viewer after the frontmatter")
			.addToggle((toggle) => {
				toggle.setValue(this.settingsStore.currentSettings.generation.includePdfContent).onChange(async (value) => {
					await this.settingsStore.updateSettings((s) => ({
						...s,
						generation: {
							...s.generation,
							includePdfContent: value,
						},
					}));
				});
			});

		new Setting(containerEl)
			.setName("PDF frontmatter property name")
			.setDesc("The property name used in frontmatter for the PDF link")
			.addText((text) => {
				text
					.setPlaceholder(SETTINGS_DEFAULTS.PDF_NOTE_PROP)
					.setValue(this.settingsStore.currentSettings.generation.pdfNoteProp)
					.onChange(async (value) => {
						await this.settingsStore.updateSettings((s) => ({
							...s,
							generation: {
								...s.generation,
								pdfNoteProp: value || SETTINGS_DEFAULTS.PDF_NOTE_PROP,
							},
						}));
					});
			});

		new Setting(containerEl)
			.setName("PDF content header")
			.setDesc("The header text displayed above the embedded PDF")
			.addText((text) => {
				text
					.setPlaceholder(SETTINGS_DEFAULTS.PDF_CONTENT_HEADER)
					.setValue(this.settingsStore.currentSettings.generation.pdfContentHeader)
					.onChange(async (value) => {
						await this.settingsStore.updateSettings((s) => ({
							...s,
							generation: {
								...s.generation,
								pdfContentHeader: value || SETTINGS_DEFAULTS.PDF_CONTENT_HEADER,
							},
						}));
					});
			});

		new Setting(containerEl).setName("Time budget code block").setHeading();

		containerEl.createEl("p", {
			text: "Configure automatic insertion of the periodic-planner code block into new periodic notes.",
			cls: "setting-item-description",
		});

		new Setting(containerEl)
			.setName("Auto-insert code block")
			.setDesc("Automatically add the periodic-planner code block to newly generated periodic notes")
			.addToggle((toggle) => {
				toggle.setValue(this.settingsStore.currentSettings.generation.autoInsertCodeBlock).onChange(async (value) => {
					await this.settingsStore.updateSettings((s) => ({
						...s,
						generation: {
							...s.generation,
							autoInsertCodeBlock: value,
						},
					}));
				});
			});

		new Setting(containerEl)
			.setName("Add heading above code block")
			.setDesc("Add a Markdown heading above the periodic-planner code block")
			.addToggle((toggle) => {
				toggle.setValue(this.settingsStore.currentSettings.generation.includePlanHeading).onChange(async (value) => {
					await this.settingsStore.updateSettings((s) => ({
						...s,
						generation: {
							...s.generation,
							includePlanHeading: value,
						},
					}));
				});
			});

		new Setting(containerEl)
			.setName("Plan heading content")
			.setDesc("The Markdown heading to add above the code block (e.g., ## plan)")
			.addText((text) => {
				text
					.setPlaceholder(SETTINGS_DEFAULTS.PLAN_HEADING_CONTENT)
					.setValue(this.settingsStore.currentSettings.generation.planHeadingContent)
					.onChange(async (value) => {
						await this.settingsStore.updateSettings((s) => ({
							...s,
							generation: {
								...s.generation,
								planHeadingContent: value || SETTINGS_DEFAULTS.PLAN_HEADING_CONTENT,
							},
						}));
					});
			});
	}
}
