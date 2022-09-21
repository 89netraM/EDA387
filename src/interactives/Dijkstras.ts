import { sleep, waitForClick } from "../utils/promise";
import { randomColor, randomIndex } from "../utils/colors";
import { CanvasBased } from "./CanvasBased";

export class Dijkstras extends CanvasBased {
	public count: number = 8;
	public delay: (signal: AbortSignal) => Promise<void>;
	public drawTime: number = 1000;

	public processorRadius: number = 25;
	public circleRadius: number = 0.25;

	private abortController: AbortController;
	private processors: ReadonlyArray<Processor> = new Array<Processor>();

	public get isSafe(): boolean {
		if (this.processors.length > 0) {
			let indexCount = 0;
			let currentIndex = this.processors[0].index;
			for (const processor of this.processors) {
				if (processor.index !== currentIndex) {
					indexCount++;
					currentIndex = processor.index;
					if (indexCount >= 2) {
						return false;
					}
				}
			}
		}
		return true;
	}

	public onIterationComplete: (isSafe: boolean) => void;

	public constructor(canvas: HTMLCanvasElement) {
		super(canvas);

		this.delay = s => waitForClick(this.canvas, s);

		this.start();
	}

	private start(): void {
		this.abortController = new AbortController();
		this.program(this.abortController.signal);
	}
	private stop(): void {
		this.abortController?.abort();
	}
	public restart(): void {
		this.stop();
		this.start();
	}

	private async program(signal: AbortSignal): Promise<void> {
		this.processors = this.createProcessors(this.count);
		await this.allDrawProcessors(this.processors, this.drawTime, signal);

		while (!signal.aborted) {
			await this.delay(signal);
			if (!signal.aborted) {
				this.stepProcessors(this.processors);
				await this.allDrawProcessors(this.processors, this.drawTime, signal);
				if (!signal.aborted) {
					this.onIterationComplete?.(this.isSafe);
				}
			}
		}
	}

	private createProcessors(count: number): Array<Processor> {
		const list = new Array<Processor>();
		list.push(new Master(randomIndex(count + 1), count));
		for (let i = 1; i < count; i++) {
			list.push(new Slave(randomIndex(count + 1)));
		}
		return list;
	}
	private stepProcessors(processors: ReadonlyArray<Processor>): void {
		for (const processor of processors) {
			processor.prepareStep();
		}
		processors[0].step(processors[processors.length - 1].previousIndex);
		for (let i = 1; i < processors.length; i++) {
			processors[i].step(processors[i - 1].previousIndex);
		}
	}

	private async allDrawProcessors(processors: ReadonlyArray<Processor>, time: number, signal?: AbortSignal): Promise<void> {
		for (let i = 0; i < processors.length; i++) {
			if (processors[i].index !== processors[i].previousIndex) {
				this.drawProcessors(processors, i + 1);
				await sleep(time / processors.length, signal);
				if (signal.aborted) {
					return;
				}
			}
		}
	}
	protected reDraw(): void {
		if (this.processors != null) {
			this.drawProcessors(this.processors, this.processors.length);
		}
	}
	private drawProcessors(processors: ReadonlyArray<Processor>, count: number): void {
		const center = [this.canvas.width / 2, this.canvas.height / 2];
		const radius = Math.min(this.canvas.width, this.canvas.height) * this.circleRadius;
		this.clear();
		for (let i = 0; i < processors.length; i++) {
			const angle = Math.PI * 2 * (i / processors.length) - Math.PI / 2;
			const pos: [number, number] = [center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)];
			if (i < count) {
				this.drawProcessor(pos, processors[i].index, processors.length + 1);
			}
			else if (processors[i].previousIndex != null) {
				this.drawProcessor(pos, processors[i].previousIndex, processors.length + 1);
			}
		}
	}
	protected clear() {
		super.clear();

		const center = [this.canvas.width / 2, this.canvas.height / 2];
		const radius = Math.min(this.canvas.width, this.canvas.height) * this.circleRadius;
		this.ctx.textAlign = "center";
		this.ctx.textBaseline = "bottom";
		this.ctx.font = `${this.processorRadius * 2}px sans-serif`;
		this.ctx.fillText("👑", center[0], center[1] - radius - this.processorRadius);
	}
	private drawProcessor(pos: [number, number], index: number, processorCount: number): void {
		const radius = this.processorRadius;
		this.ctx.beginPath();
		this.ctx.fillStyle = randomColor(index, processorCount);
		this.ctx.ellipse(pos[0], pos[1], radius, radius, 0, 0, Math.PI * 2);
		this.ctx.fill();
		this.ctx.closePath();

		this.ctx.textAlign = "center";
		this.ctx.textBaseline = "middle";
		this.ctx.font = `${this.processorRadius * 0.75}px monospace`;
		this.ctx.fillStyle = "#ffffff";
		this.ctx.fillText(index.toString(), pos[0], pos[1]);
	}

	public dispose(): void {
		super.dispose();
		this.stop();
	}
}

export abstract class Processor {
	private _previousIndex: number;
	public get previousIndex(): number {
		return this._previousIndex;
	}

	public get index(): number {
		return this._index;
	}

	public constructor(protected _index: number) { }

	public prepareStep(): void {
		this._previousIndex = this._index;
	}

	public abstract step(previousIndex: number): void;
}

export class Master extends Processor {
	public constructor(_index: number, private readonly peers: number) {
		super(_index);
	}

	public step(previousIndex: number): void {
		while (previousIndex === this._index) {
			this._index = (this._index + 1) % (this.peers + 1);
		}
	}
}

export class Slave extends Processor {
	public step(previousIndex: number): void {
		this._index = previousIndex;
	}
}
