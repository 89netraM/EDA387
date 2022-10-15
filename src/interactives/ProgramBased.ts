import { sleep, waitForClick } from "../utils/promise";
import { Vec } from "../utils/Vec";
import { GraphBased } from "./GraphBased";

export abstract class ProgramBased<TNode extends IEquatable<TNode>, TIteration> extends GraphBased {
	public delay: (signal: AbortSignal) => Promise<void>;
	public drawTime: number = 1000;

	public onIterationComplete?: (event: TIteration) => void;

	protected abortController: AbortController;
	protected edges: ReadonlyMap<number, ReadonlySet<number>>;
	protected nodes: ReadonlyMap<number, TNode>;

	public constructor(canvas: HTMLCanvasElement) {
		super(canvas);

		this.delay = s => waitForClick(this.canvas, s);
	}

	public start(): void {
		this.abortController = new AbortController();

		[this.edges, this.nodes] = this.init();

		this.layout = this.graphLayout(this.edges);

		this.program(this.abortController.signal);
	}

	protected abstract init(): [ReadonlyMap<number, ReadonlySet<number>>, ReadonlyMap<number, TNode>];

	public stop(): void {
		this.abortController.abort();
	}

	protected async program(signal: AbortSignal): Promise<void> {
		this.drawNodesAndEdges(new Map<number, TNode>(), new Set<number>(this.nodes.keys()));
		this.onIterationComplete?.(this.stepIteration());

		while (!signal.aborted && this.shouldContinue()) {
			await this.delay(signal);
			if (!signal.aborted) {
				const previousNodes = this.nodes;
				this.nodes = this.stepNodes();
				await this.drawAllNodes(previousNodes, signal);
				if (!signal.aborted) {
					this.onIterationComplete?.(this.stepIteration());
				}
			}
		}
	}

	protected shouldContinue(): boolean {
		return true;
	}

	protected abstract stepIteration(): TIteration;

	protected abstract stepNodes(): ReadonlyMap<number, TNode>;

	protected async drawAllNodes(previousNodes: ReadonlyMap<number, TNode>, signal: AbortSignal): Promise<void> {
		const ids = new Array<number>(...this.nodes.keys());
		ids.sort((a, b) => a - b);
		const updated = new Set<number>();
		for (let i = 0; i < ids.length; i++) {
			updated.add(ids[i]);
			this.drawNodesAndEdges(previousNodes, updated);
			if (!previousNodes.get(ids[i]).equals(this.nodes.get(ids[i]))) {
				await sleep(this.drawTime / this.nodes.size, signal);
				if (signal.aborted) {
					return;
				}
			}
		}
	}

	protected drawNodesAndEdges(previousNodes: ReadonlyMap<number, TNode>, updatedNodeIds: ReadonlySet<number>): void {
		this.clear();

		const offset = this.layout.offset(new Vec(this.canvas.width, this.canvas.height));
		this.ctx.save();
		this.ctx.translate(offset.x, offset.y);

		const seenConnections = new Set<string>();
		for (const [a, bs] of this.edges) {
			for (const b of bs) {
				const connectionId = makeConnectionId(a, b);
				if (!seenConnections.has(connectionId)) {
					this.drawConnection(this.layout.node(a), this.layout.node(b));
					seenConnections.add(connectionId);
				}
			}
		}

		this.drawNodes(previousNodes, updatedNodeIds);

		this.ctx.restore();

		function makeConnectionId(a: number, b: number): string {
			return `${Math.min(a, b)}:${Math.max(a, b)}`;
		}
	}

	protected abstract drawNodes(previousNodes: ReadonlyMap<number, TNode>, updatedNodeIds: ReadonlySet<number>): void;

	protected override reDraw(): void {
		if (this.layout != null) {
			this.drawNodesAndEdges(new Map<number, TNode>(), new Set<number>(this.nodes.keys()));
		}
	}

	public override dispose(): void {
		super.dispose();
		this.stop();
	}
}

export interface IEquatable<TSelf> {
	equals(other: TSelf): boolean;
}
