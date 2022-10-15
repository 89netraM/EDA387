import React, { createRef, ChangeEvent, Component, ReactNode, RefObject } from "react";
import { sleep, waitForClick } from "../utils/promise";
import { LeaderElection, LeaderElectionIteration } from "../interactives/LeaderElection";
import { NumericInput } from "../components/NumericInput";

export interface LeaderElectionPageProperties {
}

interface LeaderElectionPageState {
	autoContinue: boolean;
	count: number;
	round: number;
	isSafe: boolean;
}

export class LeaderElectionPage extends Component<LeaderElectionPageProperties, LeaderElectionPageState> {
	private readonly canvas: RefObject<HTMLCanvasElement> = createRef<HTMLCanvasElement>();
	private leaderElection: LeaderElection;

	public constructor(props: LeaderElectionPageProperties) {
		super(props);
		this.state = {
			autoContinue: false,
			count: LeaderElection.DefaultCount,
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
		this.leaderElection.delay = e.target.checked ?
			s => sleep(500, s) :
			s => waitForClick(this.canvas.current, s);
		if (e.target.checked) {
			this.canvas.current.click();
		}
		this.setState({
			autoContinue: e.target.checked,
		});
	}

	private setCount(count: number): void {
		this.leaderElection.count = count;
		this.setState({
			count: count,
		});
	}

	private clear(): void {
		this.setState({
			round: 0,
			isSafe: false,
		});
		this.leaderElection.reset();
	}

	private onIterationComplete({ round, isSafe }: LeaderElectionIteration): void {
		this.setState({
			round,
			isSafe,
		});
	}

	private restart(): void {
		this.setState({
			round: 0,
			isSafe: false,
		});
		this.leaderElection.restart();
	}

	public componentDidMount(): void {
		this.leaderElection = new LeaderElection(this.canvas.current);
		this.leaderElection.onIterationComplete = this.onIterationComplete;
	}

	public render(): ReactNode {
		return (
			<>
				<div style={{ position: "absolute", right: "1px", bottom: "1px" }}>
					{this.state.autoContinue || this.state.isSafe ? null : "Tap to continue..."}
				</div>
				<canvas ref={this.canvas} />
				<div className="panel">
					<h3>Self-stabilizing Leader Election for ID-based Systems</h3>
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
		this.leaderElection.dispose();
	}
}
