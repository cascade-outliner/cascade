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
		await expect(onboardingPage.stepperItem("intro")).toHaveAttribute(
			"aria-current",
			"step",
		);
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

	test("the last step says that sync is off and offers no sign-in", async ({
		onboardingPage,
	}) => {
		await onboardingPage.goToLastStep();

		await expect(onboardingPage.step("account")).toBeVisible();
		await expect(onboardingPage.syncDisabledNotice).toBeVisible();
		await expect(onboardingPage.account).toBeHidden();
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

// Outside the describe: its beforeEach would load "/" first and waste a navigation.
test("returning from sign-in opens the account step and drops the param", async ({
	onboardingPage,
	page,
}) => {
	await page.goto("/?onboarding=account");

	await expect(onboardingPage.step("account")).toBeVisible();
	await expect(onboardingPage.stepperItem("account")).toHaveAttribute(
		"aria-current",
		"step",
	);
	await expect(page).toHaveURL("/");
});
