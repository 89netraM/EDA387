import { PriorityQueue } from "./Queue";

export function calculateDiameter(edges: ReadonlyMap<number, ReadonlySet<number>>): number {
	return Math.max(0, ...[...edges.keys()].map(s => Math.max(0, ...calculateDistanceFrom(s, edges).values())));
}

export function calculateDistanceFrom(source: number, edges: ReadonlyMap<number, ReadonlySet<number>>): Map<number, number> {
	const distances = new Map<number, number>();
	const toVisit = new PriorityQueue<number, number>([[source, 0]]);
	while (toVisit.size > 0) {
		const [current, distance] = toVisit.dequeue();
		if (!distances.has(current)) {
			distances.set(current, distance);

			for (const next of edges.get(current)) {
				toVisit.enqueue(next, distance + 1);
			}
		}
	}
	return distances;
}

export function minimumSpanningTree(graph: ReadonlyMap<number, ReadonlyMap<number, number>>): Map<number, Set<number>> {
	const nodes = new Set<number>([...graph].flatMap(([from, tos]) => [from, ...[...tos].map(([to, _]) => to)]));
	const visited = new Set<number>([[...graph].reduce((m, [id, _]) => Math.min(m, id), Number.POSITIVE_INFINITY)]);
	const layout = new Map<number, Set<number>>([...graph].map(([id, _]) => [id, new Set<number>()]));
	while (visited.size < nodes.size) {
		let minimum: { from: number, to: number, weight: number } | null = null;
		for (const [from, tos] of [...graph].sort(([a, ], [b, ]) => a - b)) {
			if (visited.has(from)) {
				for (const [to, weight] of [...tos].sort(([a, ], [b, ]) => a - b)) {
					if (!visited.has(to)) {
						if (weight < (minimum?.weight ?? Number.POSITIVE_INFINITY)) {
							minimum = { from, to, weight };
						}
					}
				}
			}
		}
		visited.add(minimum.to);
		layout.get(minimum.from).add(minimum.to);
	}
	return layout;
}
