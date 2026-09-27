import { type Box, boxesIntersect } from "@air/react-drag-to-select";

/** The vertical band of one row, in document coordinates (the virtualizer's `start`/`size`). */
export interface RowBand {
	start: number;
	size: number;
}

/**
 * Indexes of the rows whose band intersects `box`. `box` and `rowsBox` (the
 * rows' viewport, spanning all rows horizontally) are in viewport coordinates,
 * so `scrollY` maps the bands into the same space. Rows count as full-width,
 * whatever their indent.
 */
export function hitRows(
	bands: readonly RowBand[],
	box: Box,
	rowsBox: Box,
	scrollY: number,
): number[] {
	const hits: number[] = [];
	bands.forEach((band, index) => {
		const row: Box = {
			left: rowsBox.left,
			width: rowsBox.width,
			top: band.start - scrollY,
			height: band.size,
		};
		if (boxesIntersect(box, row)) {
			hits.push(index);
		}
	});
	return hits;
}
