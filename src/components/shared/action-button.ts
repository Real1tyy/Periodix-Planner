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
			attr: { type: "button" },
		});
		this.disabledGetter = disabledGetter;
		this.update();
		// Use capture so this still fires even if some parent handler stops bubbling clicks.
		this.button.addEventListener(
			"click",
			(e) => {
				e.preventDefault();
				onClick();
			},
			{ capture: true }
		);
	}

	update(): void {
		this.button.disabled = this.disabledGetter();
	}

	getElement(): HTMLButtonElement {
		return this.button;
	}
}
