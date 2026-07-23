import { test as base } from "@playwright/test";
import { createOrpcClient, type OrpcClient } from "./orpc-client";

interface Fixtures {
	orpcClient: OrpcClient;
}

export const test = base.extend<Fixtures>({
	orpcClient: async ({ context }, use) => {
		await use(createOrpcClient(context));
	},
});

export { expect } from "@playwright/test";
