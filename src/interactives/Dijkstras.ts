import { IEquatable, ProgramBased } from "./ProgramBased";
import { Vec } from "../utils/Vec";
import { randomColor, themeColor } from "../utils/colors";

export interface DijkstrasIteration {
	round: number;
	isSafe: boolean;
}

export class Dijkstras extends ProgramBased<Processor, DijkstrasIteration> {
	public static DefaultCount: number = 8;

	private static CircleRadius: number = 0.25;

	public count: number = Dijkstras.DefaultCount;

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
		nodes.set(0, new Master(Math.floor(Math.random() * (this.count + 1)), this.count));
		for (let id = 1; id < this.count; id++) {
			edges.set(id, new Set<number>([(id + 1) % this.count]));
			nodes.set(id, new Slave(Math.floor(Math.random() * (this.count + 1))));
		}

		return [edges, nodes];
	}

	protected override stepIteration(): DijkstrasIteration {
		return {
			round: this.round++,
			isSafe: this.isSafe(),
		};
	}

	private isSafe(): boolean {
		if (this.nodes.size > 0) {
			let indexCount = 0;
			let currentIndex = this.nodes.get(0).index;
			for (let id = 1; id < this.nodes.size; id++) {
				const processor = this.nodes.get(id);
				if (processor.index !== currentIndex) {
					indexCount++;
					currentIndex = processor.index;
					if (indexCount >= 2) {
						return false;
					}
				}
			}
		}
		return true;
	}

	protected override stepNodes(): ReadonlyMap<number, Processor> {
		const nextNodes = new Map<number, Processor>();
		nextNodes.set(0, this.nodes.get(0).step(this.nodes.get(this.count - 1).index));
		for (let id = 1; id < this.count; id++) {
			nextNodes.set(id, this.nodes.get(id).step(this.nodes.get(id - 1).index));
		}
		return nextNodes;
	}

	protected override makeLayout(edges: ReadonlyMap<number, ReadonlySet<number>>): Map<number, Vec> {
		const layout = new Map<number, Vec>();

		const radius = Math.min(this.canvas.width, this.canvas.height) * Dijkstras.CircleRadius;
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
			const node = (updatedNodeIds.has(id) ? this.nodes : previousNodes).get(id);
			const pos = this.layout.node(id);
			this.drawNode(pos, randomColor(node.index, this.count + 1));
			this.drawNodeLabel(pos, node.index.toString());
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

abstract class Processor implements IEquatable<Processor> {
	public constructor(public readonly index: number) { }

	public abstract step(previousIndex: number): Processor;

	public abstract equals(other: Processor): boolean;
}

class Master extends Processor {
	public constructor(index: number, private readonly peerCount: number) {
		super(index);
	}

	public override step(previousIndex: number): Processor {
		let index = this.index;
		while (previousIndex === index) {
			index = (index + 1) % (this.peerCount + 1);
		}
		return new Master(index, this.peerCount);
	}

	public override equals(other: Processor): boolean {
		return other instanceof Master &&
			this.index === other.index &&
			this.peerCount === other.peerCount;
	}
}

class Slave extends Processor {
	public override step(previousIndex: number): Processor {
		return new Slave(previousIndex);
	}

	public override equals(other: Processor): boolean {
		return other instanceof Slave &&
			this.index === other.index;
	}
}
