import { z } from "zod";

const ActivityWatchBucketSchema = z.object({
	id: z.string(),
	type: z.string(),
	client: z.string(),
	hostname: z.string(),
	created: z.string(),
	data: z.record(z.string(), z.unknown()),
	metadata: z.object({
		start: z.string().nullable(),
		end: z.string().nullable(),
	}),
	events: z.null(),
	last_updated: z.null(),
});

const ActivityWatchBucketsResponseSchema = z.record(z.string(), ActivityWatchBucketSchema);

const ActivityWatchEventSchema = z.object({
	id: z.number().nullable(),
	timestamp: z.string(),
	duration: z.number(),
	data: z
		.object({
			app: z.string().optional(),
			title: z.string().optional(),
		})
		.passthrough(),
});

const ActivityWatchQueryResponseSchema = z.array(z.array(ActivityWatchEventSchema));

const AppTimeDataSchema = z.object({
	app: z.string(),
	duration: z.number(),
});

const BucketIdsSchema = z.object({
	windowBucket: z.string().nullable(),
	afkBucket: z.string().nullable(),
});

const ActivityWatchDataSchema = z.object({
	totalActiveTime: z.number(),
	apps: z.array(
		z.object({
			name: z.string(),
			duration: z.number(),
		})
	),
});

export type ActivityWatchBucket = z.infer<typeof ActivityWatchBucketSchema>;
export type ActivityWatchBucketsResponse = z.infer<typeof ActivityWatchBucketsResponseSchema>;
export type ActivityWatchEvent = z.infer<typeof ActivityWatchEventSchema>;
export type ActivityWatchQueryResponse = z.infer<typeof ActivityWatchQueryResponseSchema>;
export type AppTimeData = z.infer<typeof AppTimeDataSchema>;
export type BucketIds = z.infer<typeof BucketIdsSchema>;
export type ActivityWatchData = z.infer<typeof ActivityWatchDataSchema>;

export function parseActivityWatchBlock(source: string): ActivityWatchData | null {
	try {
		const parsed = JSON.parse(source);
		return ActivityWatchDataSchema.parse(parsed);
	} catch {
		return null;
	}
}

export function serializeActivityWatchData(data: ActivityWatchData): string {
	return JSON.stringify(data, null, 2);
}

export {
	ActivityWatchBucketSchema,
	ActivityWatchBucketsResponseSchema, ActivityWatchDataSchema, ActivityWatchEventSchema,
	ActivityWatchQueryResponseSchema,
	AppTimeDataSchema,
	BucketIdsSchema
};
