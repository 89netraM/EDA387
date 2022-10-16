import { Vec } from "src/utils/Vec";
import { calculateDiameter } from "../utils/graphs";
import { ClockSync, ClockSyncProcessor } from "./ClockSync";

export class ClockSyncMin extends ClockSync<Processor> {
	protected override makeProcessor(id: number, boundary: number): Processor {
		return new Processor(id, Math.floor(Math.random() * boundary));
	}

	protected override calculateBoundary(edges: ReadonlyMap<number, ReadonlySet<number>>): number {
		const diameter = calculateDiameter(edges);
		return 2 * diameter + 1;
	}

	protected override timePos(from: number, to: number, percentage: number): Vec {
		const fromAngle = this.angleOf(from, this.boundary);

		let toAngle = this.angleOf(to, this.boundary);
		if (to === 0) {
			toAngle += Math.PI * 2;
		}

		const angle = this.lerp(fromAngle, toAngle, percentage);
		return this.clockLayout.node(0).rotate(angle);
	}
}

class Processor extends ClockSyncProcessor<Processor> {
	public step(neighbors: ReadonlyArray<Processor>, boundary: number): Processor {
		const min = Math.min(this.clock, ...neighbors.map(n => n.clock));
		return new Processor(this.id, (min + 1) % boundary);
	}
}
