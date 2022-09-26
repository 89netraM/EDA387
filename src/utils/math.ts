export function permutations(n: number, r: number): number {
	return factorial(n) / factorial(n - r);
}

export function factorial(n: number): number {
	return n <= 0 ? 1 : factorial(n - 1) * n;
}
