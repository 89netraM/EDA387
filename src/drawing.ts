import { Processor } from "./Processor";
import { sleep } from "./util";

let size: [number, number] = [400, 400];

export function setSize(width: number, height: number): void {
	size = [width, height];
}

export async function drawProcessors(ctx: CanvasRenderingContext2D, processors: ReadonlyArray<Processor>, time: number, signal?: AbortSignal): Promise<void> {
	let i = 0;
	for (const pos of locations(processors.length)) {
		const processor = processors[i++];
		if (processor.color !== processor.previousColor) {
			drawProcessor(ctx, pos, processor);
			await sleep(time / processors.length, signal);
			if (signal?.aborted) {
				return;
			}
		}
	}
}

export function drawProcessor(ctx: CanvasRenderingContext2D, pos: [number, number], processor: Processor): void {
	const radius = 25;
	const cRadius = radius + 2;
	ctx.clearRect(pos[0] - cRadius, pos[1] - cRadius, cRadius * 2, cRadius * 2);

	ctx.beginPath();
	ctx.fillStyle = "#" + processor.color;
	ctx.ellipse(pos[0], pos[1], radius, radius, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.closePath();
}

export function* locations(count: number): Generator<[number, number], void, void> {
	const center = [size[0] / 2, size[1] / 2];
	const radius = Math.min(...size) / 4;
	for (let i = 0; i < count; i++) {
		const angle = Math.PI * 2 * (i / count) - Math.PI / 2;
		yield [center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)];
	}
}
