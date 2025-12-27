import type { DateTime } from "luxon";
import type { TFile } from "obsidian";
import type { PeriodType } from "../constants";

export interface IndexedPeriodNote {
	file: TFile;
	filePath: string;
	periodType: PeriodType;
	periodStart: DateTime;
	periodEnd: DateTime;
	noteName: string;
	mtime: number;
	hoursAvailable: number;
	hoursSpent: number;
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

export interface NoteGenerationResult {
	success: boolean;
	filePath: string;
	alreadyExists: boolean;
	error?: string;
}
