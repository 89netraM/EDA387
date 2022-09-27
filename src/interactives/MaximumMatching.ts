import { ProgramBased } from "./ProgramBased";
import { layout } from "../utils/graphLayout";
import { Vec } from "./GraphBased";

export interface MaximumMatchingIteration {
	isSafe: boolean;
	round: number;
}

export class MaximumMatching extends ProgramBased<Processor, MaximumMatchingIteration> {
	public static MatchedColor: string = "#bada55";
	public static WaitingColor: string = "#d9c755";
	public static FreeColor: string = "#a655d9";
	public static SingleColor: string = "#d95555";
	public static ChainingColor: string = "#5559d9";

	private static EdgeLength: number = 100;

	public static MaxNeighbors: number = 3;
	public static DefaultCount: number = 6;

	public count: number = MaximumMatching.DefaultCount;

	private round: number = 0;

	public onProgress: (percent: number) => void;

	public constructor(canvas: HTMLCanvasElement) {
		super(canvas);

		this.start();
	}

	public async reset(): Promise<void> {
		this.stop();
		this.abortController = new AbortController();

		this.round = 0;
		this.nodes = new Map<number, Processor>([...this.nodes].map(([id, p]) => [id, new Processor(id, null)]));
		if (this.abortController.signal.aborted) {
			return
		}

		this.program(this.abortController.signal);
	}

	protected override async init(signal: AbortSignal): Promise<[ReadonlyMap<number, ReadonlySet<number>>, ReadonlyMap<number, Processor>]> {
		this.round = 0;

		const edges = new Map<number, Set<number>>();
		const map = new Map<number, Processor>();
		for (let id = 0; id < this.count; id++) {
			map.set(id, new Processor(id, null));
			edges.set(id, new Set<number>());
		}

		for (const [from, _] of map) {
			const possibleNeighbors = new Array<number>();
			for (const [to, _] of map) {
				if (from !== to && edges.get(to).size < MaximumMatching.MaxNeighbors) {
					possibleNeighbors.push(to);
				}
			}
			while (possibleNeighbors.length > 0 && edges.get(from).size < MaximumMatching.MaxNeighbors) {
				const index = Math.floor(Math.random() * possibleNeighbors.length);
				const to = possibleNeighbors[index];
				possibleNeighbors.splice(index, 1);
				edges.get(from).add(to);
				edges.get(to).add(from);
			}
		}

		return [edges, map];
	}

	protected override stepIteration(): MaximumMatchingIteration {
		return {
			round: this.round++,
			isSafe: this.isSafe(),
		};
	}

	protected override shouldContinue(): boolean {
		return !this.isSafe();
	}

	private isSafe(): boolean {
		if (this.nodes?.size > 0) {
			for (const id of this.nodes.keys()) {
				const color = this.colorOf(this.edges, this.nodes, id);
				if (color !== MaximumMatching.MatchedColor && color !== MaximumMatching.SingleColor) {
					return false;
				}
			}
		}
		return true;
	}

	protected override stepNodes(): ReadonlyMap<number, Processor> {
		const map = new Map<number, Processor>();
		for (const [id, processor] of this.nodes) {
			const neighbors = new Map<number, Processor>();
			for (const nId of this.edges.get(id)) {
				neighbors.set(nId, this.nodes.get(nId));
			}
			map.set(id, processor.step(neighbors));
		}
		return map;
	}

	protected override async makeLayout(edges: ReadonlyMap<number, ReadonlySet<number>>, signal: AbortSignal): Promise<Map<number, Vec>> {
		const layoutMap = await layout(new Set<number>(edges.keys()), edges, signal, p => this.onProgress?.(p));
		for (const [_, pos] of layoutMap) {
			pos.x *= this.nodeRadius * 2 + MaximumMatching.EdgeLength;
			pos.y *= this.nodeRadius * 2 + MaximumMatching.EdgeLength;
		}
		return layoutMap;
	}

	protected override drawNodes(previousNodes: ReadonlyMap<number, Processor>, updatedNodeIds: ReadonlySet<number>): void {
		for (const id of this.nodes.keys()) {
			const node = (updatedNodeIds.has(id) ? this.nodes : previousNodes).get(id);
			if (node.connection != null) {
				this.drawEdge(this.layout.node(id), this.layout.node(node.connection));
			}
		}

		for (const id of this.nodes.keys()) {
			const color = this.colorOf(this.edges, updatedNodeIds.has(id) ? this.nodes : previousNodes, id);
			this.drawNode(this.layout.node(id), color);
		}
	}

	private colorOf(edges: ReadonlyMap<number, ReadonlySet<number>>, processors: ReadonlyMap<number, Processor>, id: number): string {
		const connection = processors.get(id).connection;
		if (connection != null) {
			const connectionConnection = processors.get(connection).connection;
			if (connectionConnection === id) {
				return MaximumMatching.MatchedColor;
			}
			else if (connectionConnection == null) {
				return MaximumMatching.WaitingColor;
			}
			else {
				return MaximumMatching.ChainingColor;
			}
		}
		else {
			if ([...edges.get(id)].every(n => processors.get(n).connection != null)) {
				return MaximumMatching.SingleColor;
			}
			else {
				return MaximumMatching.FreeColor;
			}
		}
	}
}

class Processor {
	public constructor(
		public readonly id: number,
		public readonly connection: number | null,
	) { }

	public step(neighbors: ReadonlyMap<number, Processor>): Processor {
		if (this.connection != null && neighbors.get(this.connection).connection === this.id) {
			return this;
		}
		if (this.connection == null) {
			for (const [_, n] of neighbors) {
				if (n.connection === this.id) {
					return new Processor(this.id, n.id);
				}
			}
			const neighborList = [...neighbors.values()];
			while (neighborList.length > 0) {
				const [n] = neighborList.splice(Math.floor(Math.random() * neighborList.length), 1);
				if (n.connection == null) {
					return new Processor(this.id, n.id);
				}
			}
		}
		return new Processor(this.id, null);
	}

	public equals(other: Processor): boolean {
		return this.id == other.id &&
			this.connection === other.connection;
	}
}
