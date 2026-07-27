// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSystemPrefersDark } from "./use-system-theme";

describe("useSystemPrefersDark", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("observes a preference change that happens while the listener is attached", async () => {
		let matches = false;
		vi.stubGlobal("matchMedia", () => ({
			get matches() {
				return matches;
			},
			media: "(prefers-color-scheme: dark)",
			addEventListener: () => {
				matches = true;
			},
			removeEventListener: vi.fn(),
		}));

		const { result } = renderHook(() => useSystemPrefersDark());

		await waitFor(() => expect(result.current).toBe(true));
	});
});
