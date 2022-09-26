import { permutations } from "./math";
import { immediate } from "./promise";

const yieldSteps = 2500;

export async function layout(nodes: ReadonlySet<number>, edges: ReadonlyMap<number, ReadonlySet<number>>, signal: AbortSignal, progress: (percent: number) => void): Promise<Map<number, Pos>> {
	const size = Math.ceil(Math.sqrt(nodes.size));
	const iterations = permutations(size * size, nodes.size);
	let i = 0;

	let fittest = Number.POSITIVE_INFINITY;
	let bestAngleScore = 0;
	let bestMap: Map<number, Pos>;
	for (const map of bfsForLayout(edges, new Array<number>(...nodes), makePositions(size))) {
		const { lines, nodes, angleScore } = countCrosses(edges, map);
		const fitness = lines + nodes * 100;
		if (fitness <= fittest) {
			if (fitness < fittest || angleScore > bestAngleScore) {
				fittest = fitness;
				bestAngleScore = angleScore;
				bestMap = map;
			}
		}

		if (++i % yieldSteps === 0) {
			progress(i / iterations);
			await immediate();
			if (signal.aborted) {
				return null;
			}
		}
	}

	return bestMap;
}

function makePositions(size: number): Array<ROPos> {
	const positions = new Array<ROPos>();
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			positions.push({ x, y });
		}
	}
	return positions;
}

function* bfsForLayout(edges: ReadonlyMap<number, ReadonlySet<number>>, nodes: ReadonlyArray<number>, positions: ReadonlyArray<ROPos>): Generator<Map<number, ROPos>> {
	if (nodes.length === 0) {
		yield new Map<number, ROPos>();
	}
	else {
		let node: number;
		[node, ...nodes] = nodes;
		for (const innerMap of bfsForLayout(edges, nodes, positions)) {
			for (const pos of positions) {
				if ([...innerMap.values()].every(p => p.x !== pos.x || p.y !== pos.y)) {
					const map = new Map<number, ROPos>([...innerMap, [node, pos]]);
					yield map;
				}
			}
		}
	}
}

function countCrosses(edges: ReadonlyMap<number, ReadonlySet<number>>, map: ReadonlyMap<number, ROPos>): { lines: number, nodes: number, angleScore: number } {
	const lines = new Set<string>();
	const nodes = new Set<string>();
	let angleScore = 0;

	for (const [from, tos] of edges) {
		const fromPos = map.get(from);
		for (const to of tos) {
			const toPos = map.get(to);
			for (const [from2, tos2] of edges) {
				if (from !== from2 && to !== from2) {
					const fromPos2 = map.get(from2);
					for (const to2 of tos2) {
						if (from !== to2 && to !== to2) {
							const toPos2 = map.get(to2);
							if (lineSegmentIntersection(fromPos, toPos, fromPos2, toPos2)) {
								lines.add(crossingId(from, to, from2, to2));
							}
							if (isOnSegment(fromPos2, toPos2, fromPos)) {
								nodes.add(toEdgeId(from2, to2));
							}
						}
					}
					if (isOnSegment(fromPos, toPos, fromPos2)) {
						nodes.add(toEdgeId(from, to));
						break;
					}
				}
			}

			for (const to2 of edges.get(from)) {
				const to2Pos = map.get(to2);
				if (to !== to2) {
					angleScore += angleBetween(fromPos, toPos, to2Pos);
					angleScore += angleBetween(toPos, fromPos, to2Pos);
				}
			}
		}
	}

	return { lines: lines.size, nodes: nodes.size, angleScore };

	function toEdgeId(from: number, to: number): string {
		return Math.min(from, to) + ":" + Math.max(from, to);
	}
	function crossingId(s1: number, e1: number, s2: number, e2: number): string {
		const aMin = Math.min(s1, e1);
		const aMax = Math.max(s1, e1);
		const bMin = Math.min(s2, e2);
		const bMax = Math.max(s2, e2);
		if (aMin < bMin) {
			return `${aMin}:${aMax}/${bMin}:${bMax}`;
		}
		else if (aMin === bMin) {
			if (aMax < bMax) {
				return `${aMin}:${aMax}/${bMin}:${bMax}`;
			}
			else {
				return `${bMin}:${bMax}/${aMin}:${aMax}`;
			}
		}
		else {
			return `${bMin}:${bMax}/${aMin}:${aMax}`;
		}
	}
}

function lineSegmentIntersection(s1: ROPos, e1: ROPos, s2: ROPos, e2: ROPos): boolean {
	if (isOnLine(s1, e1, s2) || isOnLine(s1, e1, e2) ||
		isOnLine(s2, e2, s1) || isOnLine(s2, e2, e1)) {
		return false;
	}

	const o1 = orientation(s1, e1, s2);
	const o2 = orientation(s1, e1, e2);
	const o3 = orientation(s2, e2, s1);
	const o4 = orientation(s2, e2, e1);

	return (o1 !== o2 && o3 !== o4);
}
function orientation(s: ROPos, e: ROPos, p: ROPos): Orientation {
	const delta = (e.y - s.y) * (p.x - e.x) - (e.x - s.x) * (p.y - e.y);
	if (delta === 0) {
		return Orientation.Collinear;
	}
	else if (delta > 0) {
		return Orientation.Clockwise;
	}
	else {
		return Orientation.CounterClockwise;
	}
}
function isOnSegment(s: ROPos, e: ROPos, p: ROPos): boolean {
	if (isOnLine(s, e, p)) {
		const length = Math.sqrt(Math.pow(e.x - s.x, 2) + Math.pow(e.y - s.y, 2));
		const sDist = Math.sqrt(Math.pow(p.x - s.x, 2) + Math.pow(p.y - s.y, 2));
		const eDist = Math.sqrt(Math.pow(e.x - p.x, 2) + Math.pow(e.y - p.y, 2));
		return sDist < length && eDist < length;
	}
	else {
		return false;
	}
}
function isOnLine(s: ROPos, e: ROPos, p: ROPos): boolean {
	const dotProduct = (s.x - p.x) * (e.y - p.y) - (s.y - p.y) * (e.x - p.x)
	const epsilon = 0.003 * (Math.pow(e.x - s.x, 2) + Math.pow(e.y - s.y, 2));
	return Math.abs(dotProduct) < epsilon;
}

function angleBetween(from: ROPos, a: ROPos, b: ROPos): number {
	const aVec = { x: a.x - from.x, y: a.y - from.y };
	const bVec = { x: b.x - from.x, y: b.y - from.y };
	const ang = Math.abs(angle(aVec) - angle(bVec));
	return Math.min(ang, Math.PI * 2 - ang);
}
function angle(vec: ROPos): number {
	return Math.atan2(vec.x, vec.y);
}

window["isOnSegment"] = isOnSegment;
window["zz"] = { x: 0, y: 0 };
window["zo"] = { x: 0, y: 1 };
window["zt"] = { x: 0, y: 2 };

export interface Pos {
	x: number;
	y: number;
}
type ROPos = Readonly<Pos>;

enum Orientation {
	Collinear,
	Clockwise,
	CounterClockwise,
}
