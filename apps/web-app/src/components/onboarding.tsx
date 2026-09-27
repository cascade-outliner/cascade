import {
	colors,
	fontSize,
	opacity,
	radius,
	space,
} from "@cascade/theme/tokens.stylex";
import { Button } from "@cascade/ui/button";
import { Kbd } from "@cascade/ui/kbd";
import { CheckIcon, GoogleLogoIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { type FormEvent, useState } from "react";
import { flushSync } from "react-dom";
import { signInWithGoogle, signOut } from "#/lib/auth-client.ts";
import { useSyncConfig } from "#/lib/outline-store.tsx";

const STORAGE_KEY = "cascade:onboarding";

/** Whether onboarding was finished in this browser. */
export function isOnboarded(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) !== null;
	} catch {
		return true;
	}
}

type TemplateId = "blank" | "project" | "journal";

/** Preview lines: indent level, task marker, bar width in %. */
type PreviewLine = [depth: number, task: boolean, width: number];

const TEMPLATES: {
	id: TemplateId;
	title: string;
	description: string;
	enabled: boolean;
	preview: PreviewLine[];
}[] = [
	{
		id: "blank",
		title: "Blank",
		description: "One empty line and a blinking cursor.",
		enabled: true,
		preview: [[0, false, 40]],
	},
	{
		id: "project",
		title: "Project",
		description: "Goals, tasks and notes, nested three deep.",
		enabled: false,
		preview: [
			[0, false, 50],
			[1, true, 60],
			[1, true, 45],
			[2, false, 40],
			[0, false, 35],
			[1, true, 55],
		],
	},
	{
		id: "journal",
		title: "Journal",
		description: "A page per day with today on top.",
		enabled: false,
		preview: [
			[0, false, 30],
			[1, false, 70],
			[1, true, 50],
			[0, false, 30],
			[1, false, 60],
		],
	},
];

const BASICS: { keys: string[]; text: string }[] = [
	{ keys: ["↵"], text: "Type in the bar at the bottom to add a line." },
	{
		keys: ["Drag"],
		text: "Drag a bullet to move a line, or nest it under another.",
	},
	{
		keys: ["Click"],
		text: "Click a bullet to zoom into that line as its own page.",
	},
	{
		keys: ["Right-click"],
		text: "Right-click a line to make it a task, duplicate or delete it.",
	},
	{
		keys: ["⌘", "K"],
		text: "Open the command palette to search and jump anywhere.",
	},
];

/** Runs a state update inside a view transition, where supported. `back` flips the slide direction. */
function transition(update: () => void, back = false) {
	if (!document.startViewTransition) {
		update();
		return;
	}
	document.documentElement.dataset.onboardingBack = String(back);
	document.startViewTransition(() => flushSync(update));
}

const STEPS = [
	{ id: "intro", label: "How it works" },
	{ id: "template", label: "Start with" },
	{ id: "account", label: "Heads up" },
];

