import type { DateTime } from "luxon";
import type { TFile } from "obsidian";
import type { PeriodType } from "../constants";
import type { TimeAllocation } from "./schemas";

/**
 * Indexed periodic note entry stored in memory
 */
export interface IndexedPeriodNote {
	file: TFile;
	filePath: string;
	periodType: PeriodType;
	periodStart: DateTime;
	periodEnd: DateTime;
	noteName: string;
	mtime: number;
	hoursAvailable: number;
	parentLinks: {
		parent?: string;
		week?: string;
		month?: string;
		quarter?: string;
		year?: string;
	};
	categoryAllocations: Map<string, number>;
}

/**
 * Children of a period organized by type
 */
export interface PeriodChildren {
	days?: IndexedPeriodNote[];
	weeks?: IndexedPeriodNote[];
	months?: IndexedPeriodNote[];
	quarters?: IndexedPeriodNote[];
}

/**
 * Represents links from a periodic note to its related periods
 */
export interface PeriodLinks {
	previous: string | null;
	next: string | null;
	parent?: string;
	week?: string;
	month?: string;
	quarter?: string;
	year?: string;
	[key: string]: string | null | undefined;
}

/**
 * Complete frontmatter structure for a periodic note
 */
export interface PeriodicNoteFrontmatter {
	/** Type of period (daily, weekly, etc.) */
	periodType: PeriodType;
	/** Start date of the period (ISO string) */
	periodStart: string;
	/** End date of the period (ISO string) */
	periodEnd: string;
	/** Links to related periods */
	links: PeriodLinks;
	/** Total hours available in this period */
	hoursAvailable: number;
	/** Time allocated to categories (optional, mainly for yearly/quarterly) */
	timeAllocations?: TimeAllocation[];
}

/**
 * Data needed to generate a periodic note
 */
export interface NoteGenerationData {
	/** Full path where the note should be created */
	filePath: string;
	/** Name of the note (without extension) */
	noteName: string;
	/** Frontmatter to write to the note */
	frontmatter: PeriodicNoteFrontmatter;
}

/**
 * Result of a note generation attempt
 */
export interface NoteGenerationResult {
	/** Whether the note was successfully created */
	success: boolean;
	/** Path of the created/existing note */
	filePath: string;
	/** Whether the note already existed */
	alreadyExists: boolean;
	/** Error message if generation failed */
	error?: string;
}
