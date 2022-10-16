import { Vec } from "../utils/Vec";
import { opacity, themeColor } from "../utils/colors";
import { CanvasBased } from "./CanvasBased";

export abstract class GraphBased extends CanvasBased {
	protected static pullBack(from: Vec, to: Vec, backOff: number): Vec {
		const diff = to.sub(from);
		return from.add(diff.withLength(diff.length - backOff));
	}

	protected nodeRadius: number = 25;
	protected labelSize: number = 0.75;
	protected edgeLabelSize: number = 0.75;
	protected edgeLabelNearDistance: number = 25;
	protected normalDistance: number = 0.2;
	protected arrowLength: number = 15;
	protected arrowWidth: number = 10;

	protected layout: Layout;

	public constructor(canvas: HTMLCanvasElement) {
		super(canvas);
	}

	protected graphLayout(map: ReadonlyMap<number, Vec>): Layout {
		let min = new Vec(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
		let max = new Vec(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
		const margin = new Vec(this.nodeRadius * 2, this.nodeRadius * 2);
		for (const pos of map.values()) {
			min = min.withMinParts(pos.sub(margin));
			max = max.withMaxParts(pos.add(margin));
		}
		const size = max.sub(min);

		return {
			node: id => map.get(id),
			scale: canvasSize => {
				const horizontalOverflow = size.x - canvasSize.x;
				const verticalOverflow = size.y - canvasSize.y;
				if (horizontalOverflow > verticalOverflow) {
					if (horizontalOverflow > 0) {
						return canvasSize.x / size.x;
					}
				} else {
					if (verticalOverflow > 0) {
						return canvasSize.y / size.y;
					}
				}

				return 1;
			},
			offset: canvasSize => {
				return canvasSize.sub(size).scale(0.5).sub(min);
			},
		};
	}
	protected abstract makeLayout(edges: ReadonlyMap<number, ReadonlySet<number>>): Map<number, Vec>;

	protected drawConnection(from: Vec, to: Vec): void {
		this.ctx.strokeStyle = opacity(themeColor("--color"), 0.5);
		this.ctx.lineWidth = 1.5;
		this.ctx.lineJoin = "round";
		this.ctx.setLineDash([10, 10]);

		const fromEdge = GraphBased.pullBack(to, from, this.nodeRadius);
		const toEdge = GraphBased.pullBack(from, to, this.nodeRadius);

		this.ctx.beginPath();
		this.ctx.moveTo(fromEdge.x, fromEdge.y);
		this.ctx.lineTo(toEdge.x, toEdge.y);
		this.ctx.stroke();
	}

	protected drawEdge(from: Vec, to: Vec): void {
		this.ctx.strokeStyle = this.ctx.fillStyle = themeColor("--color");
		this.ctx.lineWidth = 2;
		this.ctx.lineJoin = "round";
		this.ctx.setLineDash([]);

		const diff = to.sub(from);
		const distance = diff.length;
		const normal = new Vec(diff.y * this.normalDistance, -diff.x * this.normalDistance);
		const halfWay = diff.scale(0.5).add(from);
		const midPoint = halfWay.add(normal);

		const fromEdge = GraphBased.pullBack(midPoint, from, this.nodeRadius);
		const toEdge = GraphBased.pullBack(midPoint, to, this.nodeRadius);

		this.ctx.beginPath();
		this.ctx.moveTo(fromEdge.x, fromEdge.y);
		this.ctx.arcTo(midPoint.x, midPoint.y, toEdge.x, toEdge.y, distance * 0.75);
		this.ctx.lineTo(toEdge.x, toEdge.y);
		this.ctx.stroke();

		const midPointDiff = toEdge.sub(midPoint);
		const arrowNormal = new Vec(midPointDiff.y, -midPointDiff.x).withLength(this.arrowWidth);
		const rightArrowPoint = toEdge.sub(arrowNormal).sub(midPointDiff.withLength(this.arrowLength));
		const leftArrowPoint = toEdge.add(arrowNormal).sub(midPointDiff.withLength(this.arrowLength));
		this.ctx.beginPath();
		this.ctx.moveTo(rightArrowPoint.x, rightArrowPoint.y);
		this.ctx.lineTo(toEdge.x, toEdge.y);
		this.ctx.lineTo(leftArrowPoint.x, leftArrowPoint.y);
		this.ctx.closePath();
		this.ctx.fill();
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
		this.ctx.font = `${this.nodeRadius * this.labelSize}px monospace`;
		this.ctx.fillStyle = themeColor("--color");
		this.ctx.fillText(label, pos.x, pos.y);
	}

	protected drawEdgeLabel(from: Vec, to: Vec, label: string): void {
		const center = to.sub(from).scale(0.5).add(from);
		this.ctx.textAlign = "center";
		this.ctx.textBaseline = "middle";
		this.ctx.font = `${this.nodeRadius * this.edgeLabelSize}px monospace`;
		this.ctx.fillStyle = themeColor("--color");
		this.ctx.fillText(label, center.x, center.y);
	}

	protected drawEdgeLabelNear(from: Vec, to: Vec, label: string, color?: string): void {
		const diff = to.sub(from);
		const center = diff.scale((this.edgeLabelNearDistance + this.nodeRadius) / diff.length).add(from);
		this.ctx.textAlign = "center";
		this.ctx.textBaseline = "middle";
		this.ctx.font = `${this.nodeRadius * this.edgeLabelSize}px monospace`;
		this.ctx.fillStyle = color ?? themeColor("--color");
		this.ctx.fillText(label, center.x, center.y);
	}
}

export interface Layout {
	node(id: number): Vec;
	scale(canvasSize: Vec): number;
	offset(canvasSize: Vec): Vec;
}
