import { randomColor } from "../utils/colors";
import { layout } from "../utils/graphLayout";
import { Vec } from "../utils/Vec";
import { IEquatable, ProgramBased } from "./ProgramBased";

export interface LeaderElectionIteration {
	round: number;
	isSafe: boolean;
}

export class LeaderElection extends ProgramBased<Processor, LeaderElectionIteration> {
	public static DefaultCount: number = 6;
	public static MaxNeighbors: number = 3;

	private static EdgeLength: number = 100;

	protected override nodeRadius: number = 35;
	protected override labelSize: number = 0.55;

	public count: number = LeaderElection.DefaultCount;

	private round: number = 0;

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
		this.nodes = new Map<number, Processor>([...this.nodes].map(([id, p]) => [id, new Processor(id, null)]));
		if (this.abortController.signal.aborted) {
			return
		}

		this.program(this.abortController.signal);
	}

	protected override init(): [ReadonlyMap<number, ReadonlySet<number>>, ReadonlyMap<number, Processor>] {
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
				if (from !== to && edges.get(to).size < LeaderElection.MaxNeighbors) {
					possibleNeighbors.push(to);
				}
			}
			while (possibleNeighbors.length > 0 && edges.get(from).size < LeaderElection.MaxNeighbors) {
				const index = Math.floor(Math.random() * possibleNeighbors.length);
				const to = possibleNeighbors[index];
				possibleNeighbors.splice(index, 1);
				edges.get(from).add(to);
				edges.get(to).add(from);
			}
		}

		return [edges, map];
	}

	protected override stepIteration(): LeaderElectionIteration {
		return {
			round: this.round++,
			isSafe: this.isSafe(),
		};
	}

	protected override shouldContinue(): boolean {
		return !this.isSafe();
	}

	private isSafe(): boolean {
		let leader = null;
		for (const processor of this.nodes.values()) {
			if (leader != null && leader !== processor.leader) {
				return false;
			}
			leader = processor.leader;
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
			map.set(id, processor.step(neighbors.get(id), this.nodes.size));
		}

		return map;
	}

	protected override makeLayout(edges: ReadonlyMap<number, ReadonlySet<number>>): Map<number, Vec> {
		const layoutMap = layout(new Set<number>(edges.keys()), edges);
		return new Map<number, Vec>([...layoutMap].map(([id, pos]) => [id, pos.scale(this.nodeRadius * 2 + LeaderElection.EdgeLength)]));
	}

	protected override drawNodes(previousNodes: ReadonlyMap<number, Processor>, updatedNodeIds: ReadonlySet<number>): void {
		for (const id of this.nodes.keys()) {
			const processor = (updatedNodeIds.has(id) ? this.nodes : previousNodes).get(id);
			const pos = this.layout.node(id);
			if (processor.parent != null) {
				this.drawEdge(pos, this.layout.node(processor.parent));
			}
			this.drawNode(pos, randomColor(processor.leader, this.nodes.size));
			this.drawNodeLabel(pos, `(${processor.leader}, ${processor.leaderDistance})`);
		}
	}
}

class Processor implements IEquatable<Processor> {
	public constructor(
		public readonly id: number,
		public readonly parent: number | null = null,
		public readonly leader: number = id,
		public readonly leaderDistance: number = 0,
	) { }

	public step(neighbors: ReadonlyArray<Processor>, nodeCount: number): Processor {
		let parent = null;
		let candidate = this.id;
		let candidateDistance = 0;

		for (const neighbor of [...neighbors].sort((a, b) => b.id - a.id)) {
			if (neighbor.leaderDistance < nodeCount && (neighbor.leader < candidate || (neighbor.leader === candidate && neighbor.leaderDistance < candidateDistance))) {
				parent = neighbor.id;
				candidate = neighbor.leader;
				candidateDistance = neighbor.leaderDistance + 1;
			}
		}

		return new Processor(this.id, parent, candidate, candidateDistance);
	}

	public equals(other: Processor): boolean {
		return this.leader === other.leader &&
			this.leaderDistance === other.leaderDistance;
	}
}
