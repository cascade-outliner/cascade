import { expect, test } from "../fixtures.ts";

test.describe("feature flags", () => {
	test("a feature the server can't provide stays off", async ({
		outlinePage,
	}) => {
		await outlinePage.goto();
		await outlinePage.captureInput.fill("Call the landlord and pay the rent");

		await expect(
			outlinePage.page.getByRole("button", { name: /split/i }),
		).toHaveCount(0);
	});

	test("a user override turns a feature off", async ({
		featureFlagsApi,
		outlinePage,
		slashMenu,
	}) => {
		await featureFlagsApi.setOverrides({ slashCommands: false });
		await outlinePage.goto();
		await outlinePage.addNode("Buy milk");

		await outlinePage.captureInput.fill("/");
		await expect(slashMenu.menu).toBeHidden();
		await slashMenu.openIn(outlinePage.row("Buy milk"), "task");
		await expect(slashMenu.menu).toBeHidden();
		await expect(slashMenu.editor(outlinePage.row("Buy milk"))).toHaveText(
			"Buy milk /task",
		);
	});

	test("a malformed override is ignored", async ({
		featureFlagsApi,
		outlinePage,
		slashMenu,
	}) => {
		await featureFlagsApi.setOverrides({ slashCommands: "nope" });
		await outlinePage.goto();

		await outlinePage.captureInput.fill("/");
		await expect(slashMenu.menu).toBeVisible();
	});

	test("a flag pinned by the server's environment is off", async ({
		featureFlagsApi,
		outlinePage,
		slashMenu,
	}) => {
		await featureFlagsApi.respond({
			slashCommands: {
				value: false,
				reason: "Turned off by FEATURE_SLASH_COMMANDS",
			},
		});
		await outlinePage.goto();

		await outlinePage.captureInput.fill("/");
		await expect(slashMenu.menu).toBeHidden();
	});

	test("a server-pinned value wins over a user override", async ({
		featureFlagsApi,
		outlinePage,
		slashMenu,
	}) => {
		await featureFlagsApi.setOverrides({ slashCommands: false });
		await featureFlagsApi.respond({
			slashCommands: {
				value: true,
				reason: "Turned on by FEATURE_SLASH_COMMANDS",
			},
		});
		await outlinePage.goto();

		await outlinePage.captureInput.fill("/");
		await expect(slashMenu.menu).toBeVisible();
	});
});
