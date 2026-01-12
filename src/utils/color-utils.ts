import { SETTINGS_DEFAULTS } from "../constants";

/**
 * Converts a hex color string to RGB components
 * @param hex - Hex color string (with or without #)
 * @returns RGB components or null if invalid
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: Number.parseInt(result[1], 16),
				g: Number.parseInt(result[2], 16),
				b: Number.parseInt(result[3], 16),
			}
		: null;
}

/**
 * Gets a default category color by index
 * @param index - Index for color selection (wraps around)
 * @returns Hex color string
 */
export function getDefaultCategoryColor(index: number): string {
	return SETTINGS_DEFAULTS.DEFAULT_CATEGORY_COLORS[index % SETTINGS_DEFAULTS.DEFAULT_CATEGORY_COLORS.length];
}
