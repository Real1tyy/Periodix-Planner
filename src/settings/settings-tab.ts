import { SettingsUIBuilder } from "@real1ty-obsidian-plugins/utils";
import { type App, PluginSettingTab } from "obsidian";
import type PeriodicPlannerPlugin from "../main";
import type { PeriodicPlannerSettingsSchema } from "../types";
import type { SettingsSection } from "../types/settings";
import { cls } from "../utils/css";
import {
	BasesSection,
	CategoriesSection,
	GenerationSection,
	IntegrationsSection,
	PeriodicSection,
	PropertiesSection,
} from "./sections";

const DOCS_URL = "https://Real1tyy.github.io/Periodix-Planner/";
const CHANGELOG_URL = "https://Real1tyy.github.io/Periodix-Planner/changelog";
const SPONSOR_URL = "https://matejvavroproductivity.com/support/";
const VIDEO_URL = "https://www.youtube.com/watch?v=bIVNj6fkTc8";

export class PeriodicPlannerSettingsTab extends PluginSettingTab {
	plugin: PeriodicPlannerPlugin;

	private readonly uiBuilder: SettingsUIBuilder<typeof PeriodicPlannerSettingsSchema>;
	private sections: SettingsSection[] | null = null;
	private selectedSectionId: string;
	private sectionContainer: HTMLElement | null = null;

	constructor(app: App, plugin: PeriodicPlannerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.uiBuilder = new SettingsUIBuilder(plugin.settingsStore);
		this.selectedSectionId = "periodic";
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h1", { text: "Periodic Planner Settings" });

		const sections = this.getSections();

		if (sections.length > 0) {
			const navContainer = containerEl.createDiv(cls("settings-nav"));

			sections.forEach((section) => {
				const button = navContainer.createEl("button", {
					text: section.label,
					cls: cls("settings-nav-button"),
				});

				if (this.selectedSectionId === section.id) {
					button.addClass(cls("settings-nav-button-active"));
				}

				button.addEventListener("click", () => {
					this.selectedSectionId = section.id;
					this.display();
				});
			});
		}

		this.sectionContainer = containerEl.createDiv({ cls: cls("settings-section-container") });
		this.renderSelectedSection();

		const footerEl = containerEl.createDiv({ cls: `setting-item ${cls("settings-footer")}` });
		const linksContainer = footerEl.createDiv(cls("settings-footer-links"));

		linksContainer.createEl("a", {
			text: "Documentation",
			href: DOCS_URL,
			cls: cls("settings-support-link"),
			attr: { target: "_blank", rel: "noopener" },
		});

		linksContainer.createEl("a", {
			text: "Changelog",
			href: CHANGELOG_URL,
			cls: cls("settings-support-link"),
			attr: { target: "_blank", rel: "noopener" },
		});

		linksContainer.createEl("a", {
			text: "Video Tutorials",
			href: VIDEO_URL,
			cls: cls("settings-support-link"),
			attr: { target: "_blank", rel: "noopener" },
		});

		linksContainer.createEl("a", {
			text: "Support",
			href: SPONSOR_URL,
			cls: cls("settings-support-link"),
			attr: { target: "_blank", rel: "noopener" },
		});
	}

	private renderSelectedSection(): void {
		if (!this.sectionContainer) {
			return;
		}

		this.sectionContainer.empty();
		const sections = this.getSections();
		const section = sections.find((candidate) => candidate.id === this.selectedSectionId) ?? sections[0];

		section?.render(this.sectionContainer);
	}

	private getSections(): SettingsSection[] {
		if (!this.sections) {
			this.sections = this.createSections();
		}
		return this.sections;
	}

	private createSections(): SettingsSection[] {
		return [
			new PeriodicSection(this.plugin.settingsStore),
			new CategoriesSection(this.plugin.settingsStore, this.plugin.globalStatsAggregator),
			new PropertiesSection(this.plugin.settingsStore),
			new GenerationSection(this.plugin.settingsStore),
			new IntegrationsSection(this.plugin.settingsStore, this.app),
			new BasesSection(this.uiBuilder),
		];
	}
}
