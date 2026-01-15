import { type App, MarkdownView, type TFile } from "obsidian";
import { serializeAllocations } from "../components/time-budget/allocation-parser";
import { SETTINGS_DEFAULTS } from "../constants";
import type { PeriodIndex } from "../core/period-index";
import type { IndexedPeriodNote, TimeAllocation } from "../types";

export async function ensureFolderExists(app: App, filePath: string): Promise<void> {
	const folder = filePath.substring(0, filePath.lastIndexOf("/"));
	if (!folder) return;

	const exists = await app.vault.adapter.exists(folder);
	if (!exists) {
		await app.vault.createFolder(folder);
	}
}

export function getPdfPath(notePath: string): string {
	return notePath.replace(/\.md$/, ".pdf");
}

export function removeFileExtension(filePath: string): string {
	return filePath.replace(/\.md$/, "");
}

export async function updateTimeBudgetCodeBlock(app: App, file: TFile, allocations: TimeAllocation[]): Promise<void> {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	const shouldPreserveEditorState = activeView?.file?.path === file.path;

	const cursor = shouldPreserveEditorState ? activeView.editor.getCursor() : null;
	const scrollInfo = shouldPreserveEditorState ? activeView.editor.getScrollInfo() : null;

	const content = await app.vault.read(file);
	const newContent = serializeAllocations(allocations);
	const codeFence = SETTINGS_DEFAULTS.TIME_BUDGET_CODE_FENCE;

	const updatedContent = content.replace(
		new RegExp(`\`\`\`${codeFence}\\n[\\s\\S]*?\`\`\``, ""),
		`\`\`\`${codeFence}\n${newContent}\n\`\`\``
	);

	await app.vault.modify(file, updatedContent);

	// `vault.modify()` can reset editor scroll/cursor; restore when we modified the currently-open note.
	if (shouldPreserveEditorState && cursor && scrollInfo) {
		// Let Obsidian refresh the view first.
		await new Promise<void>((resolve) => setTimeout(resolve, 0));
		requestAnimationFrame(() => {
			const viewAfter = app.workspace.getActiveViewOfType(MarkdownView);
			if (viewAfter?.file?.path !== file.path) return;

			viewAfter.editor.setCursor(cursor);
			viewAfter.editor.scrollTo(scrollInfo.left, scrollInfo.top);
		});
	}
}

export async function retryGetEntryForFile(
	periodIndex: PeriodIndex,
	file: TFile,
	maxRetries = 3,
	delayMs = 50
): Promise<IndexedPeriodNote | undefined> {
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		const entry = periodIndex.getEntryForFile(file);
		if (entry) {
			return entry;
		}

		if (attempt < maxRetries - 1) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}

	return undefined;
}
