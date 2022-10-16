import { Vec } from "./Vec";

export function circleLayout(nodes: ReadonlyArray<number>): Map<number, Vec> {
	const layout = new Map<number, Vec>();

	const radiusVec = new Vec(0, -1);
	for (let i = 0; i < nodes.length; i++) {
		const angle = Math.PI * 2 * (i / nodes.length);
		const pos = radiusVec.rotate(angle);
		layout.set(nodes[i], pos);
	}

	return layout;
}
