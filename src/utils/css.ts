import { createCssUtils } from "@real1ty-obsidian-plugins";

/**
 * CSS utilities for Periodix-Planner plugin.
 * Uses the shared factory with "periodic-planner-" prefix.
 */
const { cls, addCls, removeCls, toggleCls, hasCls } = createCssUtils("periodic-planner-");

export { cls, addCls, removeCls, toggleCls, hasCls };

/**
 * Sets a CSS custom property (variable) on an element.
 *
 * @example
 * setCssVar(element, "category-color", "#ff0000");
 * setCssVar(element, "percentage-width", "75%");
 */
export function setCssVar(element: HTMLElement, name: string, value: string): void {
	element.style.setProperty(`--${name}`, value);
}

/**
 * Finds or creates an element with the specified class name.
 * Avoids unnecessary DOM churn by reusing existing elements.
 * Returns typed element based on tag name.
 *
 * @example
 * const div = upsertElement(container, "div", cls("summary"));
 * const button = upsertElement(container, "button", cls("action-btn"), (btn) => {
 *   btn.textContent = "Click me";
 * });
 */
export function upsertElement<K extends keyof HTMLElementTagNameMap>(
	parent: ParentNode,
	tag: K,
	className: string,
	init?: (el: HTMLElementTagNameMap[K]) => void
): HTMLElementTagNameMap[K] {
	let el = parent.querySelector<HTMLElementTagNameMap[K]>(`.${className}`);

	if (!el) {
		el = document.createElement(tag);
		el.className = className;
		parent.appendChild(el);
	}

	init?.(el);
	return el;
}
