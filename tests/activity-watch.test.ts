import { DateTime } from "luxon";
import type { App, CachedMetadata, MetadataCache, TFile, Vault } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERIOD_TYPES, SETTINGS_DEFAULTS } from "../src/constants";
import { ActivityWatchService } from "../src/services/activity-watch";
import {
	hasActivityWatchHeading,
	injectActivityWatchContent,
	isInPast,
	processAllDailyNotesForActivityWatch,
} from "../src/utils/activity-watch";
import { createMockSettings } from "./test-helpers";

vi.mock("../src/services/activity-watch");

const enabledActivityWatchSettings = {
	enabled: true,
	apiUrl: "http://localhost:5600",
	heading: "## ActivityWatch",
	codeFence: "periodic-planner-activity-watch",
};

describe("ActivityWatch Utils", () => {
	const createMockApp = (vaultContent = "", files: TFile[] = []): App => {
		const vault = {
			read: vi.fn().mockResolvedValue(vaultContent),
			modify: vi.fn().mockResolvedValue(undefined),
			getMarkdownFiles: vi.fn().mockReturnValue(files),
		} as unknown as Vault;

		const metadataCache = {
			getFileCache: vi.fn().mockReturnValue({
				frontmatter: {
					[SETTINGS_DEFAULTS.PERIOD_TYPE_PROP]: PERIOD_TYPES.DAILY,
					[SETTINGS_DEFAULTS.PERIOD_START_PROP]: "2025-12-18T00:00:00.000Z",
				},
			} as CachedMetadata),
		} as unknown as MetadataCache;

		return {
			vault,
			metadataCache,
		} as unknown as App;
	};

	const createMockFile = (path: string): TFile =>
		({
			path,
			name: path.split("/").pop() || "",
			basename: path.split("/").pop()?.replace(".md", "") || "",
			extension: "md",
		}) as TFile;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("isInPast", () => {
		it("should return true for yesterday", () => {
			const yesterday = DateTime.now().minus({ days: 1 }).startOf("day");
			expect(isInPast(yesterday)).toBe(true);
		});

		it("should return true for dates in the past", () => {
			const pastDate = DateTime.fromISO("2020-01-01");
			expect(isInPast(pastDate)).toBe(true);
		});

		it("should return false for today", () => {
			const today = DateTime.now().startOf("day");
			expect(isInPast(today)).toBe(false);
		});

		it("should return false for future dates", () => {
			const tomorrow = DateTime.now().plus({ days: 1 }).startOf("day");
			expect(isInPast(tomorrow)).toBe(false);
		});

		it("should return false for dates far in the future", () => {
			const futureDate = DateTime.fromISO("2030-12-31");
			expect(isInPast(futureDate)).toBe(false);
		});
	});

	describe("hasActivityWatchHeading", () => {
		it("should return true when heading exists in file", async () => {
			const app = createMockApp("# Daily Note\n\n## ActivityWatch\n\nSome content");
			const file = createMockFile("Periodic/Daily/18-12-2025.md");

			const result = await hasActivityWatchHeading(app, file, "## ActivityWatch");

			expect(result).toBe(true);
			expect(app.vault.read).toHaveBeenCalledWith(file);
		});

		it("should return false when heading does not exist", async () => {
			const app = createMockApp("# Daily Note\n\nSome content");
			const file = createMockFile("Periodic/Daily/18-12-2025.md");

			const result = await hasActivityWatchHeading(app, file, "## ActivityWatch");

			expect(result).toBe(false);
		});

		it("should handle empty file content", async () => {
			const app = createMockApp("");
			const file = createMockFile("Periodic/Daily/18-12-2025.md");

			const result = await hasActivityWatchHeading(app, file, "## ActivityWatch");

			expect(result).toBe(false);
		});

		it("should be case-sensitive", async () => {
			const app = createMockApp("# Daily Note\n\n## activitywatch\n\nSome content");
			const file = createMockFile("Periodic/Daily/18-12-2025.md");

			const result = await hasActivityWatchHeading(app, file, "## ActivityWatch");

			expect(result).toBe(false);
		});

		it("should match custom heading text", async () => {
			const app = createMockApp("# Daily Note\n\n## Time Tracking\n\nSome content");
			const file = createMockFile("Periodic/Daily/18-12-2025.md");

			const result = await hasActivityWatchHeading(app, file, "## Time Tracking");

			expect(result).toBe(true);
		});
	});

	describe("injectActivityWatchContent", () => {
		beforeEach(() => {
			vi.mocked(ActivityWatchService).mockClear();
		});

		it("should not inject when ActivityWatch is disabled", async () => {
			const settings = createMockSettings();
			const app = createMockApp("");
			const file = createMockFile("Periodic/Daily/18-12-2025.md");
			const date = DateTime.fromISO("2025-12-18");

			await injectActivityWatchContent(app, file, date, settings);

			expect(app.vault.read).not.toHaveBeenCalled();
			expect(app.vault.modify).not.toHaveBeenCalled();
		});

		it("should not inject when heading already exists", async () => {
			const settings = createMockSettings();
			const app = createMockApp("# Daily\n\n## ActivityWatch\n\nExisting content");
			const file = createMockFile("Periodic/Daily/18-12-2025.md");
			const date = DateTime.fromISO("2025-12-18");

			await injectActivityWatchContent(app, file, date, settings);

			expect(app.vault.modify).not.toHaveBeenCalled();
		});

		it("should not inject for today", async () => {
			const settings = createMockSettings();
			const app = createMockApp("# Daily");
			const file = createMockFile("Periodic/Daily/today.md");
			const today = DateTime.now().startOf("day");

			await injectActivityWatchContent(app, file, today, settings);

			expect(app.vault.modify).not.toHaveBeenCalled();
		});

		it("should not inject for future dates", async () => {
			const settings = createMockSettings();
			const app = createMockApp("# Daily");
			const file = createMockFile("Periodic/Daily/future.md");
			const future = DateTime.now().plus({ days: 1 }).startOf("day");

			await injectActivityWatchContent(app, file, future, settings);

			expect(app.vault.modify).not.toHaveBeenCalled();
		});

		it("should inject ActivityWatch data for past dates", async () => {
			const settings = createMockSettings({
				activityWatch: enabledActivityWatchSettings,
			});
			const app = createMockApp("# Daily Note\n\nExisting content");
			const file = createMockFile("Periodic/Daily/17-12-2025.md");
			const yesterday = DateTime.now().minus({ days: 1 }).startOf("day");

			const mockAppData = [
				{ app: "obsidian", duration: 7200 },
				{ app: "chrome", duration: 3600 },
			];

			const mockService = {
				getDailyAppUsage: vi.fn().mockResolvedValue(mockAppData),
			};
			vi.mocked(ActivityWatchService).mockImplementation(() => mockService as unknown as ActivityWatchService);
			vi.spyOn(ActivityWatchService, "generateActivityWatchCodeBlock").mockReturnValue(
				"**Total Active Time:** 3.00 hours\n\n```\nobsidian    7200s\n```"
			);

			await injectActivityWatchContent(app, file, yesterday, settings);

			expect(mockService.getDailyAppUsage).toHaveBeenCalledWith(yesterday);
			expect(app.vault.modify).toHaveBeenCalledWith(file, expect.stringContaining("## ActivityWatch"));
		});

		it("should use custom heading from settings", async () => {
			const settings = createMockSettings({
				activityWatch: {
					...enabledActivityWatchSettings,
					heading: "## My Custom Heading",
				},
			});
			const app = createMockApp("# Daily");
			const file = createMockFile("Periodic/Daily/17-12-2025.md");
			const yesterday = DateTime.now().minus({ days: 1 }).startOf("day");

			const mockService = {
				getDailyAppUsage: vi.fn().mockResolvedValue([]),
			};
			vi.mocked(ActivityWatchService).mockImplementation(() => mockService as unknown as ActivityWatchService);
			vi.spyOn(ActivityWatchService, "generateActivityWatchCodeBlock").mockReturnValue("No data");

			await injectActivityWatchContent(app, file, yesterday, settings);

			expect(app.vault.modify).toHaveBeenCalledWith(file, expect.stringContaining("## My Custom Heading"));
		});

		it("should handle API errors gracefully", async () => {
			const settings = createMockSettings({
				activityWatch: enabledActivityWatchSettings,
			});
			const app = createMockApp("# Daily");
			const file = createMockFile("Periodic/Daily/17-12-2025.md");
			const yesterday = DateTime.now().minus({ days: 1 }).startOf("day");
			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			const mockService = {
				getDailyAppUsage: vi.fn().mockRejectedValue(new Error("API connection failed")),
			};
			vi.mocked(ActivityWatchService).mockImplementation(() => mockService as unknown as ActivityWatchService);

			await injectActivityWatchContent(app, file, yesterday, settings);

			expect(app.vault.modify).not.toHaveBeenCalled();
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("[ActivityWatch] Failed to inject data"),
				expect.any(Error)
			);

			consoleErrorSpy.mockRestore();
		});
	});

	describe("processAllDailyNotesForActivityWatch", () => {
		it("should skip processing when ActivityWatch is disabled", async () => {
			const settings = createMockSettings();
			const app = createMockApp();

			await processAllDailyNotesForActivityWatch(app, settings);

			expect(app.vault.getMarkdownFiles).not.toHaveBeenCalled();
		});

		it("should only process files in daily folder", async () => {
			const settings = createMockSettings({
				activityWatch: enabledActivityWatchSettings,
			});
			const files = [
				createMockFile("Periodic/Daily/18-12-2025.md"),
				createMockFile("Periodic/Weekly/51-2025.md"),
				createMockFile("Other/note.md"),
			];
			const app = createMockApp("# Note", files);

			await processAllDailyNotesForActivityWatch(app, settings);

			expect(app.metadataCache.getFileCache).toHaveBeenCalledTimes(1);
			expect(app.metadataCache.getFileCache).toHaveBeenCalledWith(files[0]);
		});

		it("should skip files without frontmatter", async () => {
			const settings = createMockSettings({
				activityWatch: enabledActivityWatchSettings,
			});
			const files = [createMockFile("Periodic/Daily/18-12-2025.md")];
			const app = createMockApp("# Note", files);
			vi.mocked(app.metadataCache.getFileCache).mockReturnValue(null);

			await processAllDailyNotesForActivityWatch(app, settings);

			expect(app.vault.read).not.toHaveBeenCalled();
		});

		it("should skip non-daily period types", async () => {
			const settings = createMockSettings({
				activityWatch: enabledActivityWatchSettings,
			});
			const files = [createMockFile("Periodic/Daily/51-2025.md")];
			const app = createMockApp("# Note", files);
			vi.mocked(app.metadataCache.getFileCache).mockReturnValue({
				frontmatter: {
					[SETTINGS_DEFAULTS.PERIOD_TYPE_PROP]: PERIOD_TYPES.WEEKLY,
					[SETTINGS_DEFAULTS.PERIOD_START_PROP]: "2025-12-18T00:00:00.000Z",
				},
			} as CachedMetadata);

			await processAllDailyNotesForActivityWatch(app, settings);

			expect(app.vault.read).not.toHaveBeenCalled();
		});

		it("should skip files without period start property", async () => {
			const settings = createMockSettings({
				activityWatch: enabledActivityWatchSettings,
			});
			const files = [createMockFile("Periodic/Daily/18-12-2025.md")];
			const app = createMockApp("# Note", files);
			vi.mocked(app.metadataCache.getFileCache).mockReturnValue({
				frontmatter: {
					[SETTINGS_DEFAULTS.PERIOD_TYPE_PROP]: PERIOD_TYPES.DAILY,
				},
			} as CachedMetadata);

			await processAllDailyNotesForActivityWatch(app, settings);

			expect(app.vault.read).not.toHaveBeenCalled();
		});

		it("should skip files with invalid dates", async () => {
			const settings = createMockSettings({
				activityWatch: enabledActivityWatchSettings,
			});
			const files = [createMockFile("Periodic/Daily/invalid.md")];
			const app = createMockApp("# Note", files);
			vi.mocked(app.metadataCache.getFileCache).mockReturnValue({
				frontmatter: {
					[SETTINGS_DEFAULTS.PERIOD_TYPE_PROP]: PERIOD_TYPES.DAILY,
					[SETTINGS_DEFAULTS.PERIOD_START_PROP]: "invalid-date",
				},
			} as CachedMetadata);

			await processAllDailyNotesForActivityWatch(app, settings);

			expect(app.vault.read).not.toHaveBeenCalled();
		});

		it("should process valid daily notes", async () => {
			const settings = createMockSettings({
				activityWatch: enabledActivityWatchSettings,
			});
			const files = [createMockFile("Periodic/Daily/17-12-2025.md"), createMockFile("Periodic/Daily/16-12-2025.md")];
			const app = createMockApp("# Note", files);
			const yesterday = DateTime.now().minus({ days: 1 }).startOf("day").toISO();

			vi.mocked(app.metadataCache.getFileCache).mockReturnValue({
				frontmatter: {
					[SETTINGS_DEFAULTS.PERIOD_TYPE_PROP]: PERIOD_TYPES.DAILY,
					[SETTINGS_DEFAULTS.PERIOD_START_PROP]: yesterday,
				},
			} as CachedMetadata);

			const mockService = {
				getDailyAppUsage: vi.fn().mockResolvedValue([]),
			};
			vi.mocked(ActivityWatchService).mockImplementation(() => mockService as unknown as ActivityWatchService);
			vi.spyOn(ActivityWatchService, "generateActivityWatchCodeBlock").mockReturnValue("No data");

			await processAllDailyNotesForActivityWatch(app, settings);

			// Each file: read once for heading check, once for content before modification
			expect(app.vault.read).toHaveBeenCalledTimes(4);
		});

		it("should handle errors for individual files and continue processing", async () => {
			const settings = createMockSettings({
				activityWatch: enabledActivityWatchSettings,
			});
			const files = [createMockFile("Periodic/Daily/17-12-2025.md"), createMockFile("Periodic/Daily/16-12-2025.md")];
			const app = createMockApp("# Note", files);
			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			let callCount = 0;
			vi.mocked(app.metadataCache.getFileCache).mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					throw new Error("Metadata error");
				}
				return {
					frontmatter: {
						[SETTINGS_DEFAULTS.PERIOD_TYPE_PROP]: PERIOD_TYPES.DAILY,
						[SETTINGS_DEFAULTS.PERIOD_START_PROP]: DateTime.now().minus({ days: 1 }).toISO(),
					},
				} as CachedMetadata;
			});

			const mockService = {
				getDailyAppUsage: vi.fn().mockResolvedValue([]),
			};
			vi.mocked(ActivityWatchService).mockImplementation(() => mockService as unknown as ActivityWatchService);
			vi.spyOn(ActivityWatchService, "generateActivityWatchCodeBlock").mockReturnValue("No data");

			await processAllDailyNotesForActivityWatch(app, settings);

			expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Error processing"), expect.any(Error));
			// Second file processes successfully: read once for heading, once for content
			expect(app.vault.read).toHaveBeenCalledTimes(2);

			consoleErrorSpy.mockRestore();
		});
	});
});
