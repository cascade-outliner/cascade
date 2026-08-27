import { useNodeStore } from "#/context/store-context.tsx";

export function CreateNodeButton() {
	const store = useNodeStore();

	return (
		<button
			className="bg-ink text-canvas rounded px-3 py-2"
			type="button"
			onClick={() => store.createNode()}
		>
			New node
		</button>
	);
}
