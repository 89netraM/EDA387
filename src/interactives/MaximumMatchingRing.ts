import { themeColor } from "../utils/colors";
import { Vec } from "../utils/Vec";
import { MaximumMatching } from "./MaximumMatching";
import { ProgramBased } from "./ProgramBased";

export interface MaximumMatchingRingIteration {
	round: number;
	isSafe: boolean;
	vfValues: VfValues;
}

export interface VfValues {
	m: number;
	s: number;
	w: number;
	f: number;
	c: number;
}

export class MaximumMatchingRing extends ProgramBased<Processor, MaximumMatchingRingIteration> {
	public static DefaultCount: number = 8;

	private static CircleRadius: number = 0.25;

	public count: number = MaximumMatchingRing.DefaultCount;

	private round: number = 0;

	public constructor(canvas: HTMLCanvasElement) {
		super(canvas);

		this.start();
	}

	protected override init(): [ReadonlyMap<number, ReadonlySet<number>>, ReadonlyMap<number, Processor>] {
		this.round = 0;

		const edges = new Map<number, ReadonlySet<number>>();
		const nodes = new Map<number, Processor>();
		edges.set(0, new Set<number>([1]));
		nodes.set(0, new Master(randomConnection(), randomState()));
		for (let id = 1; id < this.count; id++) {
			edges.set(id, new Set<number>([(id + 1) % this.count]));
			nodes.set(id, new Slave(randomConnection(), randomState()));
		}
		return [edges, nodes];

		function randomConnection(): Connection {
			return Math.floor(Math.random() * 3 - 1);
		}
		function randomState(): boolean {
			return Math.random() < 0.5;
		}
	}

	protected override stepIteration(): MaximumMatchingRingIteration {
		return {
			round: this.round++,
			isSafe: this.isSafe(),
			vfValues: this.vfValues(),
		};
	}

	protected override shouldContinue(): boolean {
		return !this.isSafe();
	}

	private isSafe(): boolean {
		if (this.nodes?.size > 0) {
			for (const id of this.nodes.keys()) {
				const color = this.colorOf(this.nodes, id);
				if (color !== MaximumMatching.MatchedColor && (id !== 0 || color !== MaximumMatching.SingleColor)) {
					return false;
				}
			}
		}
		return true;
	}

	private vfValues(): VfValues {
		const vfValues = { m: 0, s: 0, w: 0, f: 0, c: 0 };
		for (const id of this.nodes.keys()) {
			switch (this.colorOf(this.nodes, id)) {
				case MaximumMatching.MatchedColor:
					vfValues.m++;
					break;
				case MaximumMatching.WaitingColor:
					vfValues.w++;
					break;
				case MaximumMatching.FreeColor:
					vfValues.f++;
					break;
				case MaximumMatching.SingleColor:
					vfValues.s++;
					break;
				case MaximumMatching.ChainingColor:
					vfValues.c++;
					break;
			}
		}
		return vfValues;
	}

	protected override stepNodes(): ReadonlyMap<number, Processor> {
		const nextNodes = new Map<number, Processor>();
		nextNodes.set(0, this.nodes.get(0).step(this.nodes.get(this.count - 1).state));
		for (let id = 1; id < this.count; id++) {
			nextNodes.set(id, this.nodes.get(id).step(this.nodes.get(id - 1).state));
		}
		return nextNodes;
	}

	protected override makeLayout(edges: ReadonlyMap<number, ReadonlySet<number>>): Map<number, Vec> {
		const layout = new Map<number, Vec>();

		const radius = Math.min(this.canvas.width, this.canvas.height) * MaximumMatchingRing.CircleRadius;
		const radiusVec = new Vec(radius, radius);
		for (let id = 0; id < this.count; id++) {
			const angle = Math.PI * 2 * (id / this.count) - Math.PI / 2;
			const pos = radiusVec.rotate(angle);
			layout.set(id, pos);
		}

		return layout;
	}

	protected override drawNodes(previousNodes: ReadonlyMap<number, Processor>, updatedNodeIds: ReadonlySet<number>): void {
		for (const id of this.nodes.keys()) {
			const sourceNodes = updatedNodeIds.has(id) ? this.nodes : previousNodes;
			const node = sourceNodes.get(id);
			const pos = this.layout.node(id);

			if (node.connection !== Connection.None) {
				const targetPos = this.layout.node((this.count + id + node.connection) % this.count);
				this.drawEdge(pos, targetPos);
			}

			this.drawNode(pos, this.colorOf(sourceNodes, id));
			this.drawNodeLabel(pos, node.state ? "1" : "0");
		}
	}

	private colorOf(nodes: ReadonlyMap<number, Processor>, id: number): string {
		switch (nodes.get(id).connection) {
			case Connection.Backward:
				switch (nodes.get((id - 1 + this.count) % this.count).connection) {
					case Connection.Backward:
						return MaximumMatching.ChainingColor;
					case Connection.None:
						return MaximumMatching.WaitingColor;
					case Connection.Forward:
						return MaximumMatching.MatchedColor;
				}
			case Connection.None:
				if (nodes.get((id - 1 + this.count) % this.count).connection == Connection.None ||
					nodes.get((id + 1 + this.count) % this.count).connection == Connection.None) {
					return MaximumMatching.FreeColor;
				}
				else {
					return MaximumMatching.SingleColor;
				}
			case Connection.Forward:
				switch (nodes.get((id + 1 + this.count) % this.count).connection) {
					case Connection.Backward:
						return MaximumMatching.MatchedColor;
					case Connection.None:
						return MaximumMatching.WaitingColor;
					case Connection.Forward:
						return MaximumMatching.ChainingColor;
				}
		}
	}

	protected override clear(): void {
		super.clear();

		const pos = this.layout.node(0);
		const offset = this.layout.offset(new Vec(this.canvas.width, this.canvas.height));

		this.ctx.textAlign = "center";
		this.ctx.textBaseline = "bottom";
		this.ctx.font = `${this.nodeRadius * 2}px sans-serif`;
		this.ctx.fillStyle = themeColor("--color");
		this.ctx.fillText("👑", offset.x + pos.x, offset.y + pos.y - this.nodeRadius);
	}
}

enum Connection {
	Backward = -1,
	None = 0,
	Forward = 1,
}

abstract class Processor {
	public constructor(
		public readonly connection: Connection,
		public readonly state: boolean
	) { }

	public abstract step(predecessorState: boolean): Processor;

	public equals(other: Processor): boolean {
		return this.connection === other.connection &&
			this.state === other.state;
	}
}

class Master extends Processor {
	public step(predecessorState: boolean): Processor {
		return new Master(
			predecessorState
				? Connection.Backward
				: Connection.None,
			false);
	}
}

class Slave extends Processor {
	public step(predecessorState: boolean): Processor {
		return new Slave(
			predecessorState
				? Connection.Backward
				: Connection.Forward,
			!predecessorState);
	}
}
