import { describe, expect, it } from "vitest";
import {
	dialogBackdropMotion,
	dialogPanelMotion,
	dialogPopupMotion,
} from "./dialog-motion";
import { overlayPopupMotion } from "./overlay-motion";

describe("overlay motion contracts", () => {
	it("keeps Base UI enter and interrupted-exit states cancellable", () => {
		expect(overlayPopupMotion).toContain("data-starting-style:opacity-0");
		expect(overlayPopupMotion).toContain("data-ending-style:opacity-0");
		expect(overlayPopupMotion).not.toContain("animate-");

		const popup = dialogPopupMotion();
		expect(popup).toContain("data-starting-style:opacity-0");
		expect(popup).toContain("data-ending-style:opacity-0");
		expect(popup).not.toContain("animate-");
	});

	it("uses faster exits so Base UI can unmount promptly", () => {
		expect(overlayPopupMotion).toContain("duration-small-enter");
		expect(overlayPopupMotion).toContain(
			"data-ending-style:duration-small-exit",
		);

		expect(dialogBackdropMotion()).toContain("duration-medium-enter");
		expect(dialogBackdropMotion()).toContain(
			"data-ending-style:duration-medium-exit",
		);
		expect(dialogPopupMotion()).toContain("duration-medium-enter");
		expect(dialogPopupMotion()).toContain(
			"data-ending-style:duration-medium-exit",
		);
		expect(dialogPanelMotion({ phase: "enter" })).toContain(
			"duration-medium-enter",
		);
		expect(dialogPanelMotion({ phase: "exit" })).toContain(
			"duration-medium-exit",
		);
	});

	it("neutralizes decorative transforms under reduced motion", () => {
		expect(overlayPopupMotion).toContain("motion-reduce:transition-opacity");
		expect(overlayPopupMotion).toContain(
			"motion-reduce:data-ending-style:scale-100",
		);

		for (const variant of ["centered", "fullscreen", "drawer-right"] as const) {
			const popup = dialogPopupMotion({ variant });
			expect(popup).toContain("motion-reduce:transition-opacity");
			expect(popup).toContain("motion-reduce:data-ending-style:");
		}

		expect(dialogPanelMotion({ phase: "enter" })).toContain(
			"motion-reduce:transition-[opacity,visibility]",
		);
	});

	it("preserves desktop centering throughout fullscreen panel exit", () => {
		const popup = dialogPopupMotion({ variant: "fullscreen" });
		expect(popup).toContain("sm:data-starting-style:-translate-y-1/2");
		expect(popup).toContain("sm:data-ending-style:-translate-y-1/2");
		expect(popup).not.toContain("sm:data-ending-style:translate-y-0");
	});
});
