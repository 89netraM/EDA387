import { circleLayout } from "../utils/circleLayout";
import { opacity, randomColor, themeColor } from "../utils/colors";
import { layout } from "../utils/graphLayout";
import { toSubscriptNumber } from "../utils/text";
import { Vec } from "../utils/Vec";
import { IEquatable, ProgramBased } from "./ProgramBased";
import { Layout } from "./GraphBased";

export interface ClockSyncIteration {
	round: number;
	isSafe: boolean;
}

export abstract class ClockSync<P extends ClockSyncProcessor<P>> extends ProgramBased<P, ClockSyncIteration> {
	public static DefaultCount: number = 3;
	public static MaxNeighbors: number = 2;

	private static CircleRadius: number = 0.8;
	private static EdgeLength: number = 100;

	public override drawTime: number = 850;

	public count: number = ClockSync.DefaultCount;

	protected boundary: number = 0;

	private round: number = 0;

	protected clockLayout: Layout;

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
		this.nodes = new Map<number, P>([...this.nodes].map(([id, p]) => [id, this.makeProcessor(id, this.boundary)]));

		this.program(this.abortController.signal);
	}

	protected override init(): [ReadonlyMap<number, ReadonlySet<number>>, ReadonlyMap<number, P>] {
		this.round = 0;

		const edges = new Map<number, Set<number>>();
		for (let id = 0; id < this.count; id++) {
			edges.set(id, new Set<number>());
		}
		for (let from = 0; from < this.count; from++) {
			const possibleNeighbors = new Array<number>();
			for (let to = 0; to < from; to++) {
				if (edges.get(to).size < ClockSync.MaxNeighbors) {
					possibleNeighbors.push(to);
				}
			}
			if (from !== 0 && possibleNeighbors.length === 0) {
				possibleNeighbors.push(Math.floor(Math.random() * from));
			}
			const neighborCount = Math.floor(Math.random() * ClockSync.MaxNeighbors) + 1;
			while (possibleNeighbors.length > 0 && edges.get(from).size < neighborCount) {
				const index = Math.floor(Math.random() * possibleNeighbors.length);
				const to = possibleNeighbors[index];
				possibleNeighbors.splice(index, 1);
				edges.get(from).add(to);
				edges.get(to).add(from);
			}
		}

		this.boundary = this.calculateBoundary(edges);
		const nodes = new Map<number, P>();
		for (let id = 0; id < this.count; id++) {
			nodes.set(id, this.makeProcessor(id, this.boundary));
		}

		const map = this.makeClockLayout(this.boundary);
		this.clockLayout = this.graphLayout(map);

		return [edges, nodes];
	}

	protected abstract makeProcessor(id: number, boundary: number): P;

	protected abstract calculateBoundary(edges: ReadonlyMap<number, ReadonlySet<number>>): number;

	private makeClockLayout(boundary: number): Map<number, Vec> {
		const radius = Math.min(this.canvas.width, this.canvas.height / 2) / 2 * ClockSync.CircleRadius;
		const layoutMap = circleLayout([...Array(boundary).keys()]);
		return new Map<number, Vec>([...layoutMap].map(([id, pos]) => [id, pos.scale(radius)]));
	}

	protected override stepIteration(): ClockSyncIteration {
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

	protected override stepNodes(): ReadonlyMap<number, P> {
		const neighbors = new Map<number, Array<P>>([...this.nodes].map(([id, ]) => [id, new Array<P>()]));
		for (const [parent, children] of this.edges) {
			const parentNeighbors = neighbors.get(parent);
			const parentProcessor = this.nodes.get(parent);
			for (const child of children) {
				parentNeighbors.push(this.nodes.get(child));
				neighbors.get(child).push(parentProcessor);
			}
		}

		const map = new Map<number, P>();
		for (const [id, processor] of this.nodes) {
			map.set(id, processor.step(neighbors.get(id), this.boundary));
		}

		return map;
	}

	protected override makeLayout(edges: ReadonlyMap<number, ReadonlySet<number>>): Map<number, Vec> {
		const layoutMap = layout(new Set<number>(edges.keys()), edges);
		return new Map<number, Vec>([...layoutMap].map(([id, pos]) => [id, pos.scale(this.nodeRadius * 2 + ClockSync.EdgeLength)]));
	}

	protected override drawAllNodes(previousNodes: ReadonlyMap<number, P>, signal: AbortSignal): Promise<void> {
		const drawTime = this.drawTime;
		const startTime = performance.now();
		return new Promise<void>(r => {
			const tick = (timestamp: number): void => {
				if (!signal.aborted) {
					const duration = Math.max(timestamp - startTime, 0);
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

	protected override drawNodesAndEdges(previousNodes: ReadonlyMap<number, P>, updatedNodeIds: ReadonlySet<number>): void {
		this.drawNodesAndEdgesTick(previousNodes, 1);
	}

	private drawNodesAndEdgesTick(previousNodes: ReadonlyMap<number, P>, percentage: number): void {
		this.clear();

		this.drawNodesAndEdgesClock(previousNodes, percentage);
		this.drawNodesAndEdgesGraph(percentage >= 1 ? this.nodes : previousNodes);
	}

	private drawNodesAndEdgesClock(previousProcessors: ReadonlyMap<number, P>, percentage: number): void {
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
			const rimPos = this.timePos(previousProcessors.get(id)?.clock ?? processor.clock, processor.clock, percentage);
			const dir = center.sub(rimPos);
			const pos = rimPos.add(dir.withLength(this.nodeRadius * 1.5 + (id / this.nodes.size) * (dir.length / 2)));
			this.drawNodeLabel(pos, processorLabel(processor));
		}

		this.ctx.restore();
	}

	protected timePos(from: number, to: number, percentage: number): Vec {
		const fromAngle = this.angleOf(from, this.boundary);
		const toAngle = this.wrapAroundToAngle(
			fromAngle,
			this.angleOf(to, this.boundary));
		const angle = this.lerp(fromAngle, toAngle, percentage);
		return this.clockLayout.node(0).rotate(angle);
	}

	protected wrapAroundToAngle(fromAngle: number, toAngle: number): number {
		if (toAngle <= fromAngle) {
			return toAngle + Math.PI * 2;
		} else {
			return toAngle;
		}
	}

	protected angleOf(time: number, boundary: number): number {
		return Math.PI * 2 * (time / boundary);
	}

	protected lerp(from: number, to: number, percentage: number): number {
		return (to - from) * percentage + from;
	}

	private drawNodesAndEdgesGraph(processors: ReadonlyMap<number, P>): void {
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

	protected override drawNodes(processors: ReadonlyMap<number, P>): void {
		for (const id of this.nodes.keys()) {
			const processor = processors.get(id);
			const pos = this.layout.node(id);
			this.drawNode(pos, themeColor("--level1-color"));
			this.drawNodeLabel(pos, processor.clock.toFixed(0));
			this.drawEdgeLabelNear(pos, pos.add(new Vec(this.nodeRadius, this.nodeRadius)), processorLabel(processor), randomColor(id, this.nodes.size));
		}
	}
}

export abstract class ClockSyncProcessor<TSelf extends ClockSyncProcessor<TSelf>> implements IEquatable<TSelf> {
	public constructor(
		public readonly id: number,
		public readonly clock: number,
	) { }

	public abstract step(neighbors: ReadonlyArray<TSelf>, boundary: number): TSelf;

	public equals(other: TSelf): boolean {
		return this.id === other.id &&
			this.clock === other.clock;
	}
}

function processorLabel<P extends ClockSyncProcessor<P>>(processor: P): string {
	return `p${toSubscriptNumber(processor.id)}`;
}
