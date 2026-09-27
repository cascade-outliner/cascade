import type { Locator, Page } from "@playwright/test";

export type StepId = "intro" | "template" | "workspace";
export type TemplateId = "blank" | "project" | "journal";

export class OnboardingPage {
	readonly form: Locator;
	readonly continueButton: Locator;
	readonly backButton: Locator;
	readonly startButton: Locator;
	readonly workspaceId: Locator;
	readonly workspaceHint: Locator;
	readonly copyButton: Locator;
	readonly syncDisabledNotice: Locator;

	constructor(readonly page: Page) {
		this.form = page.getByTestId("onboarding");
		this.continueButton = page.getByTestId("onboarding-continue");
		this.backButton = page.getByTestId("onboarding-back");
		this.startButton = page.getByTestId("onboarding-start");
		this.workspaceId = page.getByTestId("workspace-id");
		this.workspaceHint = page.getByTestId("workspace-id-hint");
		this.copyButton = page.getByTestId("workspace-id-copy");
		this.syncDisabledNotice = page.getByTestId("sync-disabled-notice");
	}

	/** The content of one step; visible only while it's the current step. */
	step(id: StepId): Locator {
		return this.page.getByTestId(`onboarding-step-${id}`);
	}

	stepperItem(id: StepId): Locator {
		return this.page.getByTestId(`onboarding-stepper-${id}`);
	}

	template(id: TemplateId): Locator {
		return this.page.getByTestId(`onboarding-template-${id}`);
	}

	/** Clicks through to the last step. */
	async goToLastStep() {
		await this.continueButton.click();
		await this.continueButton.click();
		await this.startButton.waitFor();
	}

	/** Runs the whole flow with the defaults. */
	async complete() {
		await this.goToLastStep();
		await this.startButton.click();
	}
}
