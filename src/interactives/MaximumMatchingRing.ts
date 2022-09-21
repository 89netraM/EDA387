import { themeColor } from "../utils/colors";
import { sleep, waitForClick } from "../utils/promise";
import { CanvasBased } from "./CanvasBased";

export class MaximumMatchingRing extends CanvasBased {
	public count: number = 8;
	public delay: (signal: AbortSignal) => Promise<void>;
	public drawTime: number = 1000;

	public processorRadius: number = 25;
	public circleRadius: number = 0.25;
	public normalDistance: number = 0.25;
	public arrowLength: number = 15;
	public arrowWidth: number = 1;

	public static MatchedColor: string = "#bada55";
	public static WaitingColor: string = "#d9c755";
	public static FreeColor: string = "#a655d9";
	public static SingleColor: string = "#d95555";
	public static ChainingColor: string = "#5559d9";

	private previous: ReadonlyArray<Processor>;
	private processors: ReadonlyArray<Processor>;

	private abortController: AbortController;
	public onIterationComplete: (isSafe: boolean) => void;

	public get isSafe(): boolean {
		if (this.processors?.length > 0) {
			for (let i = 0; i < this.processors.length; i++) {
				const color = this.colorOf(this.processors, i);
				if (color !== MaximumMatchingRing.MatchedColor && (i !== 0 || color !== MaximumMatchingRing.SingleColor)) {
					return false;
				}
			}
		}
		return true;
	}

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
		this.previous = new Array<Processor>();
		this.processors = this.createProcessors(this.count);
		await this.allDrawProcessors(this.previous, this.processors, this.drawTime, signal);

