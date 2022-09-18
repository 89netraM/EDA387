import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./Layout";
import NotFound from "./pages/NotFound.md";
import README from "../README.md";

export const PAGES = [
	["Readme", "/"],
] as const;

export function App(): JSX.Element {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Layout />}>
					<Route index element={<section><README /></section>} />
					<Route path="*" element={<section><NotFound /></section>} />
				</Route>
			</Routes>
		</BrowserRouter>
	);
}
