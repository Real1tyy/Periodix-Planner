export class HorizontalDragController {
	private isActive = false;

	constructor(
		private onMove: (x: number) => void,
		private onEnd: () => void
	) {}

	bind(el: HTMLElement): void {
		el.addEventListener("mousemove", (e) => {
			if (this.isActive) {
				this.onMove(e.clientX);
			}
		});
		el.addEventListener("mouseup", () => {
			if (this.isActive) {
				this.end();
			}
		});
		el.addEventListener("mouseleave", () => {
			if (this.isActive) {
				this.end();
			}
		});

		el.addEventListener("touchmove", (e) => {
			if (this.isActive && e.touches.length > 0) {
				this.onMove(e.touches[0].clientX);
			}
		});
		el.addEventListener("touchend", () => {
			if (this.isActive) {
				this.end();
			}
		});
		el.addEventListener("touchcancel", () => {
			if (this.isActive) {
				this.end();
			}
		});
	}

	start(): void {
		this.isActive = true;
	}

	end(): void {
		if (this.isActive) {
			this.isActive = false;
			this.onEnd();
		}
	}
}
