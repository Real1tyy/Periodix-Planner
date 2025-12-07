import { DateTime } from "luxon";
import { type App, type MetadataCache, type TAbstractFile, TFile, type Vault } from "obsidian";
import {
	type BehaviorSubject,
	from,
	fromEventPattern,
	lastValueFrom,
	merge,
	type Observable,
	of,
	BehaviorSubject as RxBehaviorSubject,
	Subject,
	type Subscription,
} from "rxjs";
import { debounceTime, filter, groupBy, map, mergeMap, switchMap, toArray } from "rxjs/operators";
import { getHoursForPeriodType } from "src/utils";
import { z } from "zod";
import { parseAllocationBlock } from "../components/time-budget/allocation-parser";
import { PERIOD_TYPES } from "../constants";
import type { IndexedPeriodNote, PeriodicPlannerSettings } from "../types";
import { extractParentLinksFromFrontmatter } from "../utils/frontmatter-utils";

const SCAN_CONCURRENCY = 10;

const DateTimeSchema = z.string().transform((val, ctx) => {
	const dt = DateTime.fromISO(val);
	if (!dt.isValid) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: "Invalid ISO datetime",
		});
		return z.NEVER;
	}
	return dt;
});

const FrontmatterSchema = z.object({
	periodType: z.enum([
		PERIOD_TYPES.DAILY,
		PERIOD_TYPES.WEEKLY,
		PERIOD_TYPES.MONTHLY,
		PERIOD_TYPES.QUARTERLY,
		PERIOD_TYPES.YEARLY,
	]),
	periodStart: DateTimeSchema,
	periodEnd: DateTimeSchema,
});

export type IndexerEvent =
	| {
			type: "note-indexed";
			filePath: string;
			oldPath?: string;
			note: IndexedPeriodNote;
	  }
	| {
			type: "note-deleted";
			filePath: string;
	  };

type VaultEvent = "create" | "modify" | "delete" | "rename";
type FileIntent = { kind: "changed"; file: TFile; path: string; oldPath?: string } | { kind: "deleted"; path: string };

export class PeriodicNoteIndexer {
	private settings: PeriodicPlannerSettings;
	private fileSub: Subscription | null = null;
	private settingsSubscription: Subscription | null = null;
	private vault: Vault;
	private metadataCache: MetadataCache;
	private scanEventsSubject = new Subject<IndexerEvent>();
	private indexingCompleteSubject = new RxBehaviorSubject<boolean>(false);

	public readonly events$: Observable<IndexerEvent>;
	public readonly indexingComplete$: Observable<boolean>;

	constructor(app: App, settingsStore: BehaviorSubject<PeriodicPlannerSettings>) {
		this.vault = app.vault;
		this.metadataCache = app.metadataCache;
		this.settings = settingsStore.value;

		this.settingsSubscription = settingsStore.subscribe((newSettings) => {
			this.settings = newSettings;
		});

		this.events$ = this.scanEventsSubject.asObservable();
		this.indexingComplete$ = this.indexingCompleteSubject.asObservable();
	}

	async start(): Promise<void> {
		this.indexingCompleteSubject.next(false);
		const fileSystemEvents$ = this.buildFileSystemEvents$();
		this.fileSub = fileSystemEvents$.subscribe((event) => {
			this.scanEventsSubject.next(event);
		});
		await this.scanAllFiles();
	}

	stop(): void {
		this.fileSub?.unsubscribe();
		this.fileSub = null;
		this.settingsSubscription?.unsubscribe();
		this.settingsSubscription = null;
		this.indexingCompleteSubject.complete();
		this.scanEventsSubject.complete();
	}

	resync(): void {
		this.indexingCompleteSubject.next(false);
		void this.scanAllFiles();
	}

	private async scanAllFiles(): Promise<void> {
		const allFiles = this.vault.getMarkdownFiles();
		const relevantFiles = allFiles.filter((file) => this.isRelevantFile(file));

		const events$ = from(relevantFiles).pipe(
			mergeMap(async (file) => {
				try {
					return await this.buildEventsForFile(file);
				} catch (error) {
					console.error(`Error processing file ${file.path}:`, error);
					return [];
				}
			}, SCAN_CONCURRENCY),
			mergeMap((events) => events),
			toArray()
		);

		try {
			const allEvents = await lastValueFrom(events$);
			for (const event of allEvents) {
				this.scanEventsSubject.next(event);
			}
			this.indexingCompleteSubject.next(true);
		} catch (error) {
			console.error("Error during file scanning:", error);
			this.indexingCompleteSubject.next(true);
		}
	}

	private fromVaultEvent(eventName: VaultEvent): Observable<TAbstractFile> {
		if (eventName === "create") {
			return fromEventPattern<TAbstractFile>(
				(handler) => this.vault.on("create", handler),
				(handler) => this.vault.off("create", handler)
			);
		}
		if (eventName === "modify") {
			return fromEventPattern<TAbstractFile>(
				(handler) => this.vault.on("modify", handler),
				(handler) => this.vault.off("modify", handler)
			);
		}
		if (eventName === "delete") {
			return fromEventPattern<TAbstractFile>(
				(handler) => this.vault.on("delete", handler),
				(handler) => this.vault.off("delete", handler)
			);
		}
		return fromEventPattern<[TAbstractFile, string]>(
			(handler) => this.vault.on("rename", handler),
			(handler) => this.vault.off("rename", handler)
		).pipe(map(([file]) => file));
	}

