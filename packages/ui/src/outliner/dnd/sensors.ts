import type { Row } from "@cascade/data";
import {
	KeyboardCode,
	type KeyboardCoordinateGetter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { useCallback, useMemo } from "react";
import { INDENT } from "../layout";

const POINTER_SENSOR_OPTIONS = { activationConstraint: { distance: 4 } };

export function useOutlineSensors(rows: Row[]) {
	const rowIds = useMemo(() => rows.map((row) => row.node.id), [rows]);

	const coordinateGetter: KeyboardCoordinateGetter = useCallback(
		(event, { active, currentCoordinates, context }) => {
			switch (event.code) {
				case "ArrowRight":
					return { x: currentCoordinates.x + INDENT, y: currentCoordinates.y };
				case "ArrowLeft":
					return { x: currentCoordinates.x - INDENT, y: currentCoordinates.y };
				case "ArrowDown":
				case "ArrowUp": {
					const { collisionRect, droppableRects } = context;
					const activeIndex = rowIds.indexOf(String(active));
					const step = event.code === "ArrowDown" ? 1 : -1;
					const targetId =
						activeIndex < 0 ? undefined : rowIds[activeIndex + step];
					const targetRect =
						targetId === undefined ? undefined : droppableRects.get(targetId);
					if (!targetRect || !collisionRect) {
						return undefined;
					}
					// Land on the adjacent row's real measured rect instead of a fixed
					// row-height guess, so closestCenter resolves to it even when rows
					// have non-uniform (e.g. wrapped) heights.
					return {
						x: currentCoordinates.x,
						y:
							targetRect.top + targetRect.height / 2 - collisionRect.height / 2,
					};
				}
			}
			return undefined;
		},
		[rowIds],
	);
	const keyboardSensorOptions = useMemo(
		() => ({
			coordinateGetter,
			keyboardCodes: {
				start: [KeyboardCode.Space],
				cancel: [KeyboardCode.Esc],
				end: [KeyboardCode.Space],
			},
		}),
		[coordinateGetter],
	);

	return useSensors(
		useSensor(PointerSensor, POINTER_SENSOR_OPTIONS),
		useSensor(KeyboardSensor, keyboardSensorOptions),
	);
}
