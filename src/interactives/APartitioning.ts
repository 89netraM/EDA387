import { themeColor } from "../utils/colors";
import { treeLayout } from "../utils/treeLayout";
import { Vec } from "../utils/Vec";
import { IEquatable, ProgramBased } from "./ProgramBased";

export interface APartitioningIteration {
	round: number;
}

export class APartitioning extends ProgramBased<Processor, APartitioningIteration> {
	public static DefaultMaxHeight: number = 3;
	public static DefaultMaxChildCount: number = 3;

	private static EdgeLength: number = 100;

	protected override normalDistance: number = 0;
	protected override nodeRadius: number = 35;
	protected override labelSize: number = 0.55;

	public maxHeight: number = APartitioning.DefaultMaxHeight;
	public maxChildCount: number = APartitioning.DefaultMaxChildCount;

	public α: number = APartitioning.DefaultMaxChildCount + 2;

	private round: number = 0;

	public constructor(canvas: HTMLCanvasElement) {
		super(canvas);

		this.start();
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

	protected override stepIteration(): APartitioningIteration {
		return {
			round: this.round++,
		};
	}

	protected override stepNodes(): ReadonlyMap<number, Processor> {
		const map = new Map<number, Processor>();
		for (const [id, processor] of this.nodes) {
			map.set(id, processor.clone());
		}

		const neighbors = new Map<number, Map<number, Processor>>([...map].map(([id, ]) => [id, new Map<number, Processor>()]));
		for (const [parent, children] of this.edges) {
			const parentNeighbors = neighbors.get(parent);
			const parentProcessor = this.nodes.get(parent).clone();
			for (const child of children) {
				parentNeighbors.set(child, this.nodes.get(child).clone());
				neighbors.get(child).set(parent, parentProcessor);
			}
		}

		for (const [id, processor] of map) {
			processor.step([...neighbors.get(id).values()], this.α);
		}

		for (const [id, processor] of map) {
			const ogGroup = processor.connectedToParent;
			for (const ns of neighbors.values()) {
				const clone = ns.get(id);
				if (clone != null && clone.connectedToParent !== ogGroup) {
					processor.connectedToParent = clone.connectedToParent;
				}
			}
		}

		return map;
	}

	protected override makeLayout(edges: ReadonlyMap<number, ReadonlySet<number>>): Map<number, Vec> {
		return new Map<number, Vec>([...treeLayout(edges)].map(([id, pos]) => [id, pos.scale(this.nodeRadius * 2 + APartitioning.EdgeLength)]));
	}

	protected override drawNodes(previousNodes: ReadonlyMap<number, Processor>, updatedNodeIds: ReadonlySet<number>): void {
		for (const id of this.nodes.keys()) {
			const processor = (updatedNodeIds.has(id) ? this.nodes : previousNodes).get(id);
			const pos = this.layout.node(id);
			if (processor.connectedToParent) {
				this.drawEdgeToParent((updatedNodeIds.has(id) ? this.nodes : previousNodes), id);
			}
			this.drawNode(pos, themeColor("--level1-color"));
			this.drawNodeLabel(pos, `(${processor.connectedToParent ? "1" : "0"}, ${processor.edgeDistance}, ${processor.groupMemberCount})`);
		}
	}

	private drawEdgeToParent(nodes: ReadonlyMap<number, Processor>, childId: number): void {
		const child = nodes.get(childId);
		const childPos = this.layout.node(childId);
		for (const id of nodes.keys()) {
			const processor = nodes.get(id);
			if (processor.edgeDistance >= child.edgeDistance && this.edges.get(id).has(childId)) {
				this.drawEdge(childPos, this.layout.node(id));
			}
		}
		for (const id of this.edges.get(childId)) {
			const processor = nodes.get(id);
			if (processor.edgeDistance >= child.edgeDistance) {
				this.drawEdge(childPos, this.layout.node(id));
			}
		}
	}
}

class Processor implements IEquatable<Processor> {
	public constructor(
		public connectedToParent: boolean = false,
		public edgeDistance: number = 0,
		public groupMemberCount: number = 0,
	) { }

	public clone(): Processor {
		return new Processor(this.connectedToParent, this.edgeDistance, this.groupMemberCount);
	}

	public step(neighbors: ReadonlyArray<Processor>, α: number): void {
		this.edgeDistance = this.calculateEdgeDistance(neighbors);
		this.groupMemberCount = this.calculateGroupMemberCount(neighbors, α);
	}

	private calculateEdgeDistance(neighbors: ReadonlyArray<Processor>): number {
		if (neighbors.length === 1) {
			return 0;
		}
		else {
			return neighbors.reduce((d, n) => Math.min(d, n.edgeDistance), Number.POSITIVE_INFINITY) + 1;
		}
	}

	protected calculateGroupMemberCount(neighbors: ReadonlyArray<Processor>, α: number): number {
		const children = neighbors.filter(n => n.edgeDistance < this.edgeDistance);
		if (children.length > 0) {
			const allChildrenGroupMemberCount = children.reduce((c, n) => c + n.groupMemberCount, 0) + 1;
			if (allChildrenGroupMemberCount <= α) {
				for (const child of children) {
					child.connectedToParent = true;
				}
				return allChildrenGroupMemberCount;
			}

			let smallestGroupChildIndex = 0;
			for (let i = 0; i < children.length; i++) {
				if (children[i].groupMemberCount < children[smallestGroupChildIndex].groupMemberCount) {
					smallestGroupChildIndex = i;
				}
			}
			if (children[smallestGroupChildIndex].groupMemberCount + 1 <= α) {
				for (let i = 0; i < children.length; i++) {
					children[i].connectedToParent = smallestGroupChildIndex === i;
				}
				return children[smallestGroupChildIndex].groupMemberCount + 1;
			}

			for (const child of children) {
				child.connectedToParent = false;
			}
		}

		const peers = neighbors.filter(n => n.edgeDistance === this.edgeDistance && n.groupMemberCount + this.groupMemberCount <= α);
		if (peers.length === 1) {
			peers[0].connectedToParent = true;
			return this.groupMemberCount;
		}

		return 1;
	}

	public equals(other: Processor): boolean {
		return this.connectedToParent === other.connectedToParent &&
			this.edgeDistance === other.edgeDistance &&
			this.groupMemberCount === other.groupMemberCount;
	}
}