const styles = stylex.create({
	page: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		minHeight: "100dvh",
		padding: space["6"],
		boxSizing: "border-box",
	},
	form: {
		display: "flex",
		flexDirection: "column",
		gap: space["6"],
		width: "720px",
		maxWidth: "100%",
	},
	header: {
		display: "flex",
		alignItems: "center",
		flexWrap: "wrap",
		gap: space["3.5"],
	},
	logo: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: "22px",
		height: "22px",
		marginRight: "auto",
		borderRadius: "7px",
		backgroundColor: colors.primary,
	},
	logoDot: {
		width: "6px",
		height: "6px",
		borderRadius: radius.full,
		backgroundColor: colors.onPrimary,
	},
	stepper: {
		display: "flex",
		alignItems: "center",
		gap: space["2"],
		margin: 0,
		padding: 0,
		listStyle: "none",
	},
	step: {
		display: "flex",
		alignItems: "center",
		gap: space["2"],
		color: colors.muted,
		fontSize: fontSize["300"],
	},
	stepCurrent: {
		color: colors.ink,
	},
	stepDot: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: "22px",
		height: "22px",
		borderRadius: radius.full,
		boxShadow: `inset 0 0 0 1px ${colors.borderStrong}`,
		fontFamily: "monospace",
		fontSize: fontSize["200"],
		fontWeight: 600,
	},
	stepDotDone: {
		backgroundColor: colors.primary,
		boxShadow: "none",
		color: colors.onPrimary,
	},
	stepDotCurrent: {
		boxShadow: `inset 0 0 0 1.5px ${colors.primary}`,
		color: colors.primary,
	},
	stepLine: {
		width: "28px",
		height: "1px",
		backgroundColor: colors.borderStrong,
	},
	content: {
		display: "flex",
		flexDirection: "column",
		gap: space["6"],
	},
	intro: {
		display: "flex",
		flexDirection: "column",
		gap: space["1.5"],
	},
	title: {
		margin: 0,
		fontSize: "30px",
		fontWeight: 600,
		letterSpacing: "-0.02em",
	},
	subtitle: {
		margin: 0,
		color: colors.muted,
		fontSize: fontSize["400"],
	},
	templates: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
		gap: space["3.5"],
		margin: 0,
		padding: 0,
		border: "none",
	},
	template: {
		display: "flex",
		flexDirection: "column",
		gap: space["3"],
		padding: space["3.5"],
		borderRadius: radius.xl,
		backgroundColor: colors.white,
		boxShadow: `0 0 0 1px ${colors.border}`,
		cursor: "pointer",
	},
	templateChecked: {
		boxShadow: `0 0 0 2px ${colors.primary}, 0 6px 18px -8px rgba(173, 76, 78, 0.4)`,
	},
	templateDisabled: {
		opacity: opacity.disabled,
		cursor: "not-allowed",
	},
	radio: {
		position: "absolute",
		opacity: 0,
		pointerEvents: "none",
	},
	preview: {
		display: "flex",
		flexDirection: "column",
		gap: "7px",
		height: "112px",
		padding: space["3"],
		boxSizing: "border-box",
		borderRadius: "9px",
		backgroundColor: colors.canvas,
	},
	previewLine: {
		display: "flex",
		alignItems: "center",
		gap: "5px",
	},
	previewBullet: {
		flexShrink: 0,
		width: "7px",
		height: "7px",
		borderRadius: radius.full,
		backgroundColor: colors.inkSubtleHover,
	},
	previewTask: {
		flexShrink: 0,
		width: "7px",
		height: "7px",
		boxSizing: "border-box",
		borderRadius: radius.full,
		border: `1px solid ${colors.borderStrong}`,
	},
	previewBar: {
		height: "5px",
		borderRadius: "3px",
		backgroundColor: colors.inkSubtle,
	},
	templateName: {
		display: "flex",
		alignItems: "center",
		gap: space["2"],
		fontWeight: 600,
	},
	soon: {
		marginLeft: "auto",
		color: colors.muted,
		fontSize: fontSize["200"],
		fontWeight: 500,
	},
	templateDescription: {
		color: colors.muted,
		fontSize: fontSize["300"],
		lineHeight: 1.5,
	},
	basics: {
		display: "flex",
		flexDirection: "column",
		gap: space["1"],
		margin: 0,
		padding: space["2"],
		borderRadius: radius.xl,
		backgroundColor: colors.white,
		boxShadow: `0 0 0 1px ${colors.border}`,
		listStyle: "none",
	},
	basic: {
		display: "flex",
		alignItems: "center",
		gap: space["3"],
		paddingBlock: space["2"],
		paddingInline: space["2.5"],
		fontSize: fontSize["400"],
	},
	basicKeys: {
		display: "flex",
		justifyContent: "flex-end",
		gap: space["0.5"],
		flexShrink: 0,
		width: "88px",
	},
	notice: {
		display: "flex",
		flexDirection: "column",
		gap: space["2.5"],
		margin: 0,
		padding: space["4"],
		borderRadius: radius.xl,
		backgroundColor: colors.primaryMuted,
		fontSize: fontSize["400"],
		lineHeight: 1.6,
	},
	para: {
		margin: 0,
	},
	account: {
		display: "flex",
		alignItems: "center",
		gap: space["3"],
		padding: space["4"],
		borderRadius: radius.xl,
		backgroundColor: colors.white,
		boxShadow: `0 0 0 1px ${colors.border}`,
	},
	accountText: {
		display: "flex",
		flexDirection: "column",
		gap: space["0.5"],
		flex: 1,
		minWidth: 0,
	},
	accountName: {
		fontWeight: 600,
	},
	accountHint: {
		color: colors.muted,
		fontSize: fontSize["300"],
	},
	avatar: {
		flexShrink: 0,
		width: "36px",
		height: "36px",
		borderRadius: radius.full,
		backgroundColor: colors.canvas,
	},
	footer: {
		display: "flex",
		alignItems: "center",
		gap: space["2.5"],
	},
	hint: {
		marginRight: "auto",
		color: colors.muted,
		fontSize: fontSize["200"],
	},
});

