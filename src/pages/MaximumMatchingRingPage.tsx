import React, { createRef, Component, ReactNode, RefObject, ChangeEvent } from "react";
import { sleep, waitForClick } from "../utils/promise";
import { MaximumMatchingRing, VfValues } from "../interactives/MaximumMatchingRing";
import MaximumMatchingRingDescription from "./MaximumMatchingRingDescription.md";
import { Route, Routes } from "react-router-dom";
import { Link } from "react-router-dom";

export interface MaximumMatchingRingPageProperties {
}

interface MaximumMatchingRingPageState {
	autoContinue: boolean;
	count: string;
	rounds: number;
	isSafe: boolean;
	vfValues?: VfValues;
}

export class MaximumMatchingRingPage extends Component<MaximumMatchingRingPageProperties, MaximumMatchingRingPageState> {
	private readonly canvas: RefObject<HTMLCanvasElement> = createRef<HTMLCanvasElement>();
	private maximumMatching: MaximumMatchingRing;

	public constructor(props: MaximumMatchingRingPageProperties) {
		super(props);
		this.state = {
			autoContinue: false,
			count: "8",
			rounds: 0,
			isSafe: false,
		};

		this.setAutoContinue = this.setAutoContinue.bind(this);
		this.setCount = this.setCount.bind(this);
		this.onIterationComplete = this.onIterationComplete.bind(this);
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

	private onIterationComplete(rounds: number, isSafe: boolean, vfValues: VfValues): void {
		this.setState(s => ({
			rounds,
			isSafe,
			vfValues,
		}));
	}

	private restart(): void {
		this.setState({
			rounds: 0,
			isSafe: false,
			vfValues: { m: 0, s: 0, w: 0, f: 0, c: 0 },
		});
		this.maximumMatching.restart();
	}

	public componentDidMount(): void {
		this.maximumMatching = new MaximumMatchingRing(this.canvas.current);
		this.maximumMatching.onIterationComplete = this.onIterationComplete;
	}

	public render(): ReactNode {
		const v = this.state.vfValues ?? { m: 0, s: 0, w: 0, f: 0, c: 0 };
		const vf = `(${v.m + v.s}, ${v.w}, ${v.f}, ${v.c})`;

		return (
			<>
				<div style={{ position: "absolute", right: "1px", bottom: "1px" }}>
					{this.state.autoContinue || this.maximumMatching?.isSafe ? null : "Tap to continue..."}
				</div>
				<canvas ref={this.canvas} />
				<div className="panel">
					<h3>Self-stabilizing maximum&nbsp;matching on&nbsp;a&nbsp;ring</h3>
					<p>
						<Link to="./description"><button>Description</button></Link>
					</p>
					<p>
						<table>
							<tr>
								<th>Rounds:</th>
								<td className="numeric">{this.state.rounds}</td>
							</tr>
							<tr>
								<th>Status:</th>
								<td>{this.state.isSafe ? "Safe" : "Unsafe"}</td>
							</tr>
							<tr title="VF = (m + s, w, f, c)">
								<th>VF:</th>
								<td>{vf}</td>
							</tr>
						</table>
					</p>
					<hr />
					<p>
						<table>
							<tr title="The processor points at a neighbor that points back at it">
								<th>Matched:</th>
								<td style={{ color: MaximumMatchingRing.MatchedColor }}>■</td>
							</tr>
							<tr title="The processor points at a neighbor that points at no one">
								<th>Waiting:</th>
								<td style={{ color: MaximumMatchingRing.WaitingColor }}>■</td>
							</tr>
							<tr title="The processor points at no one, but all its neighbors points at someone">
								<th>Single:</th>
								<td style={{ color: MaximumMatchingRing.SingleColor }}>■</td>
							</tr>
							<tr title="The processor points at no one, and so does one of its neighbors">
								<th>Free:</th>
								<td style={{ color: MaximumMatchingRing.FreeColor }}>■</td>
							</tr>
							<tr title="The processor points at a neighbor that does not point at it">
								<th>Chaining:</th>
								<td style={{ color: MaximumMatchingRing.ChainingColor }}>■</td>
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
						<button onClick={this.restart}>Restart</button>
					</p>
				</div>
				<Routes>
					<Route path="description" element={
						<div
							className="dialog"
							data-open={true}>
							<main>
								<MaximumMatchingRingDescription />
							</main>
							<footer>
								<Link to="../."><button>Close</button></Link>
							</footer>
						</div>
					} />
				</Routes>
			</>
		);
	}

	public componentWillUnmount(): void {
		this.maximumMatching.dispose();
	}
}
