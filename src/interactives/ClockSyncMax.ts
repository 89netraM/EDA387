import { calculateDiameter } from "../utils/graphs";
import { ClockSync, ClockSyncProcessor } from "./ClockSync";

export class ClockSyncMax extends ClockSync<Processor> {
	protected override makeProcessor(id: number, boundary: number): Processor {
		return new Processor(id, Math.floor(Math.random() * boundary));
	}

	protected override calculateBoundary(edges: ReadonlyMap<number, ReadonlySet<number>>): number {
		const diameter = calculateDiameter(edges);
		return (edges.size + 1) * diameter + 1;
	}
}

class Processor extends ClockSyncProcessor<Processor> {
	public step(neighbors: ReadonlyArray<Processor>, boundary: number): Processor {
		const max = Math.max(this.clock, ...neighbors.map(n => n.clock));
		return new Processor(this.id, (max + 1) % boundary);
	}
}
