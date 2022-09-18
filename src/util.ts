export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise<void>(r => setTimeout(() => {
		if (!(signal?.aborted)) {
			r();
		}
	}, ms));
}

export function waitForClick(signal?: AbortSignal): Promise<void> {
	return new Promise<void>(r => {
		const react = (e: MouseEvent) => {
			window.removeEventListener("click", react);
			if (!(signal?.aborted)) {
				r();
			}
		};
		window.addEventListener("click", react, true);
	});
}

export function randomColor(): string {
	return randomHex() + randomHex() + randomHex();
}

function randomHex(): string {
	return ((Math.floor(Math.random() * 0x10) * 0x10).toString(16) + "0").substring(0, 2);
}
