import React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./Layout";
import { DijkstrasAlgorithm } from "./pages/DijkstrasAlgorithm";
import { MaximumMatchingPage } from "./pages/MaximumMatchingPage";
import { MaximumMatchingRingPage } from "./pages/MaximumMatchingRingPage";
import MaximumMatchingRingDescription from "./pages/MaximumMatchingRingDescription.md";
import NotFound from "./pages/NotFound.md";
import README from "../README.md";

export const PAGES = [
	["Readme", "/"],
	["Dijkstra's Algorithm", "/dijkstras"],
	["Maximum Matching", "/maximum-matching"],
	["MM on a ring", "/maximum-matching/ring"],
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
					<Route path="*" element={<section><NotFound /></section>} />
				</Route>
			</Routes>
		</HashRouter>
	);
}