import React, { createRef, ChangeEvent, Component, ReactNode, RefObject } from "react";
import { sleep, waitForClick } from "../utils/promise";
import { SpanningTree, SpanningTreeIteration } from "../interactives/SpanningTree";
import { NumericInput } from "../components/NumericInput";

export interface SpanningTreePageProperties {
}

interface SpanningTreePageState {
	autoContinue: boolean;
	count: number;
	isSafe: boolean;
	round: number;
}

export class SpanningTreePage extends Component<SpanningTreePageProperties, SpanningTreePageState> {
	private readonly canvas: RefObject<HTMLCanvasElement> = createRef<HTMLCanvasElement>();
	private spanningTree: SpanningTree;

	public constructor(props: SpanningTreePageProperties) {
		super(props);
		this.state = {
			autoContinue: false,
			count: SpanningTree.DefaultCount,
			isSafe: false,
			round: 0,
		};

		this.setAutoContinue = this.setAutoContinue.bind(this);
		this.setCount = this.setCount.bind(this);
		this.onIterationComplete = this.onIterationComplete.bind(this);
		this.clear = this.clear.bind(this);
		this.restart = this.restart.bind(this);
	}

	private setAutoContinue(e: ChangeEvent<HTMLInputElement>): void {
		this.spanningTree.delay = e.target.checked ?
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
		this.spanningTree.count = count;
		this.setState({
			count,
		});
	}

	private clear(): void {
		this.setState({
			round: 0,
		});
		this.spanningTree.reset();
	}

	private onIterationComplete({ isSafe, round }: SpanningTreeIteration): void {
		this.setState({
			isSafe,
			round,
		});
	}

	private restart(): void {
		this.setState({
			round: 0,
		});
		this.spanningTree.restart();
	}

	public componentDidMount(): void {
		this.spanningTree = new SpanningTree(this.canvas.current);
		this.spanningTree.onIterationComplete = this.onIterationComplete;
	}

	public render(): ReactNode {
		return (
			<>
				<div style={{ position: "fixed", right: "1px", bottom: "1px" }}>
					{this.state.autoContinue || this.state.isSafe ? null : "Tap to continue..."}
				</div>
				<canvas ref={this.canvas} />
				<div className="panel">
					<h3>Self-stabilizing spanning tree</h3>
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
		this.spanningTree.dispose();
	}
}
