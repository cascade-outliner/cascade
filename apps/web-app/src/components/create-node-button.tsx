import { useOutlineStore } from "#/lib/outline-store.tsx";

export function CreateNodeButton() {
	const store = useOutlineStore();

	return (
		<button
			className="bg-ink text-canvas rounded px-3 py-2"
			type="button"
			onClick={() => store.create()}
		>
			New node
		</button>
	);
}
