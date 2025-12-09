import type { App, TFile } from "obsidian";

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

export async function appendContentToFile(app: App, file: TFile, content: string): Promise<void> {
	const currentContent = await app.vault.read(file);
	await app.vault.modify(file, currentContent + content);
}
