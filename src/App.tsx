import React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./Layout";
import { DijkstrasAlgorithm } from "./pages/DijkstrasAlgorithm";
import { MaximumMatchingPage } from "./pages/MaximumMatchingPage";
import { MaximumMatchingRingPage } from "./pages/MaximumMatchingRingPage";
import MaximumMatchingRingDescription from "./pages/MaximumMatchingRingDescription.md";
import { LeaderElectionPage } from "./pages/LeaderElectionPage";
import { CenterFindingPage } from "./pages/CenterFinding";
import { APartitioningPage } from "./pages/APartitioningPage";
import { SpanningTreePage } from "./pages/SpanningTreePage";
import { MSTPage } from "./pages/MSTPage";
import { ClockSyncMaxPage } from "./pages/ClockSyncMaxPage";
import { NappingPage } from "./pages/NappingPage";
import NotFound from "./pages/NotFound.md";
import README from "../README.md";

export const PAGES = [
	["Readme", "/"],
	["Dijkstra's Algorithm", "/dijkstras"],
	["Maximum Matching", "/maximum-matching"],
	["MM on a ring", "/maximum-matching/ring"],
	["Leader Election", "/leader-election"],
	["Center Finding", "/center-finding"],
	["α-partitioning", "/a-partitioning"],
	["Spanning Tree", "/spanning-tree"],
	["MST", "/spanning-tree/minimum"],
	["Clock Sync – Max", "/clock-sync/max"],
	["Napping", "/napping"],
] as const;

export function App(): JSX.Element {
	return (
		<HashRouter>
			<Routes>
				<Route path="/" element={<Layout />}>
					<Route index element={<section><README /></section>} />
					<Route path="dijkstras" element={<DijkstrasAlgorithm />} />
					<Route path="maximum-matching" element={<MaximumMatchingPage />} />
					<Route path="maximum-matching/ring/*" element={<MaximumMatchingRingPage />}>
						<Route path="description" element={<MaximumMatchingRingDescription />} />
					</Route>
					<Route path="leader-election" element={<LeaderElectionPage />} />
					<Route path="center-finding" element={<CenterFindingPage />} />
					<Route path="a-partitioning" element={<APartitioningPage />} />
					<Route path="spanning-tree" element={<SpanningTreePage />} />
					<Route path="spanning-tree/minimum" element={<MSTPage />} />
					<Route path="clock-sync/max" element={<ClockSyncMaxPage />} />
					<Route path="napping" element={<NappingPage />} />
					<Route path="*" element={<section><NotFound /></section>} />
				</Route>
			</Routes>
		</HashRouter>
	);
}
