import React, { createRef, ChangeEvent, Component, ReactNode, RefObject } from "react";
import { sleep, waitForClick } from "../utils/promise";
import { Dijkstras, DijkstrasIteration } from "../interactives/Dijkstras";

export interface DijkstrasAlgorithmProperties {
}

interface DijkstrasAlgorithmState {
	autoContinue: boolean;
	count: string;
	round: number;
	isSafe: boolean;
}

export class DijkstrasAlgorithm extends Component<DijkstrasAlgorithmProperties, DijkstrasAlgorithmState> {
	private readonly canvas: RefObject<HTMLCanvasElement> = createRef<HTMLCanvasElement>();
	private dijkstras: Dijkstras;

	public constructor(props: DijkstrasAlgorithmProperties) {
		super(props);
		this.state = {
			autoContinue: false,
			count: Dijkstras.DefaultCount.toString(),
			round: 0,
			isSafe: false,
		};

		this.setAutoContinue = this.setAutoContinue.bind(this);
		this.setCount = this.setCount.bind(this);
		this.onIterationComplete = this.onIterationComplete.bind(this);
		this.restart = this.restart.bind(this);
	}

	private setAutoContinue(e: ChangeEvent<HTMLInputElement>): void {
		this.dijkstras.delay = e.target.checked ?
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
			this.dijkstras.count = newCount;
			this.setState({
				count: e.target.value,
			});
		}
	}

	private onIterationComplete({ round, isSafe }: DijkstrasIteration): void {
		this.setState(s => ({
			round,
			isSafe,
		}));
	}

	private restart(): void {
		this.setState({
			round: 0,
			isSafe: false,
		});
		this.dijkstras.stop();
		this.dijkstras.start();
	}

	public componentDidMount(): void {
		this.dijkstras = new Dijkstras(this.canvas.current);
		this.dijkstras.onIterationComplete = this.onIterationComplete;
	}

	public render(): ReactNode {
		return (
			<>
				<div style={{ position: "absolute", right: "1px", bottom: "1px" }}>
					{this.state.autoContinue ? null : "Tap to continue..."}
				</div>
				<canvas ref={this.canvas} />
				<div className="panel">
					<h3>Dijkstra's Algorithm</h3>
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
			</>
		);
	}

	public componentWillUnmount(): void {
		this.dijkstras.dispose();
	}
}
