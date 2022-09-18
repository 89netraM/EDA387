import React from "react";
import ReactDOM from "react-dom";
import README from "../README.md";
import "./styles/index.scss";

ReactDOM.render(
	<React.StrictMode>
		<README />
	</React.StrictMode>,
	document.querySelector("app")
);
