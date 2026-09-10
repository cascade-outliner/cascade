import * as stylex from "@stylexjs/stylex";
import { createFileRoute } from "@tanstack/react-router";

const styles = stylex.create({
	heading: {
		fontSize: 36,
		lineHeight: "40px",
		fontWeight: 700,
		textDecoration: "underline",
	},
});

export const Route = createFileRoute("/_frontend/")({
	component: HomePage,
	head: () => ({
		meta: [{ title: "Cascade" }],
	}),
});

function HomePage() {
	return (
		<div>
			<p {...stylex.props(styles.heading)}>Hello World...</p>
		</div>
	);
}
