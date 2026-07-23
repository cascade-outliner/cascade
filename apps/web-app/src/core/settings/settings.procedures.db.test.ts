import { call } from "@orpc/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { requestPremiumSeat } from "@/core/premium/premium.procedures";
import {
	getSettings,
	updateSettings,
} from "@/core/settings/settings.procedures";
import type { ORPCContext } from "@/orpc/context";
import { createTestUser, deleteTestUser } from "@/test-db/harness";

let userId: string;
let context: ORPCContext;

beforeEach(async () => {
	const testUser = await createTestUser();
	userId = testUser.user.id;
	context = testUser.context;
});

afterEach(async () => {
	await deleteTestUser(userId);
});

describe("updateSettings", () => {
	it("saves a non-premium theme for a non-premium user", async () => {
		const result = await call(updateSettings, { theme: "dark" }, { context });
		expect(result.theme).toBe("dark");
	});

	it("rejects a premium theme for a non-premium user", async () => {
		await expect(
			call(updateSettings, { theme: "dracula" }, { context }),
		).rejects.toMatchObject({ code: "PREMIUM_REQUIRED" });

		const reread = await call(getSettings, undefined, { context });
		expect(reread.theme).toBeUndefined();
	});

	it("rejects a premium lightTheme/darkTheme for a non-premium user", async () => {
		await expect(
			call(updateSettings, { lightTheme: "catppuccin-latte" }, { context }),
		).rejects.toMatchObject({ code: "PREMIUM_REQUIRED" });
		await expect(
			call(updateSettings, { darkTheme: "nord" }, { context }),
		).rejects.toMatchObject({ code: "PREMIUM_REQUIRED" });
	});

	it("allows a premium theme once the user has a premium seat", async () => {
		await call(requestPremiumSeat, undefined, { context });

		const result = await call(
			updateSettings,
			{ theme: "dracula" },
			{ context },
		);
		expect(result.theme).toBe("dracula");
	});

	it("does not block unrelated settings when the theme is untouched", async () => {
		const result = await call(
			updateSettings,
			{ fontSize: "large" },
			{ context },
		);
		expect(result.fontSize).toBe("large");
	});
});
