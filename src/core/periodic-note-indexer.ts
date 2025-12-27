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
import { PERIOD_TYPES } from "../constants";
import type { IndexedPeriodNote, PeriodicPlannerSettings } from "../types";
import { injectActivityWatchContent } from "../utils/activity-watch";
import { parseFileToNote, updateHoursSpentInFrontmatter } from "../utils/note-utils";

const SCAN_CONCURRENCY = 10;

type IndexerEvent =
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
	private app: App;
	private vault: Vault;
	private metadataCache: MetadataCache;
	private scanEventsSubject = new Subject<IndexerEvent>();
	private indexingCompleteSubject = new RxBehaviorSubject<boolean>(false);

	public readonly events$: Observable<IndexerEvent>;
	public readonly indexingComplete$: Observable<boolean>;

	constructor(app: App, settingsStore: BehaviorSubject<PeriodicPlannerSettings>) {
		this.app = app;
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

	async refreshFile(file: TFile): Promise<void> {
		if (!this.isRelevantFile(file)) return;

		try {
			const events = await this.buildEventsForFile(file);
			for (const event of events) {
				this.scanEventsSubject.next(event);
			}
		} catch (error) {
			console.error(`Error refreshing file ${file.path}:`, error);
		}
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
		const frontmatter = cache?.frontmatter ?? {};

		const note = await parseFileToNote(file, frontmatter, this.vault, this.settings, this.app);
		if (!note) return [];

		await updateHoursSpentInFrontmatter(this.app, file, note.hoursSpent, this.settings.properties.hoursSpentProp);

		if (note.periodType === PERIOD_TYPES.DAILY) {
			await injectActivityWatchContent(this.app, file, note.periodStart, this.settings);
		}

		return [{ type: "note-indexed", filePath: file.path, oldPath, note }];
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
