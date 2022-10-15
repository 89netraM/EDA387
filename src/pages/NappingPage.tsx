import React, { createRef, ChangeEvent, Component, ReactNode, RefObject } from "react";
import { sleep, waitForClick } from "../utils/promise";
import { Napping, NappingIteration } from "../interactives/Napping";
import { NumericInput } from "../components/NumericInput";

export interface NappingPageProperties {
}

interface NappingPageState {
	autoContinue: boolean;
	count: number;
}

export class NappingPage extends Component<NappingPageProperties, NappingPageState> {
	private readonly canvas: RefObject<HTMLCanvasElement> = createRef<HTMLCanvasElement>();
	private napping: Napping;

	public constructor(props: NappingPageProperties) {
		super(props);
		this.state = {
			autoContinue: false,
			count: Napping.DefaultCount,
		};

		this.setAutoContinue = this.setAutoContinue.bind(this);
		this.setCount = this.setCount.bind(this);
		this.clear = this.clear.bind(this);
		this.restart = this.restart.bind(this);
	}

	private setAutoContinue(e: ChangeEvent<HTMLInputElement>): void {
		this.napping.delay = e.target.checked ?
			s => sleep(1000, s) :
			s => waitForClick(this.canvas.current, s);
		if (e.target.checked) {
			this.canvas.current.click();
		}
		this.setState({
			autoContinue: e.target.checked,
		});
	}

	private setCount(count: number): void {
		this.napping.count = count;
		this.setState({
			count: count,
		});
	}

	private clear(): void {
		this.napping.reset();
	}

	private restart(): void {
		this.napping.restart();
	}

	public componentDidMount(): void {
		this.napping = new Napping(this.canvas.current);
	}

	public render(): ReactNode {
		return (
			<>
				<div style={{ position: "absolute", right: "1px", bottom: "1px" }}>
					{this.state.autoContinue ? null : "Tap to continue..."}
				</div>
				<canvas ref={this.canvas} />
				<div className="panel">
					<h3>Self-stabilizing in Spite of Napping</h3>
					<p>
						<table>
							<tr title="The processor is equal to, or in a draw with, all of its neighbors">
								<th>Equal:</th>
								<td style={{ color: Napping.EqualColor }}>■</td>
							</tr>
							<tr title="The processor is behind, or loosing to, at least one of its neighbors">
								<th>Behind:</th>
								<td style={{ color: Napping.BehindColor }}>■</td>
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
					<p><small>Tap nodes to toggle sleep</small></p>
					<p>
						<button onClick={this.clear}>Clear</button> {" "}
						<button onClick={this.restart}>Restart</button>
					</p>
				</div>
			</>
		);
	}

	public componentWillUnmount(): void {
		this.napping.dispose();
	}
}