		while (!signal.aborted && !this.isSafe) {
			await this.delay(signal);
			if (!signal.aborted) {
				this.previous = this.processors;
				this.processors = this.stepProcessors(this.processors);
				await this.allDrawProcessors(this.previous, this.processors, this.drawTime, signal);
				if (!signal.aborted) {
					this.onIterationComplete?.(this.isSafe);
				}
			}
		}
	}

	private createProcessors(count: number): Array<Processor> {
		const list = new Array<Processor>();
		list.push(new Master(randomConnection(), randomState()));
		for (let i = 1; i < count; i++) {
			list.push(new Slave(randomConnection(), randomState()));
		}
		return list;

		function randomConnection(): Connection {
			return Math.floor(Math.random() * 3);
		}
		function randomState(): boolean {
			return Math.random() < 0.5;
		}
	}
	private stepProcessors(processors: ReadonlyArray<Processor>): Array<Processor> {
		const list = new Array<Processor>();
		for (let i = 0; i < processors.length; i++) {
			const previousState = processors[(i - 1 + processors.length) % processors.length].state;
			list.push(processors[i].step(previousState));
		}
		return list;
	}

	private async allDrawProcessors(previous: ReadonlyArray<Processor>, processors: ReadonlyArray<Processor>, time: number, signal: AbortSignal): Promise<void> {
		for (let i = 0; i < processors.length; i++) {
			this.drawProcessors(previous, processors, i + 1);
			if (i >= previous.length || !processors[i].equals(previous[i])) {
				await sleep(time / processors.length, signal);
				if (signal.aborted) {
					return;
				}
			}
		}
	}
	private drawProcessors(previous: ReadonlyArray<Processor>, processors: ReadonlyArray<Processor>, count: number): void {
		const center = [this.canvas.width / 2, this.canvas.height / 2];
		const radius = Math.min(this.canvas.width, this.canvas.height) * this.circleRadius;
		this.clear();
		for (let i = 0; i < processors.length; i++) {
			const prevAngle = Math.PI * 2 * ((i - 1) / processors.length) - Math.PI / 2;
			const prev: [number, number] = [center[0] + (radius - this.processorRadius) * Math.cos(prevAngle), center[1] + (radius - this.processorRadius) * Math.sin(prevAngle)];
			const angle = Math.PI * 2 * (i / processors.length) - Math.PI / 2;
			const pos: [number, number] = [center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)];
			const nextAngle = Math.PI * 2 * ((i + 1) / processors.length) - Math.PI / 2;
			const next: [number, number] = [center[0] + (radius + this.processorRadius) * Math.cos(nextAngle), center[1] + (radius + this.processorRadius) * Math.sin(nextAngle)];
			if (i < count) {
				this.drawProcessor(prev, pos, angle, next, processors[i], this.colorOf(processors, i));
			}
			else if (i < previous.length) {
				this.drawProcessor(prev, pos, angle, next, previous[i], this.colorOf(previous, i));
			}
		}
	}
	private colorOf(processors: ReadonlyArray<Processor>, index: number): string {
		switch (processors[index].connection) {
			case Connection.Backward:
				switch (processors[(index - 1 + processors.length) % processors.length].connection) {
					case Connection.Backward:
						return MaximumMatchingRing.ChainingColor;
					case Connection.None:
						return MaximumMatchingRing.WaitingColor;
					case Connection.Forward:
						return MaximumMatchingRing.MatchedColor;
				}
			case Connection.None:
				if (processors[(index - 1 + processors.length) % processors.length].connection == Connection.None ||
					processors[(index + 1 + processors.length) % processors.length].connection == Connection.None) {
					return MaximumMatchingRing.FreeColor;
				}
				else {
					return MaximumMatchingRing.SingleColor;
				}
			case Connection.Forward:
				switch (processors[(index + 1 + processors.length) % processors.length].connection) {
					case Connection.Backward:
						return MaximumMatchingRing.MatchedColor;
					case Connection.None:
						return MaximumMatchingRing.WaitingColor;
					case Connection.Forward:
						return MaximumMatchingRing.ChainingColor;
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
	private drawProcessor(prev: [number, number], pos: [number, number], angle: number, next: [number, number], processor: Processor, color: string): void {
		this.ctx.beginPath();
		this.ctx.strokeStyle = this.ctx.fillStyle = themeColor("--color");
		this.ctx.lineWidth = 2;
		if (processor.connection === Connection.Backward) {
			const from: [number, number] = [pos[0] - this.processorRadius * Math.cos(angle), pos[1] - this.processorRadius * Math.sin(angle)];
			drawArc(this.ctx, from, prev, this.normalDistance, this.arrowWidth, this.arrowLength);
		} else if (processor.connection === Connection.Forward) {
			const from: [number, number] = [pos[0] + this.processorRadius * Math.cos(angle), pos[1] + this.processorRadius * Math.sin(angle)];
			drawArc(this.ctx, from, next, this.normalDistance, this.arrowWidth, this.arrowLength);
		}

		this.ctx.beginPath();
		this.ctx.fillStyle = color;
		this.ctx.ellipse(pos[0], pos[1], this.processorRadius, this.processorRadius, 0, 0, Math.PI * 2);
		this.ctx.fill();

		this.ctx.textAlign = "center";
		this.ctx.textBaseline = "middle";
		this.ctx.font = `${this.processorRadius * 0.75}px monospace`;
		this.ctx.fillStyle = "#ffffff";
		this.ctx.fillText(processor.state ? "1" : "0", pos[0], pos[1]);

		function drawArc(ctx: CanvasRenderingContext2D, from: [number, number], to: [number, number], normalDistance: number, arrowWidth: number, arrowLength: number): void {
			const diff = [to[0] - from[0], to[1] - from[1]];
			const distance = Math.sqrt(Math.pow(diff[0], 2) + Math.pow(diff[1], 2));
			const normal = [diff[1] * normalDistance, -diff[0] * normalDistance];
			const halfWay = [diff[0] / 2 + from[0], diff[1] / 2 + from[1]];
			const midPoint = [halfWay[0] + normal[0], halfWay[1] + normal[1]];

			ctx.beginPath();
			ctx.moveTo(from[0], from[1]);
			ctx.arcTo(midPoint[0], midPoint[1], to[0], to[1], distance * 0.75);
			ctx.lineTo(to[0], to[1]);
			ctx.stroke();

			const rightArrowPoint = withLength([midPoint[0] - normal[0] * arrowWidth - to[0], midPoint[1] - normal[1] * arrowWidth - to[1]], arrowLength);
			const leftArrowPoint = withLength([midPoint[0] + normal[0] * arrowWidth - to[0], midPoint[1] + normal[1] * arrowWidth - to[1]], arrowLength);
			ctx.beginPath();
			ctx.moveTo(rightArrowPoint[0] + to[0], rightArrowPoint[1] + to[1]);
			ctx.lineTo(to[0], to[1]);
			ctx.lineTo(leftArrowPoint[0] + to[0], leftArrowPoint[1] + to[1]);
			ctx.closePath();
			ctx.fill();

			function withLength(vec: [number, number], length: number): [number, number] {
				const l = Math.sqrt(Math.pow(vec[0], 2) + Math.pow(vec[1], 2));
				return [vec[0] / l * length, vec[1] / l * length];
			}
		}
	}

	protected reDraw(): void {
		if (this.processors != null) {
			this.drawProcessors(this.previous ?? new Array<Processor>(), this.processors, this.processors.length);
		}
	}

	public dispose(): void {
		super.dispose();
		this.stop();
	}
}

enum Connection {
	Backward,
	None,
	Forward,
}

abstract class Processor {
	private _connection: Connection;
	public get connection(): Connection {
		return this._connection;
	}

	private _state: boolean;
	public get state(): boolean {
		return this._state;
	}

	public constructor(connection: Connection, state: boolean) {
		this._connection = connection;
		this._state = state;
	}

	public abstract step(predecessorState: boolean): Processor;

	public equals(other: Processor): boolean {
		return this.connection === other.connection &&
			this.state === other.state;
	}
}

class Master extends Processor {
	public step(predecessorState: boolean): Processor {
		return new Master(
			predecessorState
				? Connection.Backward
				: Connection.None,
			false);
	}
}

class Slave extends Processor {
	public step(predecessorState: boolean): Processor {
		return new Slave(
			predecessorState
				? Connection.Backward
				: Connection.Forward,
			!predecessorState);
	}
}
