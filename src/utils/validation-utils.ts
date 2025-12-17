import { DateTime } from "luxon";
import { z } from "zod";

export const DateTimeSchema = z.string().transform((val, ctx) => {
	const dt = DateTime.fromISO(val);
	if (!dt.isValid) {
		ctx.addIssue({
			code: "custom",
			message: "Invalid ISO datetime",
		});
		return z.NEVER;
	}
	return dt;
});

export const ColorSchema = z
	.string()
	.regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color (e.g., #3B82F6)");
