import * as stylex from "@stylexjs/stylex";

export interface OutlinerRootProps {
	children: React.ReactNode;
	style?: stylex.StyleXStyles;
}

export function Root({ children, style }: OutlinerRootProps) {
	return <div {...stylex.props(style)}>{children}</div>;
}
