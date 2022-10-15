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
			if (!e.defaultPrevented) {
				element.removeEventListener("click", react, false);
				if (!(signal?.aborted)) {
					r();
				}
			}
		};
		element.addEventListener("click", react, false);
	});
}

export function immediate(signal?: AbortSignal): Promise<void> {
	return sleep(0, signal);
}
