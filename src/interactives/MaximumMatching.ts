import { opacity, themeColor } from "../utils/colors";
import { sleep, waitForClick } from "../utils/promise";
import { CanvasBased } from "./CanvasBased";
import { layout } from "../utils/graphLayout";

export class MaximumMatching extends CanvasBased {
	public count: number = 6;
	public delay: (signal: AbortSignal) => Promise<void>;
	public drawTime: number = 1000;

	public processorRadius: number = 25;
	public edgeLength: number = 100;
	public maxNeighbors: number = 3;
	public normalDistance: number = 0.2;
	public arrowLength: number = 15;
	public arrowWidth: number = 1.5;

	public static MatchedColor: string = "#bada55";
	public static WaitingColor: string = "#d9c755";
	public static FreeColor: string = "#a655d9";
	public static SingleColor: string = "#d95555";
	public static ChainingColor: string = "#5559d9";

	private round: number = 0;
	private layout: Layout;
	private edges: ReadonlyMap<number, ReadonlySet<number>>;
	private previous: ReadonlyMap<number, Processor>;
	private processors: ReadonlyMap<number, Processor>;

	private abortController: AbortController;
	public onIterationComplete: (isSafe: boolean, round: number) => void;
	public onProgress: (percent: number) => void;

	public get isSafe(): boolean {
		if (this.processors?.size > 0) {
			for (const id of this.processors.keys()) {
				const color = this.colorOf(this.edges, this.processors, id);
				if (color !== MaximumMatching.MatchedColor && color !== MaximumMatching.SingleColor) {
					return false;
				}
			}
		}
		return true;
	}

	public constructor(canvas: HTMLCanvasElement) {
		super(canvas);

		this.delay = s => waitForClick(this.canvas, s);

		this.start();
	}

	private start(): void {
		this.abortController = new AbortController();
		this.round = 0;

		(async () => {
			await this.init(this.abortController.signal);
			if (!this.abortController.signal.aborted) {
				this.program(this.abortController.signal);
			}
		})();
	}
	private stop(): void {
		this.abortController?.abort();
	}
	public reset(): void {
		this.stop();
		this.abortController = new AbortController();
		this.round = 0;
		this.previous = new Map<number, Processor>();
		this.processors = new Map<number, Processor>([...this.processors.values()].map(p => [p.id, new Processor(p.id, null)]));
		this.program(this.abortController.signal);
	}
	public restart(): void {
		this.stop();
		this.start();
	}

	private async init(signal: AbortSignal): Promise<void> {
		this.previous = new Map<number, Processor>();
		[this.edges, this.processors] = this.createProcessors(this.count);
		this.layout = null;
		this.clear();
		this.layout = await this.graphLayout(this.edges, this.processors, signal);
	}
	private async program(signal: AbortSignal): Promise<void> {
		this.drawProcessors(this.layout, this.edges, this.previous, this.processors, new Set<number>(this.processors.keys()));
		this.onIterationComplete?.(this.isSafe, this.round);

		while (!signal.aborted && !this.isSafe) {
			await this.delay(signal);
			if (!signal.aborted) {
				this.previous = this.processors;
				this.processors = this.stepProcessors(this.edges, this.processors);
				await this.allDrawProcessors(this.layout, this.edges, this.previous, this.processors, this.drawTime, signal);
				if (!signal.aborted) {
					this.onIterationComplete?.(this.isSafe, ++this.round);
				}
			}
		}
	}

