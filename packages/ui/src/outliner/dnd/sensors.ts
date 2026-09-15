import {
	type KeyboardCoordinateGetter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { useCallback, useMemo } from "react";
import { INDENT } from "../layout";

const POINTER_SENSOR_OPTIONS = { activationConstraint: { distance: 4 } };

export function useOutlineSensors(rowStep: number) {
	const coordinateGetter: KeyboardCoordinateGetter = useCallback(
		(event, { currentCoordinates: { x, y } }) => {
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
		},
		[rowStep],
	);
	const keyboardSensorOptions = useMemo(
		() => ({ coordinateGetter }),
		[coordinateGetter],
	);

	return useSensors(
		useSensor(PointerSensor, POINTER_SENSOR_OPTIONS),
		useSensor(KeyboardSensor, keyboardSensorOptions),
	);
}
