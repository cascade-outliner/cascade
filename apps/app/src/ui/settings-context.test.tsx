// @vitest-environment jsdom
import { toast } from "@cascade/ui/toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { m } from "#/paraglide/messages.js";
import { orpc } from "@/orpc/client";
import { SettingsProvider, useSettings } from "@/ui/settings-context";

const settingsQueryKey = ["settings", "get"];
const updateMock = vi.fn();

vi.mock("@/orpc/client", () => ({
	orpc: {
		settings: {
			get: { queryOptions: vi.fn() },
			update: { mutationOptions: vi.fn() },
		},
	},
}));

vi.mock("@cascade/ui/toast", () => ({
	toast: { error: vi.fn() },
}));

function mockRemoteSettings(value: unknown) {
	vi.mocked(orpc.settings.get.queryOptions).mockReturnValue({
		queryKey: settingsQueryKey,
		queryFn: () => Promise.resolve(value),
	} as never);
}

function renderSettings(queryClient: QueryClient) {
	return renderHook(() => useSettings(), {
		wrapper: ({ children }) => (
			<QueryClientProvider client={queryClient}>
				<SettingsProvider>{children}</SettingsProvider>
			</QueryClientProvider>
		),
	});
}

describe("SettingsProvider", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		updateMock.mockResolvedValue({});
		document.head.innerHTML = "";
		document.documentElement.className = "";
		delete document.documentElement.dataset.theme;
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: false,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}));
		vi.mocked(orpc.settings.update.mutationOptions).mockImplementation(
			(config) =>
				({
					mutationFn: (patch: unknown) => updateMock(patch),
					...config,
				}) as never,
		);
	});

	it("passes through valid remote settings without resetting anything", async () => {
		mockRemoteSettings({ theme: "dracula" });
		const queryClient = new QueryClient();

		const { result } = renderSettings(queryClient);

		await waitFor(() => {
			expect(result.current.settings.theme).toBe("dracula");
		});
		expect(toast.error).not.toHaveBeenCalled();
		expect(updateMock).not.toHaveBeenCalled();
	});

	it("notifies the user and resets to defaults when the stored theme is invalid", async () => {
		mockRemoteSettings({ theme: "not-a-real-theme" });
		const queryClient = new QueryClient();

		const { result } = renderSettings(queryClient);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(m.settings_invalid_reset());
		});
		expect(updateMock).toHaveBeenCalledWith(
			expect.objectContaining({ theme: "system", font: "bitter" }),
		);
		// The broken value is never applied to the UI while the reset is pending.
		expect(result.current.settings.theme).toBe("system");
	});

	it("notifies the user and resets to defaults when a stored field has the wrong type", async () => {
		mockRemoteSettings({ indentSize: "not-a-number" });
		const queryClient = new QueryClient();

		renderSettings(queryClient);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(m.settings_invalid_reset());
		});
		expect(updateMock).toHaveBeenCalledTimes(1);
	});

	it("does not treat an empty stored settings object as invalid", async () => {
		mockRemoteSettings({});
		const queryClient = new QueryClient();

		const { result } = renderSettings(queryClient);

		await waitFor(() => {
			expect(result.current.settings.font).toBe("bitter");
		});
		expect(result.current.settings.fontSize).toBe("default");
		expect(toast.error).not.toHaveBeenCalled();
		expect(updateMock).not.toHaveBeenCalled();
	});

	it("creates and updates the theme-color meta tag from the active theme background", async () => {
		mockRemoteSettings({});
		const queryClient = new QueryClient();
		vi.spyOn(window, "getComputedStyle").mockImplementation((() => ({
			getPropertyValue: (property: string) => {
				if (document.documentElement.classList.contains("dark")) {
					if (property === "--color-ink") return "#2e3440";
					if (property === "--color-canvas") return "#eceff4";
				}
				if (property === "--color-canvas") return "#FCF5EE";
				if (property === "--color-ink") return "#2b2d33";
				return "";
			},
		})) as unknown as typeof window.getComputedStyle);

		const { result } = renderSettings(queryClient);

		await waitFor(() => {
			expect(
				document.head
					.querySelector('meta[name="theme-color"]')
					?.getAttribute("content"),
			).toBe("#FCF5EE");
		});

		result.current.setSetting("theme", "nord");

		await waitFor(() => {
			expect(
				document.head
					.querySelector('meta[name="theme-color"]')
					?.getAttribute("content"),
			).toBe("#2e3440");
		});
	});
});
