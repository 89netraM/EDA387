import { ClockSyncPage } from "./ClockSyncPage";
import { ClockSyncMin } from "../interactives/ClockSyncMin";

export class ClockSyncMinPage extends ClockSyncPage {
	protected title: string = "Min";
	protected makeClockSync(canvas: HTMLCanvasElement): ClockSyncMin {
		return new ClockSyncMin(canvas);
	}
}
