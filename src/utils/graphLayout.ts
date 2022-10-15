import forceAtlas2 from "graphology-layout-forceatlas2";
import Graph from "graphology";
import { Vec } from "./Vec";

export function layout(nodes: ReadonlySet<number>, edges: ReadonlyMap<number, ReadonlySet<number>>): Map<number, Vec> {
	const graph = new Graph();
	for (const node of nodes) {
		const id = node.toFixed(0);
		graph.addNode(id);
		graph.setNodeAttribute(id, "x", Math.random());
		graph.setNodeAttribute(id, "y", Math.random());
	}
	for (const [from, tos] of edges) {
		for (const to of tos) {
			if (from < to) {
				graph.addEdge(from.toFixed(0), to.toFixed(0));
			}
		}
	}

	const layout = forceAtlas2(graph, { iterations: 50 });
	const map = new Map<number, Vec>();
	for (const node in layout) {
		const pos = layout[node];
		map.set(Number.parseInt(node), new Vec(pos.x, pos.y));
	}

	let totalEdgeLength = 0;
	let edgeCount = 0;
	for (const [from, tos] of edges) {
		for (const to of tos) {
			if (from < to) {
				totalEdgeLength += map.get(to).sub(map.get(from)).length;
				edgeCount++;
			}
		}
	}

	const averageEdgeLength = totalEdgeLength / edgeCount;
	for (const [node, pos] of [...map]) {
		map.set(node, pos.scale(1 / averageEdgeLength));
	}
	return map;
}
