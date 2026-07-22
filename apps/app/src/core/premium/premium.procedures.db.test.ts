import { call } from "@orpc/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { requirePremium } from "@/core/premium/premium.access";
import {
	getPremiumStatus,
	requestPremiumSeat,
	revokePremiumSeat,
} from "@/core/premium/premium.procedures";
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

describe("getPremiumStatus", () => {
	it("reports no seat for a fresh user", async () => {
		const status = await call(getPremiumStatus, undefined, { context });
		expect(status).toEqual({ isPremium: false, grantedAt: null });
	});
});

describe("requestPremiumSeat", () => {
	it("grants a seat immediately", async () => {
		const status = await call(requestPremiumSeat, undefined, { context });
		expect(status.isPremium).toBe(true);
		expect(status.grantedAt).not.toBeNull();

		const reread = await call(getPremiumStatus, undefined, { context });
		expect(reread).toEqual(status);
	});

	it("is idempotent: a second request keeps the original grantedAt", async () => {
		const first = await call(requestPremiumSeat, undefined, { context });
		const second = await call(requestPremiumSeat, undefined, { context });
		expect(second).toEqual(first);
	});
});

describe("revokePremiumSeat", () => {
	it("removes a previously granted seat", async () => {
		await call(requestPremiumSeat, undefined, { context });
		const status = await call(revokePremiumSeat, undefined, { context });
		expect(status).toEqual({ isPremium: false, grantedAt: null });

		const reread = await call(getPremiumStatus, undefined, { context });
		expect(reread).toEqual(status);
	});

	it("is idempotent: revoking a user with no seat is a no-op", async () => {
		const status = await call(revokePremiumSeat, undefined, { context });
		expect(status).toEqual({ isPremium: false, grantedAt: null });
	});
});

describe("requirePremium", () => {
	const premiumOnlyProcedure = requirePremium.handler(() => "ok" as const);

	it("rejects a user without a premium seat", async () => {
		await expect(
			call(premiumOnlyProcedure, undefined, { context }),
		).rejects.toMatchObject({ code: "PREMIUM_REQUIRED" });
	});

	it("allows a user with a premium seat through", async () => {
		await call(requestPremiumSeat, undefined, { context });
		await expect(
			call(premiumOnlyProcedure, undefined, { context }),
		).resolves.toBe("ok");
	});

	it("rejects again after the seat is revoked", async () => {
		await call(requestPremiumSeat, undefined, { context });
		await call(revokePremiumSeat, undefined, { context });
		await expect(
			call(premiumOnlyProcedure, undefined, { context }),
		).rejects.toMatchObject({ code: "PREMIUM_REQUIRED" });
	});
});
