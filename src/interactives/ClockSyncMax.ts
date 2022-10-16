import { circleLayout } from "../utils/circleLayout";
import { calculateDiameter } from "../utils/graphs";
import { opacity, randomColor, themeColor } from "../utils/colors";
import { layout } from "../utils/graphLayout";
import { toSubscriptNumber } from "../utils/text";
import { Vec } from "../utils/Vec";
import { IEquatable, ProgramBased } from "./ProgramBased";
import { Layout } from "./GraphBased";

export interface ClockSyncMaxIteration {
	round: number;
	isSafe: boolean;
}

export class ClockSyncMax extends ProgramBased<Processor, ClockSyncMaxIteration> {
	public static DefaultCount: number = 3;
	public static MaxNeighbors: number = 2;

	private static CircleRadius: number = 0.8;
	private static EdgeLength: number = 100;

	public override drawTime: number = 850;

	public count: number = ClockSyncMax.DefaultCount;

	private boundary: number = 0;

	private round: number = 0;

	private clockLayout: Layout;

	public constructor(canvas: HTMLCanvasElement) {
		super(canvas);

		this.start();
	}

	public restart(): void {
		this.stop();
		this.clear();
		this.start();
	}

	public async reset(): Promise<void> {
		this.stop();
		this.abortController = new AbortController();

		this.round = 0;
		this.boundary = this.calculateBoundary(this.edges);
		this.nodes = new Map<number, Processor>([...this.nodes].map(([id, p]) => [id, new Processor(id, Math.floor(Math.random() * this.boundary))]));

		this.program(this.abortController.signal);
	}

	protected override init(): [ReadonlyMap<number, ReadonlySet<number>>, ReadonlyMap<number, Processor>] {
		this.round = 0;

		const edges = new Map<number, Set<number>>();
		for (let id = 0; id < this.count; id++) {
			edges.set(id, new Set<number>());
		}
		for (let from = 0; from < this.count; from++) {
			const possibleNeighbors = new Array<number>();
			for (let to = 0; to < from; to++) {
				if (edges.get(to).size < ClockSyncMax.MaxNeighbors) {
					possibleNeighbors.push(to);
				}
			}
			if (from !== 0 && possibleNeighbors.length === 0) {
				possibleNeighbors.push(Math.floor(Math.random() * from));
			}
			const neighborCount = Math.floor(Math.random() * ClockSyncMax.MaxNeighbors) + 1;
			while (possibleNeighbors.length > 0 && edges.get(from).size < neighborCount) {
				const index = Math.floor(Math.random() * possibleNeighbors.length);
				const to = possibleNeighbors[index];
				possibleNeighbors.splice(index, 1);
				edges.get(from).add(to);
				edges.get(to).add(from);
			}
		}

		this.boundary = this.calculateBoundary(edges);
		const nodes = new Map<number, Processor>();
		for (let id = 0; id < this.count; id++) {
			nodes.set(id, new Processor(id, Math.floor(Math.random() * this.boundary)));
		}

		const map = this.makeClockLayout(this.boundary);
		this.clockLayout = this.graphLayout(map);

		return [edges, nodes];
	}

	private calculateBoundary(edges: ReadonlyMap<number, ReadonlySet<number>>): number {
		const diameter = calculateDiameter(edges);
		return (edges.size + 1) * diameter + 1;
	}

	private makeClockLayout(boundary: number): Map<number, Vec> {
		const radius = Math.min(this.canvas.width, this.canvas.height / 2) / 2 * ClockSyncMax.CircleRadius;
		const layoutMap = circleLayout([...Array(boundary).keys()]);
		return new Map<number, Vec>([...layoutMap].map(([id, pos]) => [id, pos.scale(radius)]));
	}

	protected override stepIteration(): ClockSyncMaxIteration {
		return {
			round: this.round++,
			isSafe: this.isSafe(),
		};
	}

	private isSafe(): boolean {
		const clock = this.nodes.get(0).clock;
		for (const [, processor] of this.nodes) {
			if (processor.clock !== clock) {
				return false;
			}
		}
		return true;
	}

	protected override stepNodes(): ReadonlyMap<number, Processor> {
		const neighbors = new Map<number, Array<Processor>>([...this.nodes].map(([id, ]) => [id, new Array<Processor>()]));
		for (const [parent, children] of this.edges) {
			const parentNeighbors = neighbors.get(parent);
			const parentProcessor = this.nodes.get(parent);
			for (const child of children) {
				parentNeighbors.push(this.nodes.get(child));
				neighbors.get(child).push(parentProcessor);
			}
		}

		const map = new Map<number, Processor>();
		for (const [id, processor] of this.nodes) {
			map.set(id, processor.step(neighbors.get(id), this.boundary));
		}

		return map;
	}

	protected override makeLayout(edges: ReadonlyMap<number, ReadonlySet<number>>): Map<number, Vec> {
		const layoutMap = layout(new Set<number>(edges.keys()), edges);
		return new Map<number, Vec>([...layoutMap].map(([id, pos]) => [id, pos.scale(this.nodeRadius * 2 + ClockSyncMax.EdgeLength)]));
	}

