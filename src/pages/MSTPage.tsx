import React, { createRef, ChangeEvent, Component, ReactNode, RefObject } from "react";
import { sleep, waitForClick } from "../utils/promise";
import { MST, MSTIteration, Processor } from "../interactives/MST";
import { NumericInput } from "../components/NumericInput";

export interface MSTPageProperties {
}

interface MSTPageState {
	autoContinue: boolean;
	count: number;
	isSafe: boolean;
	round: number;
	hoveredProcessor: Processor | null;
}

export class MSTPage extends Component<MSTPageProperties, MSTPageState> {
	private readonly canvas: RefObject<HTMLCanvasElement> = createRef<HTMLCanvasElement>();
	private mst: MST;

	public constructor(props: MSTPageProperties) {
		super(props);
		this.state = {
			autoContinue: false,
			count: MST.DefaultCount,
			isSafe: false,
			round: 0,
			hoveredProcessor: null,
		};

		this.setAutoContinue = this.setAutoContinue.bind(this);
		this.setCount = this.setCount.bind(this);
		this.onIterationComplete = this.onIterationComplete.bind(this);
		this.onProcessorHover = this.onProcessorHover.bind(this);
		this.clear = this.clear.bind(this);
		this.restart = this.restart.bind(this);
	}

	private setAutoContinue(e: ChangeEvent<HTMLInputElement>): void {
		this.mst.delay = e.target.checked ?
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
		this.mst.count = count;
		this.setState({
			count,
		});
	}

	private clear(): void {
		this.setState({
			round: 0,
		});
		this.mst.reset();
	}

	private onIterationComplete({ isSafe, round, processor }: MSTIteration): void {
		this.setState({
			isSafe,
			round,
			hoveredProcessor: processor,
		});
	}

	private onProcessorHover(processor: Processor | null): void {
		this.setState({
			hoveredProcessor: processor,
		});
	}

	private restart(): void {
		this.setState({
			round: 0,
		});
		this.mst.restart();
	}

	public componentDidMount(): void {
		this.mst = new MST(this.canvas.current);
		this.mst.onIterationComplete = this.onIterationComplete;
		this.mst.onProcessorHover = this.onProcessorHover;
	}

	public render(): ReactNode {
		return (
			<>
				<div style={{ position: "fixed", right: "1px", bottom: "1px" }}>
					{this.state.autoContinue || this.state.isSafe ? null : "Tap to continue..."}
				</div>
				<canvas
					ref={this.canvas}
					style={{ cursor: this.state.hoveredProcessor != null ? "help" : null }}
				/>
				<div className="panel">
					<h3>Self-stabilizing minimum spanning tree</h3>
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
							{this.mst == null ? null :
								<>
									<tr>
										<th>Minimum Cost:</th>
										<td className="numeric">{this.mst.minimumSpanningCost}</td>
									</tr>
									<tr>
										<th>Current Cost:</th>
										<td className="numeric">{this.mst.currentCost}</td>
									</tr>
								</>
							}
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
					{this.state.hoveredProcessor == null ? null :
						<>
							<hr />
							<p>
								{MSTPage.processorInfo(this.state.hoveredProcessor)}
							</p>
						</>
					}
				</div>
			</>
		);
	}

	private static processorInfo(processor: Processor): JSX.Element {
		const mst = new Array<JSX.Element>();
		for (const [from, [to, ...tos]] of [...processor.mst].sort(([a, ], [b, ]) => a - b)) {
			if (to != null) {
				mst.push(
					<tr key={`${from}-${to}`}>
						{mst.length === 0 ? <td>MST:</td> : <td />}
						<td className="numeric">{from}</td>
						<td>➡</td>
						<td className="numeric">{to}</td>
					</tr>
				);
				for (const to of [...tos].sort((a, b) => a - b)) {
					mst.push(
						<tr key={`${from}-${to}`}>
							<td />
							<td />
							<td>➡</td>
							<td className="numeric">{to}</td>
						</tr>
					);
				}
			}
		}
		if (mst.length === 0) {
			mst.push(
				<tr key="root">
					<td>MST:</td>
				</tr>
			);
		}

		const graph = new Array<JSX.Element>();
		for (const [from, [[to, weight], ...tos]] of [...processor.graph].sort(([a, ], [b, ]) => a - b)) {
			if (to != null) {
				graph.push(
					<tr key={`${from}-${weight}-${to}`}>
						{graph.length === 0 ? <td>Graph:</td> : <td />}
						<td className="numeric">{from}</td>
						<td>➡</td>
						<td className="numeric">{weight}</td>
						<td>➡</td>
						<td className="numeric">{to}</td>
					</tr>
				);
				for (const [to, weight] of [...tos].sort(([a, ], [b, ]) => a - b)) {
					graph.push(
						<tr key={`${from}-${weight}-${to}`}>
							<td />
							<td />
							<td>➡</td>
							<td className="numeric">{weight}</td>
							<td>➡</td>
							<td className="numeric">{to}</td>
						</tr>
					);
				}
			}
		}
		if (graph.length === 0) {
			graph.push(
				<tr key="root">
					<td>Graph:</td>
				</tr>
			);
		}

		return (
			<>
				<table>
					<tr>
						<th>Id:</th>
						<td className="numeric">{processor.id}</td>
					</tr>
					<tr>
						<th>Connections:</th>
						<td className="numeric">{`{${[...processor.connections].join(", ")}}`}</td>
					</tr>
				</table>
				<table>
					{mst}
					{graph}
				</table>
			</>
		);
	}

	public componentWillUnmount(): void {
		this.mst.dispose();
	}
}
