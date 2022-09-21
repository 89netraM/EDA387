export abstract class CanvasBased {
	protected readonly canvas: HTMLCanvasElement;
	protected readonly ctx: CanvasRenderingContext2D;

	public constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.ctx = this.canvas.getContext("2d");

		this.onResize = this.onResize.bind(this);
		window.addEventListener("resize", this.onResize, true);
		this.onResize();
	}

	private onResize(): void {
		this.canvas.width = this.canvas.offsetWidth;
		this.canvas.height = this.canvas.offsetHeight;
		this.reDraw();
	}

	protected abstract reDraw(): void;

	protected clear() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

	public dispose(): void {
		window.removeEventListener("resize", this.onResize);
	}
}
