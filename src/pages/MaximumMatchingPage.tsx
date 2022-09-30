import React, { createRef, Component, ReactNode, RefObject, ChangeEvent } from "react";
import { sleep, waitForClick } from "../utils/promise";
import { MaximumMatching, MaximumMatchingIteration } from "../interactives/MaximumMatching";

export interface MaximumMatchingPageProperties {
}

interface MaximumMatchingPageState {
	autoContinue: boolean;
	count: string;
	round: number;
	isSafe: boolean;
	loading: number | null;
}

export class MaximumMatchingPage extends Component<MaximumMatchingPageProperties, MaximumMatchingPageState> {
	private readonly canvas: RefObject<HTMLCanvasElement> = createRef<HTMLCanvasElement>();
	private maximumMatching: MaximumMatching;

	public constructor(props: MaximumMatchingPageProperties) {
		super(props);
		this.state = {
			autoContinue: false,
			count: MaximumMatching.DefaultCount.toString(),
			round: 0,
			isSafe: false,
			loading: 0,
		};

		this.setAutoContinue = this.setAutoContinue.bind(this);
		this.setCount = this.setCount.bind(this);
		this.onIterationComplete = this.onIterationComplete.bind(this);
		this.onProgress = this.onProgress.bind(this);
		this.clear = this.clear.bind(this);
		this.restart = this.restart.bind(this);
	}

	private setAutoContinue(e: ChangeEvent<HTMLInputElement>): void {
		this.maximumMatching.delay = e.target.checked ?
			s => sleep(500, s) :
			s => waitForClick(this.canvas.current, s);
		if (e.target.checked) {
			this.canvas.current.click();
		}
		this.setState({
			autoContinue: e.target.checked,
		});
	}

	private setCount(e: ChangeEvent<HTMLInputElement>): void {
		const newCount = parseInt(e.target.value);
		if (Number.isInteger(newCount) || e.target.value == "") {
			this.maximumMatching.count = newCount;
			this.setState({
				count: e.target.value,
			});
		}
	}

	private onIterationComplete({ isSafe, round }: MaximumMatchingIteration): void {
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

	private clear(): void {
		this.setState({
			round: 0,
			isSafe: false,
		});
		this.maximumMatching.reset();
	}

	private restart(): void {
		this.setState({
			round: 0,
			isSafe: false,
			loading: 0,
		});
		this.maximumMatching.restart();
	}

	public componentDidMount(): void {
		this.maximumMatching = new MaximumMatching(this.canvas.current);
		this.maximumMatching.onIterationComplete = this.onIterationComplete;
		this.maximumMatching.onProgress = this.onProgress;
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
					<h3>Self-stabilizing maximum&nbsp;matching on an arbitrary graph</h3>
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
						<table>
							<tr title="The processor points at a neighbor that points back at it">
								<th>Matched:</th>
								<td style={{ color: MaximumMatching.MatchedColor }}>■</td>
							</tr>
							<tr title="The processor points at a neighbor that points at no one">
								<th>Waiting:</th>
								<td style={{ color: MaximumMatching.WaitingColor }}>■</td>
							</tr>
							<tr title="The processor points at no one, but all its neighbors points at someone">
								<th>Single:</th>
								<td style={{ color: MaximumMatching.SingleColor }}>■</td>
							</tr>
							<tr title="The processor points at no one, and so does one of its neighbors">
								<th>Free:</th>
								<td style={{ color: MaximumMatching.FreeColor }}>■</td>
							</tr>
							<tr title="The processor points at a neighbor that does not point at it">
								<th>Chaining:</th>
								<td style={{ color: MaximumMatching.ChainingColor }}>■</td>
							</tr>
						</table>
					</p>
					<hr />
					<p>
						<label>
							Auto Continue: {" "}
							<input
								type="checkbox"
								checked={this.state.autoContinue}
								onChange={this.setAutoContinue} />
							<span className="toggle"></span>
						</label>
					</p>
					<p>
						<label>
							Node count:
							<input
								type="text"
								onChange={this.setCount}
								value={this.state.count} />
						</label>
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
		this.maximumMatching.dispose();
	}
}
