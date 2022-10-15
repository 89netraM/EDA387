import { treeLayout } from "../utils/treeLayout";
import { Vec } from "../utils/Vec";
import { IEquatable, ProgramBased } from "./ProgramBased";

export interface CenterFindingIteration {
	round: number;
	isSafe: boolean;
}

export class CenterFinding extends ProgramBased<Processor, CenterFindingIteration> {
	public static DefaultMaxHeight: number = 5;
	public static DefaultMaxChildCount: number = 2;

	public static Clean: string = "#d95555";
	public static Edge: string = "#d9a955";
	public static Done: string = "#bada55";
	public static Center: string = "#55d8d8";

	private static EdgeLength: number = 100;

	public maxHeight: number = CenterFinding.DefaultMaxHeight;
	public maxChildCount: number = CenterFinding.DefaultMaxChildCount;

	private round: number = 0;

	public constructor(canvas: HTMLCanvasElement) {
		super(canvas);

		this.start();
	}

	public async randomize(): Promise<void> {
		this.stop();
		this.abortController = new AbortController();

		this.round = 0;
		this.nodes = new Map<number, Processor>([...this.nodes].map(([id, _]) => [id, new Processor(Math.floor(Math.random() * 4))]));

		this.program(this.abortController.signal);
	}

	public async reset(): Promise<void> {
		this.stop();
		this.abortController = new AbortController();

		this.round = 0;
		this.nodes = new Map<number, Processor>([...this.nodes].map(([id, _]) => [id, new Processor()]));

		this.program(this.abortController.signal);
	}

	protected override init(): [ReadonlyMap<number, ReadonlySet<number>>, ReadonlyMap<number, Processor>] {
		this.round = 0;

		const edges = new Map<number, Set<number>>();
		const nodes = new Map<number, Processor>();

		nodes.set(0, new Processor());
		edges.set(0, new Set<number>());

		let nextId = 1;
		addChildren(0, 1, this.maxHeight, this.maxChildCount);

		return [edges, nodes];

		function addChildren(parent: number, level: number, maxHeight: number, maxChildCount: number): void {
			if (level < maxHeight) {
				const childCount = randomizedChildCount(level, maxHeight, maxChildCount);
				for (let i = 0; i < childCount; i++) {
					const child = nextId++;
					nodes.set(child, new Processor());
					edges.set(child, new Set<number>());
					edges.get(parent).add(child);
	
					addChildren(child, level + 1, maxHeight, maxChildCount);
				}
			}
		}

		function randomizedChildCount(level: number, maxHeight: number, maxChildCount: number): number {
			const guaranteed = Math.floor(((maxHeight - level) / maxHeight) * maxChildCount);
			const randomized = maxChildCount - guaranteed;
			return guaranteed + Math.floor(Math.random() * (randomized + 1));
		}
	}

	protected override stepIteration(): CenterFindingIteration {
		return {
			round: this.round++,
			isSafe: this.isSafe(),
		};
	}

	protected override shouldContinue(): boolean {
		return !this.isSafe();
	}

	private isSafe(): boolean {
		for (const processor of this.nodes.values()) {
			if (processor.state != State.Done && processor.state != State.Center) {
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
			map.set(id, processor.step(neighbors.get(id)));
		}

		return map;
	}

	protected override makeLayout(edges: ReadonlyMap<number, ReadonlySet<number>>): Map<number, Vec> {
		return new Map<number, Vec>([...treeLayout(edges)].map(([id, pos]) => [id, pos.scale(this.nodeRadius * 2 + CenterFinding.EdgeLength)]));
	}

	protected override drawNodes(previousNodes: ReadonlyMap<number, Processor>, updatedNodeIds: ReadonlySet<number>): void {
		for (const id of this.nodes.keys()) {
			this.drawNode(
				this.layout.node(id),
				this.colorOf((updatedNodeIds.has(id) ? this.nodes : previousNodes).get(id)));
		}
	}

	private colorOf(processor: Processor): string {
		switch (processor.state) {
			case State.Clean:
				return CenterFinding.Clean;
			case State.Edge:
				return CenterFinding.Edge;
			case State.Done:
				return CenterFinding.Done;
			case State.Center:
				return CenterFinding.Center;
		}
	}
}

enum State {
	Clean,
	Edge,
	Done,
	Center,
}

class Processor implements IEquatable<Processor> {
	public constructor(
		public readonly state: State = State.Clean,
	) { }

	public step(neighbors: ReadonlyArray<Processor>): Processor {
		if (this.state === State.Clean && Processor.oneClean(neighbors)) {
			return new Processor(State.Edge);
		}
		if (this.state === State.Edge && Processor.hasClean(neighbors)) {
			return new Processor(State.Done);
		}
		if ((this.state === State.Clean || this.state === State.Edge) && !Processor.hasClean(neighbors)) {
			return new Processor(State.Center);
		}
		return this;
	}

	private static oneClean(neighbors: ReadonlyArray<Processor>): boolean {
		let cleanCount = 0;
		for (const neighbor of neighbors) {
			if (neighbor.state === State.Clean) {
				cleanCount++;
			}
		}
		return cleanCount === 1;
	}

	private static hasClean(neighbors: ReadonlyArray<Processor>): boolean {
		return neighbors.some(n => n.state === State.Clean);
	}

	public equals(other: Processor): boolean {
		return this.state === other.state;
	}
}
