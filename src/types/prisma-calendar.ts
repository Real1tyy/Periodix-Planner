import { z } from "zod";

const PrismaCalendarEntrySchema = z.object({
	name: z.string(),
	duration: z.number(),
	durationFormatted: z.string(),
	percentage: z.string(),
	count: z.number(),
});

const PrismaCalendarDataSchema = z.object({
	totalDuration: z.number(),
	totalDurationFormatted: z.string(),
	totalEvents: z.number(),
	timedEvents: z.number(),
	allDayEvents: z.number(),
	skippedEvents: z.number(),
	doneEvents: z.number(),
	undoneEvents: z.number(),
	mode: z.enum(["name", "category"]),
	entries: z.array(PrismaCalendarEntrySchema),
});

export type PrismaCalendarEntry = z.infer<typeof PrismaCalendarEntrySchema>;
export type PrismaCalendarData = z.infer<typeof PrismaCalendarDataSchema>;

export function parsePrismaCalendarBlock(source: string): PrismaCalendarData | null {
	try {
		const parsed = JSON.parse(source);
		return PrismaCalendarDataSchema.parse(parsed);
	} catch {
		return null;
	}
}
