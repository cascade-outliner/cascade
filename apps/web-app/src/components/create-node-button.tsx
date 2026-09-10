import { colors } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { useOutlineStore } from "#/lib/outline-store.tsx";

const styles = stylex.create({
	button: {
		backgroundColor: colors.ink,
		color: colors.canvas,
		borderRadius: 4,
		paddingInline: 12,
		paddingBlock: 8,
	},
});

export function CreateNodeButton() {
	const store = useOutlineStore();

	return (
		<button
			{...stylex.props(styles.button)}
			type="button"
			onClick={() => store.create()}
		>
			New node
		</button>
	);
}
