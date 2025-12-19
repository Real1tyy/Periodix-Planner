import type { DateTime } from "luxon";
import { requestUrl } from "obsidian";
import {
	ActivityWatchBucketsResponseSchema,
	type ActivityWatchQueryResponse,
	ActivityWatchQueryResponseSchema,
	type AppTimeData,
	type BucketIds,
} from "../types/activity-watch";

export class ActivityWatchService {
	private apiUrl: string;

	constructor(apiUrl: string) {
		this.apiUrl = apiUrl.replace(/\/$/, "");
	}

	async listBuckets(): Promise<Record<string, unknown>> {
		const url = `${this.apiUrl}/api/0/buckets/`;

		try {
			const response = await requestUrl({
				url,
				method: "GET",
			});
			return ActivityWatchBucketsResponseSchema.parse(response.json);
		} catch (error) {
			console.error("[ActivityWatch] Failed to fetch buckets from", url);
			throw error;
		}
	}

	async getBucketIds(): Promise<BucketIds> {
		const buckets = await this.listBuckets();
		const bucketIds = Object.keys(buckets);

		const windowBucket = bucketIds.find((id) => id.startsWith("aw-watcher-window_")) ?? null;
		const afkBucket = bucketIds.find((id) => id.startsWith("aw-watcher-afk_")) ?? null;

		if (!windowBucket || !afkBucket) {
			const missing = [];
			if (!windowBucket) missing.push("window watcher");
			if (!afkBucket) missing.push("AFK watcher");
			console.warn(`[ActivityWatch] Missing ${missing.join(", ")} bucket(s). Available:`, bucketIds.join(", "));
		}

		return { windowBucket, afkBucket };
	}

	async queryTimeperiod(timeperiods: string[], query: string[]): Promise<ActivityWatchQueryResponse> {
		const url = `${this.apiUrl}/api/0/query`;

		try {
			const response = await requestUrl({
				url,
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ timeperiods, query }),
			});

			return ActivityWatchQueryResponseSchema.parse(response.json);
		} catch (error) {
			console.error("[ActivityWatch] Query failed:", error);
			throw error;
		}
	}

	async getDailyAppUsage(date: DateTime): Promise<AppTimeData[]> {
		const { windowBucket, afkBucket } = await this.getBucketIds();

		if (!windowBucket || !afkBucket) {
			throw new Error(`Could not find required ActivityWatch buckets (window: ${windowBucket}, afk: ${afkBucket})`);
		}

		const startOfDay = date.startOf("day");
		const startOfNextDay = date.plus({ days: 1 }).startOf("day");
		const timeperiod = `${startOfDay.toISO()}/${startOfNextDay.toISO()}`;

		const query = [
			`window = query_bucket("${windowBucket}");`,
			`afk = query_bucket("${afkBucket}");`,
			`afk = filter_keyvals(afk, "status", ["not-afk"]);`,
			`window = filter_period_intersect(window, afk);`,
			`merged = merge_events_by_keys(window, ["app"]);`,
			`RETURN = merged;`,
		];

		const results = await this.queryTimeperiod([timeperiod], query);
		const appData: Map<string, number> = new Map();

		if (results.length > 0) {
			for (const event of results[0]) {
				const app = event.data.app ?? "Unknown";
				appData.set(app, (appData.get(app) ?? 0) + event.duration);
			}
		}

		return Array.from(appData.entries())
			.map(([app, duration]) => ({ app, duration }))
			.sort((a, b) => b.duration - a.duration);
	}

	static generateActivityWatchCodeBlock(appData: AppTimeData[], codeFenceName: string): string {
		const totalSeconds = appData.reduce((sum, item) => sum + item.duration, 0);
		const apps = appData.map((item) => ({
			name: item.app,
			duration: Math.floor(item.duration),
		}));

		const data = {
			totalActiveTime: Math.floor(totalSeconds),
			apps: appData.length === 0 ? [] : apps,
		};

		return `\`\`\`${codeFenceName}\n${JSON.stringify(data, null, 2)}\n\`\`\``;
	}
}
