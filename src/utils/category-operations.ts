import type { App, TFile } from "obsidian";
import { parseAllocationBlock, serializeAllocations } from "../components/time-budget/allocation-parser";
import { SETTINGS_DEFAULTS } from "../constants";
import type { PeriodIndex } from "../core/period-index";

export interface CategoryOperationResult {
	filesModified: string[];
	filesWithErrors: { filePath: string; error: string }[];
}

export interface CategoryOperationOptions {
	onProgress?: (completed: number, total: number) => void;
	onComplete?: () => void;
}

export function deleteCategoryFromCodeFence(codeFenceContent: string, categoryName: string): string {
	const parsed = parseAllocationBlock(codeFenceContent);
	const updatedAllocations = parsed.allocations.filter((alloc) => alloc.categoryName !== categoryName);
	return serializeAllocations(updatedAllocations);
}

export function renameCategoryInCodeFence(
	codeFenceContent: string,
	oldCategoryName: string,
	newCategoryName: string
): string {
	const parsed = parseAllocationBlock(codeFenceContent);
	const updatedAllocations = parsed.allocations.map((alloc) =>
		alloc.categoryName === oldCategoryName ? { ...alloc, categoryName: newCategoryName } : alloc
	);
	return serializeAllocations(updatedAllocations);
}

export async function updateCategoryInFile(
	app: App,
	file: TFile,
	operation: (content: string) => string
): Promise<void> {
	const content = await app.vault.read(file);
	const codeFence = SETTINGS_DEFAULTS.TIME_BUDGET_CODE_FENCE;
	const regex = new RegExp(`(\`\`\`${codeFence}\\n)([\\s\\S]*?)(\`\`\`)`, "");

	const match = content.match(regex);
	if (!match) {
		return;
	}

	const codeFenceContent = match[2];
	const newCodeFenceContent = operation(codeFenceContent);

	const updatedContent = content.replace(regex, `$1${newCodeFenceContent}\n$3`);

	await app.vault.modify(file, updatedContent);
}

async function bulkUpdateCategory(
	app: App,
	periodIndex: PeriodIndex,
	categoryName: string,
	operation: (content: string) => string,
	options?: CategoryOperationOptions
): Promise<CategoryOperationResult> {
	const filesModified: string[] = [];
	const filesWithErrors: { filePath: string; error: string }[] = [];

	const allNotes = periodIndex.getAllNotes();
	const notesWithCategory = allNotes.filter((note) => note.categoryAllocations.has(categoryName));
	const total = notesWithCategory.length;
	let completed = 0;

	const updatePromises = notesWithCategory.map(async (note) => {
		try {
			await updateCategoryInFile(app, note.file, operation);
			filesModified.push(note.filePath);
			completed++;
			options?.onProgress?.(completed, total);
		} catch (error) {
			filesWithErrors.push({
				filePath: note.filePath,
				error: error instanceof Error ? error.message : String(error),
			});
			completed++;
			options?.onProgress?.(completed, total);
		}
	});

	await Promise.all(updatePromises);

	options?.onComplete?.();

	return { filesModified, filesWithErrors };
}

export async function bulkDeleteCategory(
	app: App,
	periodIndex: PeriodIndex,
	categoryName: string,
	options?: CategoryOperationOptions
): Promise<CategoryOperationResult> {
	return bulkUpdateCategory(
		app,
		periodIndex,
		categoryName,
		(content) => deleteCategoryFromCodeFence(content, categoryName),
		options
	);
}

export async function bulkRenameCategory(
	app: App,
	periodIndex: PeriodIndex,
	oldCategoryName: string,
	newCategoryName: string,
	options?: CategoryOperationOptions
): Promise<CategoryOperationResult> {
	return bulkUpdateCategory(
		app,
		periodIndex,
		oldCategoryName,
		(content) => renameCategoryInCodeFence(content, oldCategoryName, newCategoryName),
		options
	);
}