	private createProcessors(count: number): [Map<number, ReadonlySet<number>>, Map<number, Processor>] {
		const edges = new Map<number, Set<number>>();
		const map = new Map<number, Processor>();
		for (let id = 0; id < count; id++) {
			map.set(id, new Processor(id, null));
			edges.set(id, new Set<number>());
		}

		for (const [from, _] of map) {
			const possibleNeighbors = new Array<number>();
			for (const [to, _] of map) {
				if (from !== to && edges.get(to).size < this.maxNeighbors) {
					possibleNeighbors.push(to);
				}
			}
			while (possibleNeighbors.length > 0 && edges.get(from).size < this.maxNeighbors) {
				const index = Math.floor(Math.random() * possibleNeighbors.length);
				const to = possibleNeighbors[index];
				possibleNeighbors.splice(index, 1);
				edges.get(from).add(to);
				edges.get(to).add(from);
			}
		}

		return [edges, map];
	}
	private stepProcessors(edges: ReadonlyMap<number, ReadonlySet<number>>, processors: ReadonlyMap<number, Processor>): Map<number, Processor> {
		const map = new Map<number, Processor>();
		for (const [id, processor] of processors) {
			const neighbors = new Map<number, Processor>();
			for (const nId of edges.get(id)) {
				neighbors.set(nId, processors.get(nId));
			}
			map.set(id, processor.step(neighbors));
		}
		return map;
	}

	private async allDrawProcessors(layout: Layout, edges: ReadonlyMap<number, ReadonlySet<number>>, previous: ReadonlyMap<number, Processor>, processors: ReadonlyMap<number, Processor>, time: number, signal: AbortSignal): Promise<void> {
		const ids = new Array<number>(...processors.keys());
		ids.sort((a, b) => a - b);
		const updated = new Set<number>();
		for (let i = 0; i < ids.length; i++) {
			updated.add(ids[i]);
			this.drawProcessors(layout, edges, previous, processors, updated);
			if (!previous.get(ids[i]).equals(processors.get(ids[i]))) {
				await sleep(time / processors.size, signal);
				if (signal.aborted) {
					return;
				}
			}
		}
	}

	private async graphLayout(edges: ReadonlyMap<number, ReadonlySet<number>>, processors: ReadonlyMap<number, Processor>, signal: AbortSignal): Promise<Layout> {
		const map = await layout(new Set<number>(processors.keys()), edges, signal, p => this.onProgress?.(p));
		if (signal.aborted) {
			return null;
		}

		for (const id of map.keys()) {
			const pos = map.get(id);
			map.set(id, {
				x: pos.x * (this.processorRadius * 2 + this.edgeLength),
				y: pos.y * (this.processorRadius * 2 + this.edgeLength),
			});
		}

		return {
			node: id => map.get(id),
			edge: (from, to) => new Array<Pos>(),
			offset: canvasSize => {
				let min = { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY };
				let max = { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY };
				for (const { x, y } of map.values()) {
					min.x = Math.min(min.x, x);
					min.y = Math.min(min.y, y);
					max.x = Math.max(max.x, x);
					max.y = Math.max(max.y, y);
				}
				const size = { width: max.x - min.x, height: max.y - min.y };
				return {
					x: (canvasSize.x - size.width) / 2,
					y: (canvasSize.y - size.height) / 2,
				};
			},
		}
	}

	private drawProcessors(layout: Layout, edges: ReadonlyMap<number, ReadonlySet<number>>, previous: ReadonlyMap<number, Processor>, processors: ReadonlyMap<number, Processor>, updated: ReadonlySet<number>): void {
		this.clear();

		const offset = layout.offset({ x: this.canvas.width, y: this.canvas.height });
		this.ctx.save();
		this.ctx.translate(offset.x, offset.y);

		for (const [a, bs] of edges) {
			const aProcessor = (updated.has(a) ? processors : previous).get(a);
			for (const b of bs) {
				const from = Math.min(a, b);
				const to = Math.max(a, b);
				this.drawConnection(layout.edge(from, to), layout.node(from), layout.node(to));
				if (aProcessor.connection === b) {
					this.drawEdge(layout.node(a), layout.node(b));
				}
			}
		}

		for (const id of processors.keys()) {
			const color = this.colorOf(edges, updated.has(id) ? processors : previous, id);
			this.drawProcessor(layout.node(id), color);
		}

		this.ctx.restore();
	}

