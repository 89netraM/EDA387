import React, { createRef, ChangeEvent, Component, ReactNode, RefObject } from "react";
import { sleep, waitForClick } from "../utils/promise";
import { APartitioning, APartitioningIteration } from "../interactives/APartitioning";
import { NumericInput } from "../components/NumericInput";

export interface APartitioningPageProperties {
}

interface APartitioningPageState {
	autoContinue: boolean;
	maxHeight: number;
	maxChildCount: number;
	α: number;
	round: number;
}

export class APartitioningPage extends Component<APartitioningPageProperties, APartitioningPageState> {
	private readonly canvas: RefObject<HTMLCanvasElement> = createRef<HTMLCanvasElement>();
	private aPartitioning: APartitioning;

	public constructor(props: APartitioningPageProperties) {
		super(props);
		this.state = {
			autoContinue: false,
			maxHeight: APartitioning.DefaultMaxHeight,
			maxChildCount: APartitioning.DefaultMaxChildCount,
			α: APartitioning.DefaultMaxChildCount + 2,
			round: 0,
		};

		this.setAutoContinue = this.setAutoContinue.bind(this);
		this.setMaxHeight = this.setMaxHeight.bind(this);
		this.setMaxChildCount = this.setMaxChildCount.bind(this);
		this.setα = this.setα.bind(this);
		this.onIterationComplete = this.onIterationComplete.bind(this);
		this.restart = this.restart.bind(this);
	}

	private setAutoContinue(e: ChangeEvent<HTMLInputElement>): void {
		this.aPartitioning.delay = e.target.checked ?
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
		this.aPartitioning.maxHeight = maxHeight;
		this.setState({
			maxHeight,
		});
	}

	private setMaxChildCount(maxChildCount: number): void {
		this.aPartitioning.maxChildCount = maxChildCount;
		this.aPartitioning.α = Math.max(this.aPartitioning.α, maxChildCount + 2);
		this.setState({
			maxChildCount,
			α: this.aPartitioning.α,
		});
	}

	private setα(α: number): void {
		this.aPartitioning.α = α;
		this.setState({
			α,
		});
	}

	private onIterationComplete({ round }: APartitioningIteration): void {
		this.setState({
			round,
		});
	}

	private restart(): void {
		this.setState({
			round: 0,
		});
		this.aPartitioning.stop();
		this.aPartitioning.start();
	}

	public componentDidMount(): void {
		this.aPartitioning = new APartitioning(this.canvas.current);
		this.aPartitioning.onIterationComplete = this.onIterationComplete;
	}

	public render(): ReactNode {
		return (
			<>
				<div style={{ position: "absolute", right: "1px", bottom: "1px" }}>
					{this.state.autoContinue ? null : "Tap to continue..."}
				</div>
				<canvas ref={this.canvas} />
				<div className="panel">
					<h3>Self-stabilizing α&#8209;maximal-partitioning</h3>
					<p>
						<table>
							<tr>
								<th>Rounds:</th>
								<td className="numeric">{this.state.round}</td>
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
						<NumericInput
							label="α:"
							value={this.state.α}
							onChange={this.setα}
							validator={v => this.state.maxChildCount + 1 < v}
						/>
					</p>
					<p>
						<button onClick={this.restart}>Restart</button>
					</p>
				</div>
			</>
		);
	}

	public componentWillUnmount(): void {
		this.aPartitioning.dispose();
	}
}
