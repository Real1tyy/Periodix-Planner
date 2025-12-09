import type { DateTime } from "luxon";
import type { TFile } from "obsidian";
import type { PeriodType } from "../constants";
import type { TimeAllocation } from "./schemas";

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

export interface PeriodChildren {
	days?: IndexedPeriodNote[];
	weeks?: IndexedPeriodNote[];
	months?: IndexedPeriodNote[];
	quarters?: IndexedPeriodNote[];
}

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

export interface PeriodicNoteFrontmatter {
	periodType: PeriodType;
	periodStart: string;
	periodEnd: string;
	links: PeriodLinks;
	hoursAvailable: number;
	timeAllocations?: TimeAllocation[];
}

export interface NoteGenerationData {
	filePath: string;
	noteName: string;
	frontmatter: PeriodicNoteFrontmatter;
}

export interface NoteGenerationResult {
	success: boolean;
	filePath: string;
	alreadyExists: boolean;
	error?: string;
}