function Stepper({ current }: { current: number }) {
	return (
		<ol {...stylex.props(styles.stepper)} data-testid="onboarding-stepper">
			{STEPS.map(({ id, label }, i) => (
				<li
					key={id}
					data-testid={`onboarding-stepper-${id}`}
					{...stylex.props(styles.step, i === current && styles.stepCurrent)}
					aria-current={i === current ? "step" : undefined}
				>
					{i > 0 && <span {...stylex.props(styles.stepLine)} aria-hidden />}
					<span
						{...stylex.props(
							styles.stepDot,
							i < current && styles.stepDotDone,
							i === current && styles.stepDotCurrent,
						)}
						aria-hidden
					>
						{i < current ? <CheckIcon weight="bold" /> : i + 1}
					</span>
					{label}
				</li>
			))}
		</ol>
	);
}

function Preview({ lines }: { lines: PreviewLine[] }) {
	return (
		<div {...stylex.props(styles.preview)} aria-hidden>
			{lines.map(([depth, task, width], i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: static preview
					key={i}
					{...stylex.props(styles.previewLine)}
					style={{ paddingLeft: depth * 12 }}
				>
					<span {...stylex.props(styles.previewBullet)} />
					{task && <span {...stylex.props(styles.previewTask)} />}
					<span
						{...stylex.props(styles.previewBar)}
						style={{ width: `${width}%` }}
					/>
				</div>
			))}
		</div>
	);
}

/** Sign in with Google to sync, or who is signed in already. */
function Account() {
	const config = useSyncConfig();
	const [busy, setBusy] = useState(false);

	if (!config?.enabled) {
		return null;
	}

	function run(action: () => Promise<unknown>) {
		setBusy(true);
		action().catch((error) => {
			console.error("Onboarding: sign-in failed", error);
			setBusy(false);
		});
	}

	if (config.user) {
		return (
			<div {...stylex.props(styles.account)} data-testid="account">
				{config.user.image ? (
					<img
						{...stylex.props(styles.avatar)}
						src={config.user.image}
						alt=""
						referrerPolicy="no-referrer"
					/>
				) : (
					<div {...stylex.props(styles.avatar)} aria-hidden />
				)}
				<div {...stylex.props(styles.accountText)}>
					<span {...stylex.props(styles.accountName)}>{config.user.name}</span>
					<span {...stylex.props(styles.accountHint)}>
						Signed in as {config.user.email}. Your outline syncs to this
						account.
					</span>
				</div>
				<Button
					data-testid="sign-out"
					disabled={busy}
					onClick={() => run(signOut)}
				>
					Sign out
				</Button>
			</div>
		);
	}

	return (
		<div {...stylex.props(styles.account)} data-testid="account">
			<div {...stylex.props(styles.accountText)}>
				<span {...stylex.props(styles.accountName)}>Sync across devices</span>
				<span {...stylex.props(styles.accountHint)}>
					Sign in to keep this outline on the server and open it anywhere.
					Without an account it stays in this browser.
				</span>
			</div>
			<Button
				data-testid="sign-in-google"
				disabled={busy}
				onClick={() => run(signInWithGoogle)}
			>
				<GoogleLogoIcon weight="bold" /> Sign in with Google
			</Button>
		</div>
	);
}

export interface OnboardingProps {
	onDone: () => void;
}

