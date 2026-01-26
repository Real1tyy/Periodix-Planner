import { SETTINGS_DEFAULTS } from "../constants";

export function getDefaultCategoryColor(index: number): string {
	return SETTINGS_DEFAULTS.DEFAULT_CATEGORY_COLORS[index % SETTINGS_DEFAULTS.DEFAULT_CATEGORY_COLORS.length];
}
