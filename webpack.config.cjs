const path = require("path");
const HtmlPlugin = require("html-webpack-plugin");

module.exports = {
	entry: path.resolve(__dirname, "./src/index.tsx"),
	mode: "development",
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: "ts-loader",
			},
			{
				test: /\.s?css$/,
				use: [
					"style-loader",
					"css-loader",
					"sass-loader",
				],
			},
			{
				test: /\.md$/,
				use: [
					{
						loader: "babel-loader",
						options: {
							presets: [ "@babel/preset-react" ],
						},
					},
					"markdown-to-react-loader",
				],
			},
		]
	},
	resolve: {
		extensions: [ ".ts", ".js", ".tsx", ".jsx" ],
	},
	plugins: [
		new HtmlPlugin({
			template: path.resolve(__dirname, "index.html"),
			title: "EDA378",
			base: process.env["BASE_URL"] ?? "/",
		}),
	],
	ignoreWarnings: [
		{
			module: /styles\/index\.scss$/i,
		},
	],
	output: {
		filename: "index.js",
		path: path.resolve(__dirname, "dist"),
	},
	devServer: {
		port: 9090,
		host: "0.0.0.0",
		historyApiFallback: true,
	},
};
