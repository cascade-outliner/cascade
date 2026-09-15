import {
	KeyboardCode,
	type KeyboardCoordinateGetter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { INDENT } from "../layout";

export function useOutlineSensors(rowStep: number) {
	const coordinateGetter: KeyboardCoordinateGetter = (
		event,
		{ currentCoordinates: { x, y } },
	) => {
		switch (event.code) {
			case "ArrowRight":
				return { x: x + INDENT, y };
			case "ArrowLeft":
				return { x: x - INDENT, y };
			case "ArrowDown":
				return { x, y: y + rowStep };
			case "ArrowUp":
				return { x, y: y - rowStep };
		}
		return undefined;
	};

	return useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter,
			keyboardCodes: {
				start: [KeyboardCode.Space],
				cancel: [KeyboardCode.Esc],
				end: [KeyboardCode.Space],
			},
		}),
	);
}