export function Onboarding({ onDone }: OnboardingProps) {
	const [step, setStep] = useState(0);
	const [template, setTemplate] = useState<TemplateId>("blank");
	const config = useSyncConfig();
	const last = STEPS.length - 1;

	function submit(event: FormEvent) {
		event.preventDefault();
		if (step < last) {
			transition(() => setStep(step + 1));
			return;
		}
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ template }));
		} catch {}
		transition(onDone);
	}

	return (
		<div {...stylex.props(styles.page)}>
			<form
				{...stylex.props(styles.form)}
				data-testid="onboarding"
				onSubmit={submit}
				onKeyDown={(event) => {
					if (step !== 1) return;
					const picked = TEMPLATES[Number(event.key) - 1];
					if (picked?.enabled) setTemplate(picked.id);
				}}
			>
				<div
					{...stylex.props(styles.header)}
					style={{ viewTransitionName: "onboarding-header" }}
				>
					<div {...stylex.props(styles.logo)} aria-hidden>
						<div {...stylex.props(styles.logoDot)} />
					</div>
					<Stepper current={step} />
				</div>

				<div
					{...stylex.props(styles.content)}
					data-testid={`onboarding-step-${STEPS[step].id}`}
					style={{ viewTransitionName: "onboarding-content" }}
				>
					{step === 0 && (
						<>
							<div {...stylex.props(styles.intro)}>
								<h1 {...stylex.props(styles.title)}>Everything is a line</h1>
								<p {...stylex.props(styles.subtitle)}>
									Cascade is an outliner. Lines nest inside lines, as deep as
									you like.
								</p>
							</div>
							<ul {...stylex.props(styles.basics)}>
								{BASICS.map(({ keys, text }) => (
									<li key={text} {...stylex.props(styles.basic)}>
										<span {...stylex.props(styles.basicKeys)}>
											{keys.map((key) => (
												<Kbd key={key}>{key}</Kbd>
											))}
										</span>
										{text}
									</li>
								))}
							</ul>
						</>
					)}

					{step === 1 && (
						<>
							<div {...stylex.props(styles.intro)}>
								<h1 {...stylex.props(styles.title)}>
									How do you want to start?
								</h1>
								<p {...stylex.props(styles.subtitle)}>
									You can change everything later. Templates are just nodes.
								</p>
							</div>
							<fieldset
								{...stylex.props(styles.templates)}
								aria-label="Template"
							>
								{TEMPLATES.map((t, i) => (
									<label
										key={t.id}
										{...stylex.props(
											styles.template,
											template === t.id && styles.templateChecked,
											!t.enabled && styles.templateDisabled,
										)}
									>
										<input
											type="radio"
											name="template"
											value={t.id}
											data-testid={`onboarding-template-${t.id}`}
											checked={template === t.id}
											disabled={!t.enabled}
											onChange={() => setTemplate(t.id)}
											{...stylex.props(styles.radio)}
										/>
										<Preview lines={t.preview} />
										<span {...stylex.props(styles.templateName)}>
											{t.title}
											<Kbd>{i + 1}</Kbd>
											{!t.enabled && (
												<span {...stylex.props(styles.soon)}>Coming soon</span>
											)}
										</span>
										<span {...stylex.props(styles.templateDescription)}>
											{t.description}
										</span>
									</label>
								))}
							</fieldset>
						</>
					)}

					{step === 2 && (
						<>
							<div {...stylex.props(styles.intro)}>
								<h1 {...stylex.props(styles.title)}>Still in development</h1>
								<p {...stylex.props(styles.subtitle)}>
									Cascade is early. Expect rough edges.
								</p>
							</div>
							<div {...stylex.props(styles.notice)}>
								<p {...stylex.props(styles.para)}>
									Your outline is saved in this browser first: every edit lands
									here before anything else. Sign in with Google and Cascade
									syncs it to the server in the background.
								</p>
								{config !== null && !config.enabled && (
									<p
										{...stylex.props(styles.para)}
										data-testid="sync-disabled-notice"
									>
										Sync isn't configured on this server, so for now your notes
										stay in this browser only.
									</p>
								)}
								<p {...stylex.props(styles.para)}>
									Templates, import and more are on the way.
								</p>
							</div>
							<Account />
						</>
					)}
				</div>

				<div
					{...stylex.props(styles.footer)}
					style={{ viewTransitionName: "onboarding-footer" }}
				>
					<span {...stylex.props(styles.hint)}>
						{step === 1 && (
							<>
								<Kbd>1</Kbd> to pick
							</>
						)}
					</span>
					{step > 0 && (
						<Button
							data-testid="onboarding-back"
							onClick={() => transition(() => setStep(step - 1), true)}
						>
							Back
						</Button>
					)}
					<Button
						type="submit"
						variant="primary"
						data-testid={
							step < last ? "onboarding-continue" : "onboarding-start"
						}
					>
						{step < last ? "Continue" : "Start writing"} ↵
					</Button>
				</div>
			</form>
		</div>
	);
}
