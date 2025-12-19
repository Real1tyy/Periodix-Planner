import { createFromTemplate, isTemplaterAvailable } from "@real1ty-obsidian-plugins/utils";
import type { App } from "obsidian";
import { TFile } from "obsidian";
import type { BehaviorSubject, Subscription } from "rxjs";
import type { Frontmatter } from "../types";
import type { PeriodicPlannerSettings } from "../types/schemas";

export interface FileCreationOptions {
	title: string;
	targetDirectory: string;
	filename?: string;
	content?: string;
	frontmatter?: Frontmatter;
	templatePath?: string;
}

export class TemplateService {
	private settings: PeriodicPlannerSettings;
	private settingsSubscription: Subscription | null = null;

	constructor(
		private app: App,
		settingsStore: BehaviorSubject<PeriodicPlannerSettings>
	) {
		this.settings = settingsStore.value;
		this.settingsSubscription = settingsStore.subscribe((newSettings) => {
			this.settings = newSettings;
		});
	}

	destroy(): void {
		this.settingsSubscription?.unsubscribe();
		this.settingsSubscription = null;
	}

	async createFile(options: FileCreationOptions): Promise<TFile> {
		const { title, targetDirectory, filename, content, frontmatter, templatePath } = options;

		const finalFilename = filename || title;
		const baseName = finalFilename.replace(/\.md$/, "");
		const filePath = `${targetDirectory}/${baseName}.md`;

		const existingFile = this.app.vault.getAbstractFileByPath(filePath);
		if (existingFile instanceof TFile) {
			return existingFile;
		}

		if (this.shouldUseTemplate(templatePath)) {
			const templateFile = await this.createFromTemplate(targetDirectory, finalFilename, templatePath);
			if (templateFile) {
				if (frontmatter && Object.keys(frontmatter).length > 0) {
					await this.app.fileManager.processFrontMatter(templateFile, (fm) => {
						Object.assign(fm, frontmatter);
					});
				}
				return templateFile;
			}
		}

		return this.createManually(targetDirectory, finalFilename, content, frontmatter);
	}

	private shouldUseTemplate(templatePath?: string): boolean {
		return !!(
			this.settings.templater.enabled &&
			templatePath &&
			templatePath.trim() !== "" &&
			isTemplaterAvailable(this.app)
		);
	}

	private async createFromTemplate(
		targetDirectory: string,
		filename: string,
		templatePath?: string
	): Promise<TFile | null> {
		if (!templatePath) return null;

		try {
			const templateFile = await createFromTemplate(this.app, templatePath, targetDirectory, filename);

			if (templateFile) {
				return templateFile;
			}
		} catch (error) {
			console.error("Error creating file from template:", error);
		}

		return null;
	}

	private async createManually(
		targetDirectory: string,
		filename: string,
		customContent?: string,
		frontmatter?: Frontmatter
	): Promise<TFile> {
		const baseName = filename.replace(/\.md$/, "");
		const filePath = `${targetDirectory}/${baseName}.md`;

		const content = customContent || "";

		const file = await this.app.vault.create(filePath, content);

		if (frontmatter && Object.keys(frontmatter).length > 0) {
			await this.app.fileManager.processFrontMatter(file, (fm) => {
				Object.assign(fm, frontmatter);
			});
		}

		return file;
	}
}
