import React, { ChangeEvent, useEffect, useState } from "react";

export interface NumericInputProperties {
	label?: string;
	value: number;
	isFloat?: boolean;
	onChange?: (v: number) => void;
	validator?: (v: number) => boolean;
}

export function NumericInput(props: NumericInputProperties): JSX.Element {
	const parser = props.isFloat ? Number.parseFloat : Number.parseInt;

	const [text, setText] = useState(props.value.toString());

	useEffect(() => setText(props.value.toString()), [props.value]);

	return (
		<label className={validate(text) ? null : "error"}>
			{props.label != null ? <span>{props.label}</span> : null}
			<input
				type="text"
				value={text}
				onChange={onInputChange}
			/>
		</label>
	);

	function onInputChange(e: ChangeEvent<HTMLInputElement>): void {
		if (validate(e.target.value)) {
			props.onChange?.(parser(e.target.value));
		}
		setText(e.target.value);
	}

	function validate(text: string): boolean {
		const value = parser(text);
		return !Number.isNaN(value) && (props.validator?.(value) ?? true)
	}
}
