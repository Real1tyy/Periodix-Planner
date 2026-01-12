export interface SettingsSection {
	readonly id: string;
	readonly label: string;
	render(container: HTMLElement): void;
}
