import { ClockSyncPage } from "./ClockSyncPage";
import { ClockSyncMax } from "../interactives/ClockSyncMax";

export class ClockSyncMaxPage extends ClockSyncPage {
	protected title: string = "Max";
	protected makeClockSync(canvas: HTMLCanvasElement): ClockSyncMax {
		return new ClockSyncMax(canvas);
	}
}