	private static isMarkdownFile(f: TAbstractFile): f is TFile {
		return f instanceof TFile && f.extension === "md";
	}

	private toRelevantFiles<T extends TAbstractFile>() {
		return (source: Observable<T>) =>
			source.pipe(
				filter((f: TAbstractFile): f is TFile => PeriodicNoteIndexer.isMarkdownFile(f)),
				filter((f) => this.isRelevantFile(f))
			);
	}

	private debounceByPath<T>(ms: number, key: (x: T) => string) {
		return (source: Observable<T>) =>
			source.pipe(
				groupBy(key),
				mergeMap((g$) => g$.pipe(debounceTime(ms)))
			);
	}

	private buildFileSystemEvents$(): Observable<IndexerEvent> {
		const created$ = this.fromVaultEvent("create").pipe(this.toRelevantFiles());
		const modified$ = this.fromVaultEvent("modify").pipe(this.toRelevantFiles());
		const deleted$ = this.fromVaultEvent("delete").pipe(this.toRelevantFiles());

		const renamed$ = fromEventPattern<[TAbstractFile, string]>(
			(handler) => this.vault.on("rename", handler),
			(handler) => this.vault.off("rename", handler)
		);

		const changedIntents$ = merge(created$, modified$).pipe(
			this.debounceByPath(100, (f) => f.path),
			map((file): FileIntent => ({ kind: "changed", file, path: file.path }))
		);

		const deletedIntents$ = deleted$.pipe(map((file): FileIntent => ({ kind: "deleted", path: file.path })));

		const renamedIntents$ = renamed$.pipe(
			map(([f, oldPath]) => [f, oldPath] as const),
			filter(([f]) => PeriodicNoteIndexer.isMarkdownFile(f) && this.isRelevantFile(f)),
			mergeMap(([f, oldPath]) => [
				{ kind: "deleted", path: oldPath } as FileIntent,
				{ kind: "changed", file: f, path: f.path, oldPath } as FileIntent,
			])
		);

		const intents$ = merge(changedIntents$, deletedIntents$, renamedIntents$);

		return intents$.pipe(
			switchMap((intent) => {
				if (intent.kind === "deleted") {
					return of<IndexerEvent>({ type: "note-deleted", filePath: intent.path });
				}
				return from(this.buildEventsForFile(intent.file, intent.oldPath)).pipe(mergeMap((events) => events));
			}),
			filter((e): e is IndexerEvent => e !== null)
		);
	}

	private async buildEventsForFile(file: TFile, oldPath?: string): Promise<IndexerEvent[]> {
		const cache = this.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) return [];

		const note = await this.parseFileToNote(file, cache.frontmatter);
		if (!note) return [];

		return [{ type: "note-indexed", filePath: file.path, oldPath, note }];
	}

	private async parseFileToNote(file: TFile, frontmatter: Record<string, unknown>): Promise<IndexedPeriodNote | null> {
		const props = this.settings.properties;

		const extracted = {
			periodType: frontmatter[props.periodTypeProp],
			periodStart: frontmatter[props.periodStartProp],
			periodEnd: frontmatter[props.periodEndProp],
		};

		const result = FrontmatterSchema.safeParse(extracted);
		if (!result.success) {
			console.debug(`File ${file.path} is not a valid periodic note:`, result.error.format());
			return null;
		}

		const parentLinks = extractParentLinksFromFrontmatter(frontmatter, props);
		const categoryAllocations = await this.extractCategoryAllocations(file);

		const rawHours: unknown = frontmatter[props.hoursAvailableProp];
		const hoursAvailable =
			typeof rawHours === "number" ? rawHours : getHoursForPeriodType(this.settings.timeBudget, result.data.periodType);

		return {
			file,
			filePath: file.path,
			periodType: result.data.periodType,
			periodStart: result.data.periodStart,
			periodEnd: result.data.periodEnd,
			noteName: file.basename,
			mtime: file.stat.mtime,
			hoursAvailable,
			parentLinks,
			categoryAllocations,
		};
	}

	private async extractCategoryAllocations(file: TFile): Promise<Map<string, number>> {
		const allocations = new Map<string, number>();

		try {
			const content = await this.vault.read(file);
			const codeBlockMatch = content.match(/```periodic-planner\n([\s\S]*?)```/);

			if (!codeBlockMatch) {
				return allocations;
			}

			const parsed = parseAllocationBlock(codeBlockMatch[1]);

			for (const allocation of parsed.allocations) {
				allocations.set(allocation.categoryName, allocation.hours);
			}
		} catch (error) {
			console.debug(`Error extracting allocations from ${file.path}:`, error);
		}

		return allocations;
	}

	private isRelevantFile(file: TFile): boolean {
		const folders = [
			this.settings.directories.dailyFolder,
			this.settings.directories.weeklyFolder,
			this.settings.directories.monthlyFolder,
			this.settings.directories.quarterlyFolder,
			this.settings.directories.yearlyFolder,
		];

		return folders.some((folder) => file.path.startsWith(folder));
	}
}