	protected override drawAllNodes(previousNodes: ReadonlyMap<number, Processor>, signal: AbortSignal): Promise<void> {
		const drawTime = this.drawTime;
		const startTime = performance.now();
		return new Promise<void>(r => {
			const tick = (timestamp: number): void => {
				if (!signal.aborted) {
					const duration = timestamp - startTime;
					this.drawNodesAndEdgesTick(previousNodes, Math.min(duration / drawTime, 1));
					if (duration > drawTime) {
						r();
					} else {
						window.requestAnimationFrame(tick);
					}
				}
			};
			window.requestAnimationFrame(tick);
		});
	}

	protected override drawNodesAndEdges(previousNodes: ReadonlyMap<number, Processor>, updatedNodeIds: ReadonlySet<number>): void {
		this.drawNodesAndEdgesTick(previousNodes, 1);
	}

	private drawNodesAndEdgesTick(previousNodes: ReadonlyMap<number, Processor>, percentage: number): void {
		this.clear();

		this.drawNodesAndEdgesClock(previousNodes, percentage);
		this.drawNodesAndEdgesGraph(percentage >= 1 ? this.nodes : previousNodes);
	}

	private drawNodesAndEdgesClock(previousProcessors: ReadonlyMap<number, Processor>, percentage: number): void {
		const canvasSize = new Vec(this.canvas.width, this.canvas.height / 2);
		const offset = this.clockLayout.offset(canvasSize);
		const scale = this.clockLayout.scale(canvasSize);
		this.ctx.save();
		this.ctx.translate(offset.x, offset.y);
		this.ctx.scale(scale, scale);

		for (let time = 0; time < this.boundary; time++) {
			const pos = this.clockLayout.node(time);
			this.drawNodeLabel(pos, time.toFixed(0));
		}

		const angleZero = this.clockLayout.node(0);

		for (const id of this.nodes.keys()) {
			this.ctx.beginPath();
			this.ctx.strokeStyle = opacity(randomColor(id, this.nodes.size), 0.5);
			this.ctx.lineWidth = 2;
			this.ctx.setLineDash([]);
			const radius = angleZero.length - (this.nodeRadius * 1.5 + (id / this.nodes.size) * (angleZero.length / 2));
			this.ctx.ellipse(0, 0, radius, radius, 0, 0, Math.PI * 2);
			this.ctx.stroke();
			this.ctx.closePath();
		}

		const center = new Vec(0, 0);
		for (const id of this.nodes.keys()) {
			const processor = this.nodes.get(id);
			const rimPos = timePos(previousProcessors.get(id)?.clock ?? processor.clock, processor.clock, this.boundary);
			const dir = center.sub(rimPos);
			const pos = rimPos.add(dir.withLength(this.nodeRadius * 1.5 + (id / this.nodes.size) * (dir.length / 2)));
			this.drawNodeLabel(pos, processorLabel(processor));
		}

		this.ctx.restore();

		function timePos(from: number, to: number, boundary: number): Vec {
			const fromAngle = angleOf(from, boundary);
			let toAngle = angleOf(to, boundary);
			if (toAngle <= fromAngle) {
				toAngle += Math.PI * 2;
			}
			const angle = lerp(fromAngle, toAngle);
			return angleZero.rotate(angle);
		}

		function angleOf(time: number, boundary: number): number {
			return Math.PI * 2 * (time / boundary);
		}

		function lerp(from: number, to: number): number {
			return (to - from) * percentage + from;
		}
	}

	private drawNodesAndEdgesGraph(processors: ReadonlyMap<number, Processor>): void {
		const canvasSize = new Vec(this.canvas.width, this.canvas.height / 2);
		const offset = this.layout.offset(canvasSize).add(new Vec(0, this.canvas.height / 2));
		const scale = this.layout.scale(canvasSize);
		this.ctx.save();
		this.ctx.translate(offset.x, offset.y);
		this.ctx.scale(scale, scale);

		const seenConnections = new Set<string>();
		for (const [a, bs] of this.edges) {
			for (const b of bs) {
				const connectionId = makeConnectionId(a, b);
				if (!seenConnections.has(connectionId)) {
					this.drawConnection(this.layout.node(a), this.layout.node(b));
					seenConnections.add(connectionId);
				}
			}
		}

		this.drawNodes(processors);

		this.ctx.restore();

		function makeConnectionId(a: number, b: number): string {
			return `${Math.min(a, b)}:${Math.max(a, b)}`;
		}
	}

	protected override drawNodes(processors: ReadonlyMap<number, Processor>): void {
		for (const id of this.nodes.keys()) {
			const processor = processors.get(id);
			const pos = this.layout.node(id);
			this.drawNode(pos, themeColor("--level1-color"));
			this.drawNodeLabel(pos, processor.clock.toFixed(0));
			this.drawEdgeLabelNear(pos, pos.add(new Vec(this.nodeRadius, this.nodeRadius)), processorLabel(processor), randomColor(id, this.nodes.size));
		}
	}
}

class Processor implements IEquatable<Processor> {
	public constructor(
		public readonly id: number,
		public readonly clock: number,
	) { }

	public step(neighbors: ReadonlyArray<Processor>, boundary: number): Processor {
		const max = Math.max(this.clock, ...neighbors.map(n => n.clock));
		return new Processor(this.id, (max + 1) % boundary);
	}

	public equals(other: Processor): boolean {
		return this.id === other.id &&
			this.clock === other.clock;
	}
}

function processorLabel(processor: Processor): string {
	return `p${toSubscriptNumber(processor.id)}`;
}
