import { themeColor } from "../utils/colors";
import { treeLayout } from "../utils/treeLayout";
import { Vec } from "../utils/Vec";
import { IEquatable, ProgramBased } from "./ProgramBased";

export interface ATWLEIteration {
	round: number;
	isSafe: boolean;
}

export class ATWLE extends ProgramBased<Processor, ATWLEIteration> {
	public static DefaultMaxHeight: number = 5;
	public static DefaultMaxChildCount: number = 2;

	private static EdgeLength: number = 100;

	protected override nodeRadius: number = 30;
	protected leaderRadius: number = 10;
	protected override normalDistance: number = 0;
	protected override labelSize: number = 0.55;

	public maxHeight: number = ATWLE.DefaultMaxHeight;
	public maxChildCount: number = ATWLE.DefaultMaxChildCount;

	private round: number = 0;

	public onProgress: (percent: number) => void;

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
		this.nodes = new Map<number, Processor>([...this.nodes].map(([id, p]) => [id, Processor.RandomProcessor()]));
		if (this.abortController.signal.aborted) {
			return
		}

		this.program(this.abortController.signal);
	}

	protected override async init(signal: AbortSignal): Promise<[ReadonlyMap<number, ReadonlySet<number>>, ReadonlyMap<number, Processor>]> {
		this.round = 0;

		const edges = new Map<number, Set<number>>();
		const nodes = new Map<number, Processor>();

		nodes.set(0, Processor.RandomProcessor());
		edges.set(0, new Set<number>());

		let nextId = 1;
		addChildren(0, 1, this.maxHeight, this.maxChildCount);

		return [edges, nodes];

		function addChildren(parent: number, level: number, maxHeight: number, maxChildCount: number): void {
			if (level < maxHeight) {
				const childCount = randomizedChildCount(level, maxHeight, maxChildCount);
				for (let i = 0; i < childCount; i++) {
					const child = nextId++;
					nodes.set(child, Processor.RandomProcessor());
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

	protected override stepIteration(): ATWLEIteration {
		return {
			round: this.round++,
			isSafe: this.isSafe(),
		};
	}

	protected override shouldContinue(): boolean {
		return !this.isSafe();
	}

	private isSafe(): boolean {
		let leaderCount = 0;
		for (const processor of this.nodes.values()) {
			if (!processor.finished) {
				return false;
			}
			if (processor.leader) {
				leaderCount++;
			}
		}
		return 1 <= leaderCount && leaderCount <= 2;
	}

	protected override stepNodes(): ReadonlyMap<number, Processor> {
		const neighbors = new Map<number, Array<Processor>>([...this.nodes].map(([id,]) => [id, new Array<Processor>()]));
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

	protected override async makeLayout(edges: ReadonlyMap<number, ReadonlySet<number>>, signal: AbortSignal): Promise<Map<number, Vec>> {
		return new Map<number, Vec>([...treeLayout(edges)].map(([id, pos]) => [id, pos.scale(this.nodeRadius * 2 + ATWLE.EdgeLength)]));
	}

	protected override drawNodes(previousNodes: ReadonlyMap<number, Processor>, updatedNodeIds: ReadonlySet<number>): void {
		const neighbors = new Map<number, Array<[number, Processor]>>([...this.nodes].map(([id,]) => [id, new Array<[number, Processor]>()]));
		for (const [parent, children] of this.edges) {
			const parentNeighbors = neighbors.get(parent);
			const parentProcessor = this.nodes.get(parent);
			for (const child of children) {
				parentNeighbors.push([child, this.nodes.get(child)]);
				neighbors.get(child).push([parent, parentProcessor]);
			}
		}

		for (const id of this.nodes.keys()) {
			const processor = (updatedNodeIds.has(id) ? this.nodes : previousNodes).get(id);
			const pos = this.layout.node(id);

			const parent = processor.parent(neighbors.get(id).map(([_, n]) => n));
			if (parent != null) {
				const parentId = neighbors.get(id).find(([_, n]) => parent === n)[0];
				const parentPos = this.layout.node(parentId);
				this.drawEdge(pos, parentPos);
			}

			const color = processor.finished ? "#bada55" : themeColor("--level1-color");
			this.drawNodeRing(pos, color)
			if (processor.marked) {
				this.drawNode(pos, color);
			}
			if (processor.leader) {
				this.drawNodeRing(pos, color, this.leaderRadius);
			}
			this.drawNodeLabel(pos, `(${processor.es}, ${processor.tag})`);
		}
	}

	protected drawNodeRing(pos: Vec, color: string, padding: number = 0): void {
		this.ctx.beginPath();
		this.ctx.strokeStyle = color;
		this.ctx.lineWidth = 2;
		this.ctx.setLineDash([]);
		this.ctx.ellipse(pos.x, pos.y, this.nodeRadius + padding, this.nodeRadius + padding, 0, 0, Math.PI * 2);
		this.ctx.stroke();
	}
}

class Processor implements IEquatable<Processor> {
	public static RandomProcessor(): Processor {
		// return new Processor(
		// 	ErrorStatus.One,
		// 	false,
		// 	Tag.Zero,
		// 	false,
		// 	false);
		return new Processor(
			ErrorStatus.Random(),
			Math.random() < 0.5,
			Tag.Random(),
			Math.random() < 0.5,
			Math.random() < 0.5);
	}

	public constructor(
		public readonly es: ErrorStatus,
		public readonly marked: boolean,
		public readonly tag: Tag,
		public readonly leader: boolean,
		public readonly finished: boolean,
	) { }

	public step(neighbors: ReadonlyArray<Processor>): Processor {
		let { es, marked, tag, leader, finished } = this;

		if (this.canReset(neighbors)) {
			es = ErrorStatus.One;
			marked = false;
			tag = Tag.Zero;
			leader = false;
			finished = false;
		}
		if (this.canIncES(neighbors)) {
			es = ErrorStatus.Add(this.es, ErrorStatus.One);
		}
		if (this.isClear(neighbors)) {
			if (this.canMark(neighbors)) {
				marked = true;
				tag = Tag.One;
			}
			else if (this.canIncTag(neighbors)) {
				tag = Tag.Add(this.tag, Tag.One);
			}
			else if (this.canElectMyselfLeader(neighbors)) {
				leader = true;
			}
			else if (this.canAnnounceElection(neighbors)) {
				finished = true;
			}
		}

		return new Processor(es, marked, tag, leader, finished);
	}

	// public step(neighbors: ReadonlyArray<Processor>): Processor {
	// 	let t: Processor = this;

	// 	const canReset = t.canReset(neighbors);
	// 	const canIncES = t.canIncES(neighbors);
	// 	if (canReset || canIncES) {
	// 		if (canReset) {
	// 			t = new Processor(ErrorStatus.One, false, Tag.Zero, false, false);
	// 		}
	// 		if (canIncES) {
	// 			t = new Processor(ErrorStatus.Add(t.es, ErrorStatus.One), t.marked, t.tag, t.leader, t.finished);
	// 		}
	// 	}
	// 	else if (t.isClear(neighbors)) {
	// 		if (t.canMark(neighbors)) {
	// 			t = new Processor(t.es, true, Tag.One, t.leader, t.finished);
	// 		}
	// 		else if (t.canIncTag(neighbors)) {
	// 			t = new Processor(t.es, t.marked, Tag.Add(t.tag, Tag.One), t.leader, t.finished);
	// 		}
	// 		else if (t.canElectMyselfLeader(neighbors)) {
	// 			t = new Processor(t.es, t.marked, t.tag, true, t.finished);
	// 		}
	// 		else if (t.canAnnounceElection(neighbors)) {
	// 			t = new Processor(t.es, t.marked, t.tag, t.leader, true);
	// 		}
	// 	}

	// 	return t;
	// }

	private deltaTag(other: Processor): Tag {
		return Tag.Sub(this.tag, other.tag);
	}

	private children(neighbors: ReadonlyArray<Processor>): Array<Processor> {
		return neighbors.filter(this.isChildOf.bind(this));
	}
	private isChildOf(neighbor: Processor): boolean {
		const delta = neighbor.deltaTag(this);
		return delta === Tag.One || delta === Tag.Two;
	}
	private parents(neighbor: ReadonlyArray<Processor>): Array<Processor> {
		return neighbor.filter(this.isParentOf.bind(this));
	}
	private isParentOf(neighbor: Processor): boolean {
		const delta = neighbor.deltaTag(this);
		return delta === Tag.Three || delta === Tag.Four;
	}

	public parent(neighbors: ReadonlyArray<Processor>): Processor | null {
		const parents = this.parents(neighbors);
		return parents.length === 1 ? parents[0] : null;
	}

	private isChild(neighbors: ReadonlyArray<Processor>): boolean {
		return this.parent(neighbors) != null;
	}

	private isFinished(neighbors: ReadonlyArray<Processor>): boolean {
		if (this.leader) {
			return true;
		}
		else {
			const parent = this.parent(neighbors);
			if (parent != null) {
				return parent.finished && this.tag === Tag.Add(Tag.Two, parent.tag);
			}
			else {
				return false;
			}
		}
	}

	private isClean(): boolean {
		return this.es === ErrorStatus.Zero &&
			this.tag === Tag.Zero &&
			!this.marked &&
			!this.leader &&
			!this.finished;
	}

	private isValid(neighbors: ReadonlyArray<Processor>): boolean {
		const parents = this.parents(neighbors);
		const parent = this.parent(neighbors);
		const children = this.children(neighbors);
		return (this.tag === Tag.Zero || this.marked) &&                        // ¬x.marked ⇒ x.tag = 0
			parents.length <= 1 &&                                              // |Parents(x)| ≤ 1
			(1 + children.length >= neighbors.length || !this.marked) &&        // x.marked ⇒ 1 + |Chldrn(x)|≥|N(x)|
			(!this.marked || neighbors.every(n => n === parent || n.marked)) && // x.marked ∧ ¬y.marked ∧ (y ∈ N(x)) ⇒ y = Parent(x)
			(this.marked || !this.leader) &&                                    // x.is_leader ⇒ x.marked
			(parents.length === 0 || !this.leader) &&                           // x.is_leader ⇒ Parents(x) = ∅
			(this.isFinished(neighbors) || !this.finished)                      // x.finished ⇒ Finished(x)
	}

	private isError(neighbors: ReadonlyArray<Processor>): boolean {
		return (!this.isValid(neighbors) && this.es === ErrorStatus.Zero && neighbors.every(n => n.es === ErrorStatus.Zero)) ||
			(!this.isClean() && (this.es === ErrorStatus.One || (this.es === ErrorStatus.Two && neighbors.every(n => n.es === ErrorStatus.Two))));
	}

	private canReset(neighbors: ReadonlyArray<Processor>): boolean {
		return this.isError(neighbors) || neighbors.some(n => n.es === ErrorStatus.One);
	}

	private canIncES(neighbor: ReadonlyArray<Processor>): boolean {
		return (this.es === ErrorStatus.One || this.es === ErrorStatus.Two) &&
			neighbor.every(n => {
				const d = modSub(n.es, this.es, 5);
				return d === ErrorStatus.Zero || d === ErrorStatus.One;
			});
	}

	private canMark(neighbors: ReadonlyArray<Processor>): boolean {
		const children = this.children(neighbors);
		return !this.marked &&
			children.every(c => c.tag === Tag.Two) &&
			!this.isChild(neighbors) &&
			1 + children.length >= neighbors.length;
	}

	private canIncTag(neighbors: ReadonlyArray<Processor>): boolean {
		return this.marked &&
			this.children(neighbors).every(c => c.tag === Tag.Add(Tag.Two, this.tag)) &&
			this.isChild(neighbors) &&
			this.tag === Tag.Add(Tag.One, this.parent(neighbors).tag);
	}

	private canElectMyselfLeader(neighbors: ReadonlyArray<Processor>): boolean {
		return this.marked &&
			neighbors.every(n => n.marked) &&
			!this.isChild(neighbors) &&
			!this.leader;
	}

	private canAnnounceElection(neighbors: ReadonlyArray<Processor>): boolean {
		return this.isFinished(neighbors) && !this.finished;
	}

	private isClear(neighbors: ReadonlyArray<Processor>): boolean {
		return this.isValid(neighbors) && this.es === ErrorStatus.Zero && neighbors.every(n => n.es === ErrorStatus.Zero);
	}

	private isSoleLeader(neighbors: ReadonlyArray<Processor>): boolean {
		return this.leader && neighbors.every(n => !n.leader);
	}

	private isCoLeader(neighbors: ReadonlyArray<Processor>): boolean {
		return this.leader && neighbors.some(n => n.leader);
	}

	private coLeader(neighbors: ReadonlyArray<Processor>): Processor | null {
		if (this.isCoLeader(neighbors)) {
			return neighbors.find(n => n.leader);
		}
		else {
			return null;
		}
	}

	public equals(other: Processor): boolean {
		return this.es === other.es &&
			this.marked === other.marked &&
			this.tag === other.tag &&
			this.leader === other.leader &&
			this.finished === other.finished;
	}
}

window["Processor"] = Processor;

enum ErrorStatus {
	Zero = 0,
	One = 1,
	Two = 2,
}
module ErrorStatus {
	export const Count: number = 3;

	export function Random(): ErrorStatus {
		return modRandom(Count);
	}

	export function Add(x: ErrorStatus, y: ErrorStatus): ErrorStatus {
		return modAdd(x, y, Count);
	}
}

enum Tag {
	Zero = 0,
	One = 1,
	Two = 2,
	Three = 3,
	Four = 4,
}
module Tag {
	export const Count: number = 5;

	export function Random(): Tag {
		return modRandom(Count);
	}

	export function Add(x: Tag, y: Tag): Tag {
		return modAdd(x, y, Count);
	}

	export function Sub(x: Tag, y: Tag): Tag {
		return modSub(x, y, Count);
	}
}

function modRandom<T extends number>(domain: number): T {
	return Math.floor(Math.random() * domain) as T;
}

function modAdd<T extends number>(x: T, y: T, domain: number): T {
	return ((x + y) % domain) as T;
}

function modSub<T extends number>(x: T, y: T, domain: number): T {
	return ((x - y + domain) % domain) as T;
}
