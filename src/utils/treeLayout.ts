import { Vec } from "./Vec";

export function treeLayout(edges: ReadonlyMap<number, ReadonlySet<number>>): Map<number, Vec> {
	return buildTree(findRoot(edges), edges)[0];
}

function findRoot(edges: ReadonlyMap<number, ReadonlySet<number>>): number {
	const hasParents = new Map<number, boolean>();

	for (const [id, children] of edges) {
		if (!hasParents.has(id)) {
			hasParents.set(id, false);
		}
		for (const child of children) {
			hasParents.set(child, true);
		}
	}

	for (const [id, hasParent] of hasParents) {
		if (!hasParent) {
			return id;
		}
	}

	throw new Error("No root node found");
}

function buildTree(root: number, edges: ReadonlyMap<number, ReadonlySet<number>>): [Map<number, Vec>, number] {
	const map = new Map<number, Vec>();

	let width = 0;

	const childTrees = new Array<[Map<number, Vec>, number]>();
	for (const child of edges.get(root)) {
		const [childTree, childWidth] = buildTree(child, edges);
		width += childWidth;
		childTrees.push([childTree, childWidth]);
	}

	if (childTrees.length > 0) {
		let childOrigin = new Vec(-width / 2, 1);
		for (const [childTree, childWidth] of childTrees) {
			childOrigin = new Vec(childOrigin.x + childWidth / 2, 1);
			for (const [child, childPos] of childTree) {
				map.set(child, childPos.add(childOrigin));
			}
			childOrigin = new Vec(childOrigin.x + childWidth / 2, 1);
		}
	}
	else {
		width += 1;
	}

	map.set(root, new Vec(0, 0));

	return [map, width];
}
