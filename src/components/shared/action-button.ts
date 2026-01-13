import { cls } from "../../utils/css";

export class ActionButton {
	private button: HTMLButtonElement;
	private disabledGetter: () => boolean;

	constructor(
		container: HTMLElement,
		label: string,
		onClick: () => void,
		disabledGetter: () => boolean,
		buttonClass?: string
	) {
		this.button = container.createEl("button", {
			text: label,
			cls: buttonClass ?? cls("undo-redo-btn"),
		});
		this.disabledGetter = disabledGetter;
		this.update();
		this.button.addEventListener("click", onClick);
	}

	update(): void {
		this.button.disabled = this.disabledGetter();
	}

	getElement(): HTMLButtonElement {
		return this.button;
	}
}
