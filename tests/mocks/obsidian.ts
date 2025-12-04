// Mock Obsidian API for tests
import { vi } from "vitest";

export class Plugin {
	app: App;
	manifest: any;

	constructor() {
		this.app = new App();
		this.manifest = {};
	}

	loadData = vi.fn().mockResolvedValue({});
	saveData = vi.fn().mockResolvedValue(undefined);
	addSettingTab = vi.fn();
	addCommand = vi.fn();
	registerEvent = vi.fn();
}

export class App {
	vault = new Vault();
	workspace = new Workspace();
	fileManager = new FileManager();
}

export class Vault {
	getAbstractFileByPath = vi.fn();
	create = vi.fn().mockResolvedValue({});
	modify = vi.fn().mockResolvedValue(undefined);
	read = vi.fn().mockResolvedValue("");
	adapter = {
		exists: vi.fn().mockResolvedValue(false),
		mkdir: vi.fn().mockResolvedValue(undefined),
	};
}

export class Workspace {
	on = vi.fn();
	getActiveFile = vi.fn().mockReturnValue(null);
}

export class FileManager {
	processFrontMatter = vi.fn().mockImplementation(async (_file, fn) => {
		const fm: Record<string, any> = {};
		fn(fm);
		return fm;
	});
}

export class TFile {
	path: string;
	basename: string;
	extension: string;

	constructor(path = "test.md") {
		this.path = path;
		this.basename = path.replace(/\.md$/, "");
		this.extension = "md";
	}
}

export class TFolder {
	path: string;
	name: string;

	constructor(path = "test") {
		this.path = path;
		this.name = path.split("/").pop() || path;
	}
}

export class PluginSettingTab {
	app: App;
	plugin: Plugin;
	containerEl: HTMLElement;

	constructor(app: App, plugin: Plugin) {
		this.app = app;
		this.plugin = plugin;
		this.containerEl = document.createElement("div");
	}

	display(): void {}
	hide(): void {}
}

export class Setting {
	settingEl: HTMLElement;
	nameEl: HTMLElement;
	descEl: HTMLElement;

	constructor(_containerEl: HTMLElement) {
		this.settingEl = document.createElement("div");
		this.nameEl = document.createElement("div");
		this.descEl = document.createElement("div");
	}

	setName(_name: string): this {
		return this;
	}
	setDesc(_desc: string): this {
		return this;
	}
	setHeading(): this {
		return this;
	}
	setClass(_cls: string): this {
		return this;
	}
	addText(_cb: (text: any) => void): this {
		return this;
	}
	addTextArea(_cb: (textarea: any) => void): this {
		return this;
	}
	addToggle(_cb: (toggle: any) => void): this {
		return this;
	}
	addSlider(_cb: (slider: any) => void): this {
		return this;
	}
	addDropdown(_cb: (dropdown: any) => void): this {
		return this;
	}
	addButton(_cb: (button: any) => void): this {
		return this;
	}
	addExtraButton(_cb: (button: any) => void): this {
		return this;
	}
	addColorPicker(_cb: (picker: any) => void): this {
		return this;
	}
}

export class Notice {
	message: string;
	timeout?: number;

	constructor(message: string, timeout?: number) {
		this.message = message;
		this.timeout = timeout;
	}
}

export class Modal {
	app: App;
	contentEl: HTMLElement;

	constructor(app: App) {
		this.app = app;
		this.contentEl = document.createElement("div");
	}

	open(): void {}
	close(): void {}
}

export const moment = vi.fn().mockImplementation(() => ({
	format: vi.fn().mockReturnValue("2025-01-01"),
	startOf: vi.fn().mockReturnThis(),
	endOf: vi.fn().mockReturnThis(),
	add: vi.fn().mockReturnThis(),
	subtract: vi.fn().mockReturnThis(),
}));
