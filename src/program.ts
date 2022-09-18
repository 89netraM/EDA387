import { drawProcessors } from "./drawing";
import { Master, Processor, Slave } from "./Processor";
import { randomColor, waitForClick } from "./util";

let _delay: (signal: AbortSignal) => Promise<void> = waitForClick;

export function setDelay(delay: (signal: AbortSignal) => Promise<void>): void {
	_delay = delay;
}

export async function program(ctx: CanvasRenderingContext2D, count: number, signal?: AbortSignal): Promise<void> {
	const processors = createProcessors(count);
	await drawProcessors(ctx, processors, 1000, signal);

	while (!(signal?.aborted)) {
		await _delay?.(signal);
		stepProcessors(processors);
		await drawProcessors(ctx, processors, 1000, signal);
	}
}

function createProcessors(count: number): Array<Processor> {
	const list = new Array<Processor>();
	list.push(new Master(randomColor()));
	for (let i = 1; i < count; i++) {
		if (i === Math.floor(count / 2)) {
			list.push(new Slave(list[0].color));
		} else {
			list.push(new Slave(randomColor()));
		}
	}
	return list;
}

function stepProcessors(processors: ReadonlyArray<Processor>): void {
	prepareSteps(processors);

	processors[0].step(processors[processors.length - 1].previousColor);
	for (let i = 1; i < processors.length; i++) {
		processors[i].step(processors[i - 1].previousColor);
	}
}

function prepareSteps(processors: ReadonlyArray<Processor>): void {
	for (const processor of processors) {
		processor.prepareStep();
	}
}
