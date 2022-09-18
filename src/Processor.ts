import { randomColor } from "./util";

export abstract class Processor {
	private _previousColor: string;
	public get previousColor(): string {
		return this._previousColor;
	}

	public get color(): string {
		return this._color;
	}

	public constructor(protected _color: string) { }

	public prepareStep(): void {
		this._previousColor = this._color;
	}

	public abstract step(previousColor: string): void;
}

export class Master extends Processor {
	public step(previousColor: string): void {
		if (previousColor === this._color) {
			this._color = randomColor();
		}
	}
}

export class Slave extends Processor {
	public step(previousColor: string): void {
		this._color = previousColor;
	}
}
