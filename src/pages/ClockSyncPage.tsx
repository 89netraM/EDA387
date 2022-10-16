import React, { createRef, ChangeEvent, Component, ReactNode, RefObject } from "react";
import { sleep, waitForClick } from "../utils/promise";
import { ClockSync, ClockSyncIteration } from "../interactives/ClockSync";
import { NumericInput } from "../components/NumericInput";

export interface ClockSyncPageProperties {
}

interface ClockSyncPageState {
	autoContinue: boolean;
	count: number;
	round: number;
	isSafe: boolean;
}

export abstract class ClockSyncPage extends Component<ClockSyncPageProperties, ClockSyncPageState> {
	private readonly canvas: RefObject<HTMLCanvasElement> = createRef<HTMLCanvasElement>();
	private clockSync: ClockSync<any>;

	protected abstract title: string;

	public constructor(props: ClockSyncPageProperties) {
		super(props);
		this.state = {
			autoContinue: false,
			count: ClockSync.DefaultCount,
			round: 0,
			isSafe: false,
		};

		this.setAutoContinue = this.setAutoContinue.bind(this);
		this.setCount = this.setCount.bind(this);
		this.onIterationComplete = this.onIterationComplete.bind(this);
		this.clear = this.clear.bind(this);
		this.restart = this.restart.bind(this);
	}

	private setAutoContinue(e: ChangeEvent<HTMLInputElement>): void {
		this.clockSync.delay = e.target.checked ?
			s => sleep(150, s) :
			s => waitForClick(this.canvas.current, s);
		if (e.target.checked) {
			this.canvas.current.click();
		}
		this.setState({
			autoContinue: e.target.checked,
		});
	}

	private setCount(count: number): void {
		this.clockSync.count = count;
		this.setState({
			count: count,
		});
	}

	private onIterationComplete({ round, isSafe }: ClockSyncIteration): void {
		this.setState(s => ({
			round,
			isSafe,
		}));
	}

	private clear(): void {
		this.setState({
			round: 0,
			isSafe: false,
		});
		this.clockSync.reset();
	}

	private restart(): void {
		this.setState({
			round: 0,
			isSafe: false,
		});
		this.clockSync.restart();
	}

	public componentDidMount(): void {
		this.clockSync = this.makeClockSync(this.canvas.current);
		this.clockSync.onIterationComplete = this.onIterationComplete;
	}

	protected abstract makeClockSync(canvas: HTMLCanvasElement): ClockSync<any>;

	public render(): ReactNode {
		return (
			<>
				<div style={{ position: "absolute", right: "1px", bottom: "1px" }}>
					{this.state.autoContinue ? null : "Tap to continue..."}
				</div>
				<canvas ref={this.canvas} />
				<div className="panel">
					<h3>Digital Clock Synchronization – {this.title}</h3>
					<p>
						<table>
							<tr>
								<th>Rounds:</th>
								<td className="numeric">{this.state.round}</td>
							</tr>
							<tr>
								<th>Status:</th>
								<td>{this.state.isSafe ? "Safe" : "Unsafe"}</td>
							</tr>
						</table>
					</p>
					<hr />
					<p>
						<label>
							Auto Continue: {" "}
							<input type="checkbox" onChange={this.setAutoContinue} />
							<span className="toggle"></span>
						</label>
					</p>
					<p>
						<NumericInput
							label="Count:"
							value={this.state.count}
							onChange={this.setCount}
							validator={v => 1 < v}
						/>
					</p>
					<p>
						<button onClick={this.clear}>Clear</button> {" "}
						<button onClick={this.restart}>Restart</button>
					</p>
				</div>
			</>
		);
	}

	public componentWillUnmount(): void {
		this.clockSync.dispose();
	}
}
