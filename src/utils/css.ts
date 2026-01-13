const CSS_PREFIX = "periodic-planner-";

/**
 * Prefixes class names with the standard plugin prefix.
 * Handles multiple class names and automatically adds the prefix.
 *
 * @example
 * cls("calendar-view") => "prisma-calendar-view"
 * cls("button", "active") => "prisma-button prisma-active"
 * cls("modal calendar") => "prisma-modal prisma-calendar"
 */
export function cls(...classNames: string[]): string {
	return classNames
		.flatMap((name) => name.split(/\s+/))
		.filter((name) => name.length > 0)
		.map((name) => `${CSS_PREFIX}${name}`)
		.join(" ");
}

/**
 * Adds prefixed class names to an element.
 *
 * @example
 * addCls(element, "active", "selected")
 */
export function addCls(element: HTMLElement, ...classNames: string[]): void {
	const classes = cls(...classNames);
	if (classes) {
		element.classList.add(...classes.split(/\s+/));
	}
}

/**
 * Removes prefixed class names from an element.
 *
 * @example
 * removeCls(element, "active", "selected")
 */
export function removeCls(element: HTMLElement, ...classNames: string[]): void {
	const classes = cls(...classNames);
	if (classes) {
		element.classList.remove(...classes.split(/\s+/));
	}
}

/**
 * Toggles prefixed class names on an element.
 *
 * @example
 * toggleCls(element, "active")
 */
export function toggleCls(element: HTMLElement, className: string, force?: boolean): boolean {
	return element.classList.toggle(cls(className), force);
}

/**
 * Checks if element has a prefixed class.
 *
 * @example
 * hasCls(element, "active")
 */
export function hasCls(element: HTMLElement, className: string): boolean {
	return element.classList.contains(cls(className));
}

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
