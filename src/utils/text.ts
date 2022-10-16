export function toSubscriptNumber(n: number): string {
	return [...n.toFixed(0)].map(c => toSubscriptDigit(parseInt(c))).join("");
}

export function toSubscriptDigit(d: number): string {
	return String.fromCharCode(d + 0x2080);
}
