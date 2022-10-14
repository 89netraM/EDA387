import { randomInRange } from "../utils/math";
import { randomColor } from "../utils/colors";
import { layout } from "../utils/graphLayout";
import { Vec } from "../utils/Vec";
import { IEquatable, ProgramBased } from "./ProgramBased";

export interface MSTIteration {
	isSafe: boolean;
	round: number;
	processor: Processor | null;
}

export class MST extends ProgramBased<Processor, MSTIteration> {
	public static DefaultCount: number = 6;
	public static MaxNeighbors: number = 3;
	public static EdgeCostRange: [number, number] = [1, 5];

	private static EdgeLength: number = 100;

	protected override nodeRadius: number = 35;
	protected override labelSize: number = 0.55;
	protected override normalDistance: number = 0;

	public count: number = MST.DefaultCount;

	private edgeCost: ReadonlyMap<`${number}-${number}`, number>;

	public minimumSpanningCost: number = Number.POSITIVE_INFINITY;
	public get currentCost(): number {
		let cost = 0;
		for (const processor of this.nodes.values()) {
			for (const target of processor.connections) {
				cost += this.getEdgeCost(processor.id, target);
			}
		}
		return cost;
	}

	private round: number = 0;

	public onProgress: (percent: number) => void;

	private mouseOverCurrentId: number | null = null;
	public onProcessorHover: (processor: Processor | null) => void;

	public constructor(canvas: HTMLCanvasElement) {
		super(canvas);

		this.onMouseMoveCanvas = this.onMouseMoveCanvas.bind(this);
		this.canvas.addEventListener("mousemove", this.onMouseMoveCanvas, false);

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
		this.nodes = new Map<number, Processor>([...this.nodes].map(([id, p]) => [id, p.reset()]));
		this.edgeCost = this.generateEdgeCost(this.edges);
		this.minimumSpanningCost = this.calculateMinimumSpanningCost(this.edges);
		if (this.abortController.signal.aborted) {
			return;
		}

		this.program(this.abortController.signal);
	}

	protected override async init(signal: AbortSignal): Promise<[ReadonlyMap<number, ReadonlySet<number>>, ReadonlyMap<number, Processor>]> {
		this.round = 0;

		const edges = new Map<number, Set<number>>();
		const map = new Map<number, Processor>();
		for (let id = 0; id < this.count; id++) {
			map.set(id, new Processor(id));
			edges.set(id, new Set<number>());
		}

		for (const [from, _] of map) {
			const possibleNeighbors = new Array<number>();
			for (const [to, _] of map) {
				if (from !== to && edges.get(to).size < MST.MaxNeighbors) {
					possibleNeighbors.push(to);
				}
			}
			while (possibleNeighbors.length > 0 && edges.get(from).size < MST.MaxNeighbors) {
				const index = Math.floor(Math.random() * possibleNeighbors.length);
				const to = possibleNeighbors[index];
				possibleNeighbors.splice(index, 1);
				edges.get(from).add(to);
				edges.get(to).add(from);
			}
		}

		this.edgeCost = this.generateEdgeCost(edges);
		this.minimumSpanningCost = this.calculateMinimumSpanningCost(edges);

		return [edges, map];
	}

	private generateEdgeCost(edges: ReadonlyMap<number, ReadonlySet<number>>): ReadonlyMap<`${number}-${number}`, number> {
		const edgeCost = new Map<`${number}-${number}`, number>();
		for (const [from, tos] of edges) {
			for (const to of tos) {
				if (from < to) {
					edgeCost.set(`${from}-${to}`, randomInRange(...MST.EdgeCostRange));
				}
			}
		}
		return edgeCost;
	}

	private calculateMinimumSpanningCost(edges: ReadonlyMap<number, ReadonlySet<number>>): number {
		let cost = 0;

		const taken = new Set<number>([0]);
		const paths = new Array<string>();
		while (taken.size < edges.size) {
			let minimum: { from: Number, to: number, cost: number } | null = null;
			for (const [from, tos] of edges) {
				if (taken.has(from)) {
					for (const to of tos) {
						if (!taken.has(to)) {
							const edgeCost = this.getEdgeCost(from, to);
							if (edgeCost < (minimum?.cost ?? Number.POSITIVE_INFINITY)) {
								minimum = { from, to, cost: edgeCost };
							}
						}
					}
				}
			}
			cost += minimum.cost;
			taken.add(minimum.to);
			paths.push(`${minimum.from}➡${minimum.to}`);
		}

		return cost;
	}

	protected override stepIteration(): MSTIteration {
		return {
			isSafe: this.isSafe(),
			round: this.round++,
			processor: this.mouseOverCurrentId != null ? this.nodes.get(this.mouseOverCurrentId) : null,
		};
	}

	protected override shouldContinue(): boolean {
		return !this.isSafe();
	}

	private isSafe(): boolean {
		return this.currentCost === this.minimumSpanningCost;
	}

	protected override stepNodes(): ReadonlyMap<number, Processor> {
		const nodes = new Map<number, Processor>();
		for (const [id, node] of this.nodes) {
			const neighbors: Array<[Processor, number]> = [...this.edges.get(id)].map(toId => [this.nodes.get(toId), this.getEdgeCost(id, toId)]);
			nodes.set(id, node.step(neighbors));
		}
		return nodes;
	}

	private getEdgeCost(a: number, b: number): number {
		if (a < b) {
			return this.edgeCost.get(`${a}-${b}`);
		}
		else {
			return this.edgeCost.get(`${b}-${a}`);
		}
	}

