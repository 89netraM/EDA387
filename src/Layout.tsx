import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { PAGES } from "./App";

export function Layout(): JSX.Element {
	const [navOpen, setNavOpen] = useState(false);
	const location = useLocation();

	return (
		<>
			<header>
				<button
					className="expand-nav"
					onClick={() => setNavOpen(!navOpen)}
				></button>
				<h1>EDA387</h1>
			</header>
			<nav className={navOpen ? "visible" : null}>
				<ul>
					{PAGES.map(([name, path]) =>
						<li
							key={name}
							className={location.pathname === path ? "active" : null}
						>
							<Link to={path}>{name}</Link>
						</li>
					)}
					<div className="marker"></div>
				</ul>
			</nav>
			<main>
				<Outlet />
			</main>
		</>
	);
}
