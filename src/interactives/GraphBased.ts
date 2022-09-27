import { opacity, themeColor } from "../utils/colors";
import { CanvasBased } from "./CanvasBased";

export abstract class GraphBased extends CanvasBased {
	protected nodeRadius: number = 25;
	protected normalDistance: number = 0.2;
	protected arrowLength: number = 15;
	protected arrowWidth: number = 1.5;

	protected layout: Layout;

	public onProgress?: (percent: number) => void;

	public constructor(canvas: HTMLCanvasElement) {
		super(canvas);
	}

	protected async graphLayout(edges: ReadonlyMap<number, ReadonlySet<number>>, signal: AbortSignal): Promise<Layout> {
		const map = await this.makeLayout(edges, signal);
		if (signal.aborted) {
			return null;
		}

		return {
			node: id => map.get(id),
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
					x: (canvasSize.x - size.width) / 2 - min.x,
					y: (canvasSize.y - size.height) / 2 - min.y,
				};
			},
		}
	}
	protected abstract makeLayout(edges: ReadonlyMap<number, ReadonlySet<number>>, signal: AbortSignal): Promise<Map<number, Vec>>;

	protected drawConnection(from: Vec, to: Vec): void {
		this.ctx.strokeStyle = opacity(themeColor("--color"), 0.5);
		this.ctx.lineWidth = 1.5;
		this.ctx.lineJoin = "round";
		this.ctx.setLineDash([10, 10]);

		this.ctx.beginPath();
		this.ctx.moveTo(from.x, from.y);
		this.ctx.lineTo(to.x, to.y);
		this.ctx.stroke();
	}

	protected drawEdge(from: Vec, to: Vec): void {
		this.ctx.strokeStyle = this.ctx.fillStyle = themeColor("--color");
		this.ctx.lineWidth = 2;
		this.ctx.lineJoin = "round";
		this.ctx.setLineDash([]);

		const diff = { x: to.x - from.x, y: to.y - from.y };
		const distance = Math.sqrt(Math.pow(diff.x, 2) + Math.pow(diff.y, 2));
		const normal = { x: diff.y * this.normalDistance, y: -diff.x * this.normalDistance };
		const halfWay = { x: diff.x / 2 + from.x, y: diff.y / 2 + from.y };
		const midPoint = { x: halfWay.x + normal.x, y: halfWay.y + normal.y };

		const fromEdge = pullBack(midPoint, from, this.nodeRadius);
		const toEdge = pullBack(midPoint, to, this.nodeRadius);

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

		function pullBack(from: Vec, to: Vec, backOff: number): Vec {
			const diff = { x: to.x - from.x, y: to.y - from.y };
			const distance = Math.sqrt(Math.pow(diff.x, 2) + Math.pow(diff.y, 2));
			const targetDiff = withLength(diff, distance - backOff);
			return { x: from.x + targetDiff.x, y: from.y + targetDiff.y };
		}

		function withLength(vec: Vec, length: number): Vec {
			const l = Math.sqrt(Math.pow(vec.x, 2) + Math.pow(vec.y, 2));
			return { x: vec.x / l * length, y: vec.y / l * length };
		}
	}

	protected drawNode(pos: Vec, color: string): void {
		this.ctx.beginPath();
		this.ctx.fillStyle = color;
		this.ctx.ellipse(pos.x, pos.y, this.nodeRadius, this.nodeRadius, 0, 0, Math.PI * 2);
		this.ctx.fill();
	}

	protected drawNodeLabel(pos: Vec, label: string): void {
		this.ctx.textAlign = "center";
		this.ctx.textBaseline = "middle";
		this.ctx.font = `${this.nodeRadius * 0.75}px monospace`;
		this.ctx.fillStyle = themeColor("--color");
		this.ctx.fillText(label, pos.x, pos.y);
	}
}

export interface Vec {
	x: number;
	y: number;
}

export interface Layout {
	node(id: number): Vec;
	offset(canvasSize: Vec): Vec;
}
