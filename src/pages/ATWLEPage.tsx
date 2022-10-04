import React, { createRef, ChangeEvent, Component, ReactNode, RefObject } from "react";
import { sleep, waitForClick } from "../utils/promise";
import { ATWLE, ATWLEIteration } from "../interactives/ATWLE";
import { NumericInput } from "../components/NumericInput";

export interface ATWLEPageProperties {
}

interface ATWLEPageState {
	autoContinue: boolean;
	maxHeight: number;
	maxChildCount: number;
	round: number;
	isSafe: boolean;
	loading: number | null;
}

export class ATWLEPage extends Component<ATWLEPageProperties, ATWLEPageState> {
	private readonly canvas: RefObject<HTMLCanvasElement> = createRef<HTMLCanvasElement>();
	private atwle: ATWLE;

	public constructor(props: ATWLEPageProperties) {
		super(props);
		this.state = {
			autoContinue: false,
			maxHeight: ATWLE.DefaultMaxHeight,
			maxChildCount: ATWLE.DefaultMaxChildCount,
			round: 0,
			isSafe: false,
			loading: 0,
		};

		this.setAutoContinue = this.setAutoContinue.bind(this);
		this.setMaxHeight = this.setMaxHeight.bind(this);
		this.setMaxChildCount = this.setMaxChildCount.bind(this);
		this.onIterationComplete = this.onIterationComplete.bind(this);
		this.onProgress = this.onProgress.bind(this);
		this.clear = this.clear.bind(this);
		this.restart = this.restart.bind(this);
	}

	private setAutoContinue(e: ChangeEvent<HTMLInputElement>): void {
		this.atwle.delay = e.target.checked ?
			s => sleep(500, s) :
			s => waitForClick(this.canvas.current, s);
		if (e.target.checked) {
			this.canvas.current.click();
		}
		this.setState({
			autoContinue: e.target.checked,
		});
	}

	private setMaxHeight(maxHeight: number): void {
		this.atwle.maxHeight = maxHeight;
		this.setState({
			maxHeight,
		});
	}

	private setMaxChildCount(maxChildCount: number): void {
		this.atwle.maxChildCount = maxChildCount;
		this.setState({
			maxChildCount,
		});
	}

	private clear(): void {
		this.setState({
			round: 0,
			isSafe: false,
		});
		this.atwle.reset();
	}

	private onIterationComplete({ round, isSafe }: ATWLEIteration): void {
		this.setState({
			round,
			isSafe,
			loading: null,
		});
	}

	private onProgress(percent: number): void {
		this.setState({
			loading: percent,
		});
	}

	private restart(): void {
		this.setState({
			round: 0,
			isSafe: false,
			loading: 0,
		});
		this.atwle.restart();
	}

	public componentDidMount(): void {
		this.atwle = new ATWLE(this.canvas.current);
		this.atwle.onIterationComplete = this.onIterationComplete;
		this.atwle.onProgress = this.onProgress;
	}

	public render(): ReactNode {
		return (
			<>
				<div style={{ position: "absolute", right: "1px", bottom: "1px" }}>
					{this.state.loading != null || this.state.autoContinue || this.state.isSafe ? null : "Tap to continue..."}
				</div>
				{this.state.loading != null
					?
						<div className="progress">
							<progress value={this.state.loading}/>
							<span>{(this.state.loading * 100).toFixed(0)}%</span>
						</div>
					: null}
				<canvas ref={this.canvas} />
				<div className="panel">
					<h3>Anonymous Tree Weak Leader Election</h3>
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
							label="Max height:"
							value={this.state.maxHeight}
							onChange={this.setMaxHeight}
							validator={v => 0 < v}
						/>
					</p>
					<p>
						<NumericInput
							label="Max child count:"
							value={this.state.maxChildCount}
							onChange={this.setMaxChildCount}
							validator={v => 0 < v}
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
		this.atwle.dispose();
	}
}