	protected override async makeLayout(edges: ReadonlyMap<number, ReadonlySet<number>>, signal: AbortSignal): Promise<Map<number, Vec>> {
		const layoutMap = await layout(new Set<number>(edges.keys()), edges, signal, p => this.onProgress?.(p));
		return new Map<number, Vec>([...layoutMap].map(([id, pos]) => [id, pos.scale(this.nodeRadius * 2 + MST.EdgeLength)]));
	}

	protected override drawNodes(previousNodes: ReadonlyMap<number, Processor>, updatedNodeIds: ReadonlySet<number>): void {
		for (const id of this.nodes.keys()) {
			const processor = (updatedNodeIds.has(id) ? this.nodes : previousNodes).get(id);
			const pos = this.layout.node(id);

			for (const target of processor.connections) {
				this.drawEdge(pos, this.layout.node(target));
			}

			this.drawEdgeCost(id, pos);
			this.drawNode(pos, randomColor(processor.id, this.nodes.size));
			this.drawNodeLabel(pos, processor.id.toFixed(0));
		}
	}

	private drawEdgeCost(from: number, fromPos: Vec): void {
		for (const to of this.edges.get(from)) {
			if (from < to) {
				const toPos = this.layout.node(to);
				this.drawEdgeLabel(fromPos, toPos, this.edgeCost.get(`${from}-${to}`).toString());
			}
		}
	}

	private onMouseMoveCanvas(e: MouseEvent): void {
		if (this.nodes != null && this.layout != null) {
			const offset = this.layout.offset(new Vec(this.canvas.width, this.canvas.height));
			const mousePos = new Vec(e.offsetX, e.offsetY).sub(offset);
			for (const [id, processor] of this.nodes) {
				const diff = mousePos.sub(this.layout.node(id));
				if (diff.length < this.nodeRadius) {
					if (this.mouseOverCurrentId !== id) {
						this.mouseOverCurrentId = id;
						this.onProcessorHover?.(processor);
					}
					return;
				}
			}
			this.mouseOverCurrentId = null;
			this.onProcessorHover?.(null);
		}
	}

	public override dispose(): void {
		super.dispose();
		this.canvas.removeEventListener("mousemove", this.onMouseMoveCanvas);
	}
}

export class Processor implements IEquatable<Processor> {
	public constructor(
		public readonly id: number,
		public readonly graph: ImmutableGraph = new Map<number, Map<number, number>>(),
		public readonly mst: ReadonlyMap<number, ReadonlySet<number>> = new Map<number, Set<number>>(),
		public readonly connections: ReadonlySet<number> = new Set<number>(),
	) { }

	public step(neighbors: ReadonlyArray<[Processor, number]>): Processor {
		const graph = neighbors.reduce(
			(g, [n, _]) => insertGraph(g, n.graph),
			new Map<number, Map<number, number>>([[this.id, connectionsFromNeighbors(neighbors)]]));

		const mst = prims(graph);

		return new Processor(
			this.id,
			graph,
			mst,
			mst.get(this.id));

		function connectionsFromNeighbors(neighbors: ReadonlyArray<[Processor, number]>): Map<number, number> {
			const connections = new Map<number, number>();
			for (const [neighbor, weight] of neighbors) {
				connections.set(neighbor.id, weight);
			}
			return connections;
		}

		function insertGraph(aggregator: Graph, graph: ImmutableGraph): Graph {
			for (const [from, tos] of graph) {
				let connections: Map<number, number>;
				if (aggregator.has(from)) {
					connections = aggregator.get(from);
				} else {
					connections = new Map<number, number>();
					aggregator.set(from, connections);
				}
				for (const [to, weight] of tos) {
					connections.set(to, weight);
				}
			}
			return aggregator;
		}
	}

	public equals(other: Processor): boolean {
		return this.id === other.id &&
			connectionEquals(this.connections, other.connections);

		function connectionEquals(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
			return connectionSubset(a, b) && connectionSubset(b, a);
		}
		function connectionSubset(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
			return [...a].every(id => b.has(id));
		}
	}

	public reset(): Processor {
		return new Processor(this.id);
	}
}

type Graph = Map<number, Map<number, number>>;
type ImmutableGraph = ReadonlyMap<number, ReadonlyMap<number, number>>;

function prims(graph: ImmutableGraph): Map<number, Set<number>> {
	const nodes = new Set<number>([...graph].flatMap(([from, tos]) => [from, ...[...tos].map(([to, _]) => to)]));
	const visited = new Set<number>([[...graph].reduce((m, [id, _]) => Math.min(m, id), Number.POSITIVE_INFINITY)]);
	const layout = new Map<number, Set<number>>([...graph].map(([id, _]) => [id, new Set<number>()]));
	while (visited.size < nodes.size) {
		let minimum: { from: number, to: number, weight: number } | null = null;
		for (const [from, tos] of [...graph].sort(([a, ], [b, ]) => a - b)) {
			if (visited.has(from)) {
				for (const [to, weight] of [...tos].sort(([a, ], [b, ]) => a - b)) {
					if (!visited.has(to)) {
						if (weight < (minimum?.weight ?? Number.POSITIVE_INFINITY)) {
							minimum = { from, to, weight };
						}
					}
				}
			}
		}
		visited.add(minimum.to);
		layout.get(minimum.from).add(minimum.to);
	}
	return layout;
}
