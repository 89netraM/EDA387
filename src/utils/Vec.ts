export class Vec {
	public get length(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	public get angle(): number {
		return Math.atan2(this.y, this.x);
	}

	public constructor(
		public readonly x: number,
		public readonly y: number) { }

	public add(other: Vec): Vec {
		return new Vec(
			this.x + other.x,
			this.y + other.y);
	}

	public sub(other: Vec): Vec {
		return new Vec(
			this.x - other.x,
			this.y - other.y);
	}

	public scale(factor: number): Vec {
		return new Vec(
			this.x * factor,
			this.y * factor);
	}

	public rotate(angle: number): Vec {
		return new Vec(
			this.x * Math.cos(angle) - this.y * Math.sin(angle),
			this.x * Math.sin(angle) + this.y * Math.cos(angle));
	}

	public withLength(length: number): Vec {
		return this.scale(length / this.length);
	}

	public withMinParts(other: Vec): Vec {
		return new Vec(
			Math.min(this.x, other.x),
			Math.min(this.y, other.y));
	}

	public withMaxParts(other: Vec): Vec {
		return new Vec(
			Math.max(this.x, other.x),
			Math.max(this.y, other.y));
	}

	public angleTo(other: Vec): number {
		return Math.min(
			Math.abs(this.angle - other.angle),
			Math.abs(other.angle - this.angle));
	}
}