	private drawConnection(points: ReadonlyArray<Pos>, from: Pos, to: Pos): void {
		this.ctx.beginPath();
		this.ctx.strokeStyle = opacity(themeColor("--color"), 0.5);
		this.ctx.lineWidth = 1.5;
		this.ctx.lineJoin = "round";
		this.ctx.setLineDash([10, 10]);

		this.ctx.moveTo(from.x, from.y);
		for (const point of points) {
			this.ctx.lineTo(point.x, point.y);
		}
		this.ctx.lineTo(to.x, to.y);
		this.ctx.stroke();
	}
	private drawEdge(from: Pos, to: Pos): void {
		this.ctx.strokeStyle = this.ctx.fillStyle = themeColor("--color");
		this.ctx.lineWidth = 2;
		this.ctx.lineJoin = "round";
		this.ctx.setLineDash([]);

		const diff = { x: to.x - from.x, y: to.y - from.y };
		const distance = Math.sqrt(Math.pow(diff.x, 2) + Math.pow(diff.y, 2));
		const normal = { x: diff.y * this.normalDistance, y: -diff.x * this.normalDistance };
		const halfWay = { x: diff.x / 2 + from.x, y: diff.y / 2 + from.y };
		const midPoint = { x: halfWay.x + normal.x, y: halfWay.y + normal.y };

		const fromEdge = pullBack(midPoint, from, this.processorRadius);
		const toEdge = pullBack(midPoint, to, this.processorRadius);

		this.ctx.beginPath();
		this.ctx.moveTo(fromEdge.x, fromEdge.y);
		this.ctx.arcTo(midPoint.x, midPoint.y, toEdge.x, toEdge.y, distance * 0.75);
		this.ctx.lineTo(toEdge.x, toEdge.y);
		this.ctx.stroke();

		const rightArrowPoint = withLength({ x: midPoint.x - normal.x * this.arrowWidth - toEdge.x, y: midPoint.y - normal.y * this.arrowWidth - toEdge.y }, this.arrowLength);
		const leftArrowPoint = withLength({ x: midPoint.x + normal.x * this.arrowWidth - toEdge.x, y: midPoint.y + normal.y * this.arrowWidth - toEdge.y }, this.arrowLength);
		this.ctx.beginPath();
		this.ctx.moveTo(rightArrowPoint.x + toEdge.x, rightArrowPoint.y + toEdge.y);
		this.ctx.lineTo(toEdge.x, toEdge.y);
		this.ctx.lineTo(leftArrowPoint.x + toEdge.x, leftArrowPoint.y + toEdge.y);
		this.ctx.closePath();
		this.ctx.fill();

		function pullBack(from: Pos, to: Pos, backOff: number): Pos {
			const diff = { x: to.x - from.x, y: to.y - from.y };
			const distance = Math.sqrt(Math.pow(diff.x, 2) + Math.pow(diff.y, 2));
			const targetDiff = withLength(diff, distance - backOff);
			return { x: from.x + targetDiff.x, y: from.y + targetDiff.y };
		}

		function withLength(vec: Pos, length: number): Pos {
			const l = Math.sqrt(Math.pow(vec.x, 2) + Math.pow(vec.y, 2));
			return { x: vec.x / l * length, y: vec.y / l * length };
		}
	}
	private drawProcessor(pos: Pos, color: string): void {
		this.ctx.beginPath();
		this.ctx.fillStyle = color;
		this.ctx.ellipse(pos.x, pos.y, this.processorRadius, this.processorRadius, 0, 0, Math.PI * 2);
		this.ctx.fill();
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

	protected reDraw(): void {
		if (this.layout != null) {
			this.drawProcessors(this.layout, this.edges, new Map<number, Processor>(), this.processors, new Set<number>(this.processors.keys()));
		}
	}

	public dispose(): void {
		super.dispose();
		this.stop();
	}
}

interface Pos {
	x: number;
	y: number;
}

interface Layout {
	node(id: number): Pos;
	edge(a: number, b: number): ReadonlyArray<Pos>;
	offset(canvasSize: Pos): Pos;
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
