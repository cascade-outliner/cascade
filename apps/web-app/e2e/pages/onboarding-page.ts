import type { Locator, Page } from "@playwright/test";

export type StepId = "intro" | "template" | "account";
export type TemplateId = "blank" | "project" | "journal";

export class OnboardingPage {
	readonly form: Locator;
	readonly continueButton: Locator;
	readonly backButton: Locator;
	readonly startButton: Locator;
	readonly account: Locator;
	readonly syncDisabledNotice: Locator;

	constructor(readonly page: Page) {
		this.form = page.getByTestId("onboarding");
		this.continueButton = page.getByTestId("onboarding-continue");
		this.backButton = page.getByTestId("onboarding-back");
		this.startButton = page.getByTestId("onboarding-start");
		this.account = page.getByTestId("account");
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

	/** Deletes the stored "onboarding finished" flag, as if this browser never finished it. */
	async forgetOnboarding() {
		await this.page.evaluate(
			() =>
				new Promise<void>((resolve) => {
					const open = indexedDB.open("cascade");
					open.onsuccess = () => {
						const tx = open.result.transaction("meta", "readwrite");
						tx.objectStore("meta").delete("onboarding");
						tx.oncomplete = () => {
							open.result.close();
							resolve();
						};
					};
				}),
		);
	}
}
