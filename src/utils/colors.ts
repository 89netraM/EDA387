export function randomIndex(max: number): number {
	return Math.floor(Math.random() * max);
}

export function randomColor(colorIndex: number, colorCount: number): string {
	const colorStep = 360 / colorCount;
	return hslToHex(colorIndex * colorStep, 0.63, 0.59);
}

export function hslToHex(h: number, s: number, l: number): string {
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => {
		const k = (n + h / 30) % 12;
		const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
		return Math.round(255 * color).toString(16).padStart(2, "0");
	};
	return `#${f(0)}${f(8)}${f(4)}`;
}
