import { layout } from "../utils/graphLayout";
import { Vec } from "../utils/Vec";
import { IEquatable, ProgramBased } from "./ProgramBased";

export interface NappingIteration {
}

export class Napping extends ProgramBased<Processor, NappingIteration> {
	public static EqualColor: string = "#bada55";
	public static BehindColor: string = "#d95555";

	public static DefaultCount: number = 4;
	public static MaxNeighbors: number = 3;

	private static EdgeLength: number = 200;
	protected override edgeLabelSize: number = 1;

	public count: number = Napping.DefaultCount;

	private hoveringId: number | null = null;
	private napping: Set<number> = new Set<number>();

	public constructor(canvas: HTMLCanvasElement) {
		super(canvas);

		this.onMouseClickCanvas = this.onMouseClickCanvas.bind(this);
		this.canvas.addEventListener("click", this.onMouseClickCanvas, true);

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

		this.nodes = new Map<number, Processor>([...this.nodes].map(([id, p]) => [id, new Processor(id, new Map<number, Hand>([...p.games].map(([o, ]) => [o, Hand.Rock])))]));
		if (this.abortController.signal.aborted) {
			return
		}

		this.program(this.abortController.signal);
	}

	protected override init(): [ReadonlyMap<number, ReadonlySet<number>>, ReadonlyMap<number, Processor>] {
		const edges = new Map<number, Set<number>>();
		for (let id = 0; id < this.count; id++) {
			edges.set(id, new Set<number>());
		}
		for (let from = 0; from < this.count; from++) {
			const possibleNeighbors = new Array<number>();
			for (let to = 0; to < this.count; to++) {
				if (from !== to && edges.get(to).size < Napping.MaxNeighbors) {
					possibleNeighbors.push(to);
				}
			}
			while (possibleNeighbors.length > 0 && edges.get(from).size < Napping.MaxNeighbors) {
				const index = Math.floor(Math.random() * possibleNeighbors.length);
				const to = possibleNeighbors[index];
				possibleNeighbors.splice(index, 1);
				edges.get(from).add(to);
				edges.get(to).add(from);
			}
		}

		const nodes = new Map<number, Processor>();
		for (let id = 0; id < this.count; id++) {
			nodes.set(id, new Processor(id, new Map<number, Hand>([...edges.get(id)].map(o => [o, Hand.Rock]))));
		}

		return [edges, nodes];
	}

	protected override stepIteration(): NappingIteration {
		return {
		};
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
			map.set(id, this.napping.has(id) ? processor : processor.step(neighbors.get(id)));
		}

		return map;
	}

	protected override makeLayout(edges: ReadonlyMap<number, ReadonlySet<number>>): Map<number, Vec> {
		const layoutMap = layout(new Set<number>(edges.keys()), edges);
		return new Map<number, Vec>([...layoutMap].map(([id, pos]) => [id, pos.scale(this.nodeRadius * 2 + Napping.EdgeLength)]));
	}

	protected override drawNodes(previousNodes: ReadonlyMap<number, Processor>, updatedNodeIds: ReadonlySet<number>): void {
		for (const id of this.nodes.keys()) {
			const processor = (updatedNodeIds.has(id) ? this.nodes : previousNodes).get(id);
			const pos = this.layout.node(id);

			for (const [opponent, hand] of processor.games) {
				this.drawEdgeLabelNear(pos, this.layout.node(opponent), hand.toString());
			}

			this.drawNode(pos, this.isBehind(processor) ? Napping.BehindColor : Napping.EqualColor);
			if (this.napping.has(id)) {
				this.drawNodeLabel(pos, "💤");
			}
		}
	}

	private isBehind(processor: Processor): boolean {
		for (const [id, hand] of processor.games) {
			if (hand.cmp(this.nodes.get(id).games.get(processor.id)) < 0) {
				return true;
			}
		}
		return false;
	}

	private onMouseMoveCanvas(e: MouseEvent): void {
		const hoverProcessor = this.hoverProcessor(e);
		if (this.hoveringId !== hoverProcessor?.id) {
			this.hoveringId = hoverProcessor?.id;
			this.canvas.style.cursor = this.hoveringId == null ? null : "pointer";
		}
	}

	private onMouseClickCanvas(e: MouseEvent): void {
		const hoverProcessor = this.hoverProcessor(e);
		if (hoverProcessor != null) {
			if (!this.napping.delete(hoverProcessor.id)) {
				this.napping.add(hoverProcessor.id);
			}
			this.reDraw();
			e.preventDefault();
		}
	}

	private hoverProcessor(e: MouseEvent): Processor | null {
		if (this.nodes != null && this.layout != null) {
			const canvasSize = new Vec(this.canvas.width, this.canvas.height);
			const offset = this.layout.offset(canvasSize);
			const scale = this.layout.scale(canvasSize);
			const mousePos = new Vec(e.offsetX, e.offsetY).sub(offset).scale(1 / scale);
			for (const [id, processor] of this.nodes) {
				const diff = mousePos.sub(this.layout.node(id));
				if (diff.length < this.nodeRadius) {
					return processor;
				}
			}
		}
		return null;
	}

	public override dispose(): void {
		super.dispose();
		this.canvas.removeEventListener("click", this.onMouseClickCanvas, true);
		this.canvas.removeEventListener("mousemove", this.onMouseMoveCanvas, false);
	}
}

class Processor implements IEquatable<Processor> {
	public constructor(
		public readonly id: number,
		public readonly games: ReadonlyMap<number, Hand> = new Map<number, Hand>(),
	) { }

	public step(neighbors: ReadonlyArray<Processor>): Processor {
		return new Processor(
			this.id,
			new Map<number, Hand>(neighbors.map(o => [o.id, this.chooseAgainst(o)])));
	}

	private chooseAgainst(opponent: Processor): Hand {
		const my = this.games.get(opponent.id);
		const their = opponent.games.get(this.id);
		if (their.cmp(my) < 0) {
			return my;
		} else {
			return my.beat();
		}
	}

	public equals(other: Processor): boolean {
		return this.id === other.id;
	}
}

class Hand implements IEquatable<Hand> {
	public static readonly Rock = new Hand(0);
	public static readonly Paper = new Hand(1);
	public static readonly Scissors = new Hand(2);

	private constructor(private readonly id: number) { }

	public beat(): Hand {
		return new Hand((this.id + 1) % 3);
	}

	public cmp(other: Hand): number {
		return (this.id - other.id + 4) % 3 - 1;
	}

	public equals(other: Hand): boolean {
		return this.cmp(other) === 0;
	}

	public toString(): string {
		switch (this.id) {
			case 0:
				return "✊";
			case 1:
				return "✋";
			case 2:
				return "✌";
		}
	}
}
