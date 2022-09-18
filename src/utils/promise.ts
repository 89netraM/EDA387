export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise<void>(r => setTimeout(() => {
		if (!(signal?.aborted)) {
			r();
		}
	}, ms));
}

export function waitForClick(element: HTMLElement, signal?: AbortSignal): Promise<void> {
	return new Promise<void>(r => {
		const react = (e: MouseEvent) => {
			element.removeEventListener("click", react);
			if (!(signal?.aborted)) {
				r();
			}
		};
		element.addEventListener("click", react, true);
	});
}
