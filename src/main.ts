import { setSize } from "./drawing";
import { program, setDelay } from "./program";
import "./styles.scss";
import { sleep, waitForClick } from "./util";

let canvas: HTMLCanvasElement;
let controller = new AbortController();

window.addEventListener(
	"load",
	() => {
		canvas = document.getElementById("main-canvas") as HTMLCanvasElement;
		updateCanvasSize();
		const ctx = canvas.getContext("2d");

		const autoContinueToggle = document.getElementById("autoContinue") as HTMLInputElement;
		const nodeCountInput = document.getElementById("nodeCount") as HTMLInputElement;

		function getNodeCount(): number {
			const count = Number.parseInt(nodeCountInput.value);
			return Number.isNaN(count) ? 10 : count;
		}

		autoContinueToggle.addEventListener(
			"change",
			e => {
				e.preventDefault();
				setDelay(autoContinueToggle.checked ? (s) => sleep(500, s) : waitForClick);
			},
			true);
		document.getElementById("reset").addEventListener(
			"click",
			e => {
				e.preventDefault();
				controller.abort();
				controller = new AbortController();
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				program(ctx, getNodeCount(), controller.signal);
			},
			true);

		program(ctx, getNodeCount(), controller.signal);
	},
	true);

window.addEventListener(
	"resize",
	() => {
		updateCanvasSize();
	},
	true);

function updateCanvasSize(): void {
	canvas.width = canvas.offsetWidth;
	canvas.height = canvas.offsetHeight;
	setSize(canvas.width, canvas.height);
}
