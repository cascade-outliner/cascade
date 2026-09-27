import { expect, test } from "../fixtures.ts";

test.use({ onboarded: false });

test.describe("onboarding", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("a first-time user sees the intro step", async ({ onboardingPage }) => {
		await expect(onboardingPage.step("intro")).toBeVisible();
		await expect(onboardingPage.stepperItem("intro")).toHaveAttribute(
			"aria-current",
			"step",
		);
		await expect(onboardingPage.backButton).toBeHidden();
	});

	test("Continue and Back move between steps", async ({ onboardingPage }) => {
		await onboardingPage.continueButton.click();
		await expect(onboardingPage.step("template")).toBeVisible();
		await expect(onboardingPage.stepperItem("template")).toHaveAttribute(
			"aria-current",
			"step",
		);

		await onboardingPage.backButton.click();
		await expect(onboardingPage.step("intro")).toBeVisible();
	});

	test("Enter advances the form", async ({ onboardingPage, page }) => {
		await onboardingPage.continueButton.focus();
		await page.keyboard.press("Enter");
		await expect(onboardingPage.step("template")).toBeVisible();
	});

	test("only the blank template is available", async ({ onboardingPage }) => {
		await onboardingPage.continueButton.click();

		await expect(onboardingPage.template("blank")).toBeChecked();
		await expect(onboardingPage.template("project")).toBeDisabled();
		await expect(onboardingPage.template("journal")).toBeDisabled();
	});

	test.describe("last step", () => {
		test.beforeEach(async ({ onboardingPage }) => {
			await onboardingPage.goToLastStep();
		});

		test("shows a workspace id and that sync is off", async ({
			onboardingPage,
		}) => {
			await expect(onboardingPage.step("workspace")).toBeVisible();
			await expect(onboardingPage.syncDisabledNotice).toBeVisible();
			await expect(onboardingPage.workspaceId).toHaveValue(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
			);
		});

		test("rejects an invalid workspace id", async ({ onboardingPage }) => {
			await onboardingPage.workspaceId.fill("not-an-id");

			await expect(onboardingPage.workspaceId).toHaveAttribute(
				"aria-invalid",
				"true",
			);
			await expect(onboardingPage.workspaceHint).toHaveAttribute(
				"data-state",
				"invalid",
			);
		});

		test("switches to a pasted workspace id", async ({
			onboardingPage,
			page,
		}) => {
			const id = "29636bee-4bf9-4c1e-9a3b-6f2d8e1c0a57";
			await onboardingPage.workspaceId.fill(id);

			await expect(onboardingPage.workspaceHint).toHaveAttribute(
				"data-state",
				"switched",
			);
			await page.reload();
			await onboardingPage.goToLastStep();
			await expect(onboardingPage.workspaceId).toHaveValue(id);
		});

		test("copies the workspace id", async ({
			onboardingPage,
			page,
			context,
		}) => {
			await context.grantPermissions(["clipboard-read", "clipboard-write"]);
			await expect(onboardingPage.workspaceId).not.toHaveValue("");
			const id = await onboardingPage.workspaceId.inputValue();

			await onboardingPage.copyButton.click();

			await expect
				.poll(() => page.evaluate(() => navigator.clipboard.readText()))
				.toBe(id);
		});
	});

	test("finishing opens the empty outline and does not return", async ({
		onboardingPage,
		outlinePage,
		page,
	}) => {
		await onboardingPage.complete();

		await expect(outlinePage.emptyState).toBeVisible();
		await expect(onboardingPage.form).toBeHidden();

		await page.reload();
		await expect(outlinePage.captureInput).toBeVisible();
		await expect(onboardingPage.form).toBeHidden();
	});

	test("an outline with nodes skips onboarding even without the flag", async ({
		onboardingPage,
		outlinePage,
		page,
	}) => {
		await onboardingPage.complete();
		await outlinePage.addNode("Existing work");
		await expect(outlinePage.row("Existing work")).toBeVisible();
		await expect.poll(() => outlinePage.isSaved("Existing work")).toBe(true);

		await page.evaluate(() => localStorage.removeItem("cascade:onboarding"));
		await page.reload();

		await expect(outlinePage.row("Existing work")).toBeVisible();
		await expect(onboardingPage.form).toBeHidden();
	});
});
