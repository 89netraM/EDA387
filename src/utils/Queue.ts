export class PriorityQueue<T, P> {
	protected readonly array: Array<[T, P]>;

	public get size(): number {
		return this.array.length;
	}

	public constructor();
	public constructor(initial: ReadonlyArray<[T, P]>);
	public constructor(initial?: ReadonlyArray<[T, P]>) {
		this.array = new Array<[T, P]>();
		if (initial != null) {
			for (const [e, p] of initial) {
				this.enqueue(e, p);
			}
		}
	}

	public enqueue(element: T, priority: P): void {
		let i = 0;
		for (; i < this.array.length; i++) {
			if (this.array[i][1] > priority) {
				break;
			}
		}
		this.array.splice(i, 0, [element, priority]);
	}

	public dequeue(): [T, P] | null {
		return this.array.splice(0, 1)[0] ?? null;
	}
}
