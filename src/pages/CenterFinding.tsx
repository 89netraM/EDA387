import React, { createRef, ChangeEvent, Component, ReactNode, RefObject } from "react";
import { sleep, waitForClick } from "../utils/promise";
import { CenterFinding, CenterFindingIteration } from "../interactives/CenterFinding";
import { NumericInput } from "../components/NumericInput";

export interface CenterFindingPageProperties {
}

interface CenterFindingPageState {
	autoContinue: boolean;
	maxHeight: number;
	maxChildCount: number;
	round: number;
	isSafe: boolean;
}

export class CenterFindingPage extends Component<CenterFindingPageProperties, CenterFindingPageState> {
	private readonly canvas: RefObject<HTMLCanvasElement> = createRef<HTMLCanvasElement>();
	private centerFinding: CenterFinding;

	public constructor(props: CenterFindingPageProperties) {
		super(props);
		this.state = {
			autoContinue: false,
			maxHeight: CenterFinding.DefaultMaxHeight,
			maxChildCount: CenterFinding.DefaultMaxChildCount,
			round: 0,
			isSafe: false,
		};

		this.setAutoContinue = this.setAutoContinue.bind(this);
		this.setMaxHeight = this.setMaxHeight.bind(this);
		this.setMaxChildCount = this.setMaxChildCount.bind(this);
		this.onIterationComplete = this.onIterationComplete.bind(this);
		this.clear = this.clear.bind(this);
		this.randomize = this.randomize.bind(this);
		this.restart = this.restart.bind(this);
	}

	private setAutoContinue(e: ChangeEvent<HTMLInputElement>): void {
		this.centerFinding.delay = e.target.checked ?
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
		this.centerFinding.maxHeight = maxHeight;
		this.setState({
			maxHeight,
		});
	}

	private setMaxChildCount(maxChildCount: number): void {
		this.centerFinding.maxChildCount = maxChildCount;
		this.setState({
			maxChildCount,
		});
	}

	private onIterationComplete({ round, isSafe }: CenterFindingIteration): void {
		this.setState({
			round,
			isSafe,
		});
	}

	private clear(): void {
		this.setState({
			round: 0,
			isSafe: false,
		});
		this.centerFinding.reset();
	}

	private randomize(): void {
		this.setState({
			round: 0,
			isSafe: false,
		});
		this.centerFinding.randomize();
	}

	private restart(): void {
		this.setState({
			round: 0,
			isSafe: false,
		});
		this.centerFinding.stop();
		this.centerFinding.start();
	}

	public componentDidMount(): void {
		this.centerFinding = new CenterFinding(this.canvas.current);
		this.centerFinding.onIterationComplete = this.onIterationComplete;
	}

	public render(): ReactNode {
		return (
			<>
				<div style={{ position: "absolute", right: "1px", bottom: "1px" }}>
					{this.state.autoContinue || this.state.isSafe ? null : "Tap to continue..."}
				</div>
				<canvas ref={this.canvas} />
				<div className="panel">
					<h3>Center&nbsp;Finding in Anonymous Tree Networks</h3>
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
							<tr>
								<th>Center:</th>
								<td style={{ color: CenterFinding.Center }}>■</td>
							</tr>
							<tr>
								<th>Done:</th>
								<td style={{ color: CenterFinding.Done }}>■</td>
							</tr>
							<tr>
								<th>Edge:</th>
								<td style={{ color: CenterFinding.Edge }}>■</td>
							</tr>
							<tr>
								<th>Clean:</th>
								<td style={{ color: CenterFinding.Clean }}>■</td>
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
						<button onClick={this.clear}>Clear</button>{" "}
						<button onClick={this.randomize}>Randomize</button>
					</p>
					<p>
						<button onClick={this.restart}>Restart</button>
					</p>
				</div>
			</>
		);
	}

	public componentWillUnmount(): void {
		this.centerFinding.dispose();
	}
}
