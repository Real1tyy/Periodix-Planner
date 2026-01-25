import { RegisteredEventsComponent } from "@real1ty-obsidian-plugins";
import { type App, Component, MarkdownRenderer } from "obsidian";
import type { Subscription } from "rxjs";
import { PERIOD_TYPE_LABELS } from "../../constants";
import { generateBasesMarkdown } from "../../core/bases";
import type { PeriodIndex } from "../../core/period-index";
import type { SettingsStore } from "../../core/settings-store";
import type { IndexedPeriodNote } from "../../types";
import { cls } from "../../utils/css";

/**
 * Bases view component that filters tasks by period interval
 * Embedded in sidebar, not a modal
 */
export class PeriodBasesView extends RegisteredEventsComponent {
	private app: App;
	private contentEl: HTMLElement;
	private component: Component;
	private settingsStore: SettingsStore;
	private periodIndex: PeriodIndex;
	private settingsSubscription: Subscription | null = null;
	private lastFilePath: string | null = null;
	private isUpdating = false;

	constructor(app: App, containerEl: HTMLElement, settingsStore: SettingsStore, periodIndex: PeriodIndex) {
		super();
		this.app = app;
		this.contentEl = containerEl;
		this.settingsStore = settingsStore;
		this.periodIndex = periodIndex;
		this.component = new Component();
		this.component.load();

		this.settingsSubscription = this.settingsStore.settings$.subscribe(() => {
			this.lastFilePath = null;
			void this.render();
		});
	}

	async render(): Promise<void> {
		if (this.isUpdating) {
			return;
		}

		this.isUpdating = true;

		try {
			const activeFile = this.app.workspace.getActiveFile();
			const currentFilePath = activeFile?.path || "";

			if (currentFilePath === this.lastFilePath && currentFilePath !== "") {
				return;
			}

			this.lastFilePath = currentFilePath;

			this.contentEl.empty();
			this.contentEl.addClass(cls("period-bases-view"));

			if (!activeFile) {
				this.renderEmptyState("No active file. Open a periodic note to see tasks.");
				return;
			}

			const settings = this.settingsStore.currentSettings;
			if (!settings.basesView.tasksDirectory) {
				this.renderEmptyState("Tasks directory not configured in settings.");
				return;
			}

			const periodNote = this.periodIndex.getEntryForFile(activeFile);
			if (!periodNote) {
				this.renderEmptyState("This file is not a periodic note.");
				return;
			}

			const title = `Tasks: ${PERIOD_TYPE_LABELS[periodNote.periodType]} - ${periodNote.noteName}`;
			this.contentEl.createEl("h3", {
				text: title,
				cls: cls("period-bases-title"),
			});

			const markdownContainer = this.contentEl.createDiv({
				cls: cls("bases-markdown-container"),
			});

			await this.renderBasesView(periodNote, markdownContainer);
		} finally {
			this.isUpdating = false;
		}
	}

	private async renderBasesView(periodNote: IndexedPeriodNote, container: HTMLElement): Promise<void> {
		const settings = this.settingsStore.currentSettings.basesView;

		const basesMarkdown = generateBasesMarkdown({
			periodType: periodNote.periodType,
			periodName: periodNote.noteName,
			periodStart: periodNote.periodStart,
			periodEnd: periodNote.periodEnd,
			settings,
		});

		await MarkdownRenderer.render(this.app, basesMarkdown, container, periodNote.filePath, this.component);
	}

	private renderEmptyState(message: string): void {
		this.contentEl.createDiv({
			text: message,
			cls: cls("period-bases-empty-state"),
		});
	}

	async updateActiveFile(): Promise<void> {
		await this.render();
	}

	destroy(): void {
		if (this.settingsSubscription) {
			this.settingsSubscription.unsubscribe();
			this.settingsSubscription = null;
		}
		if (this.component) {
			this.component.unload();
		}
		this.lastFilePath = null;
		this.isUpdating = false;
		this.contentEl.empty();
		this.cleanupEvents();
	}
}
