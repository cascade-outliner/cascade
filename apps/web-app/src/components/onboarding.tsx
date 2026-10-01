import { Button } from "@cascade/ui/button";
import { Kbd } from "@cascade/ui/kbd";
import { CheckIcon, GoogleLogoIcon } from "@phosphor-icons/react";
import { type FormEvent, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { signInWithGoogle, signOut } from "#/lib/auth-client.ts";
import { useSyncConfig } from "#/lib/outline-store.tsx";
import { css, cva, keyframes, viewTransition } from "#/styled-system/css";

/** Query param the Google sign-in callback lands on, to reopen the account step. */
const RETURN_PARAM = "onboarding";

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

// Header and footer glide to their new spot; the step slides in the direction
// of travel (`--onboarding-shift` flips in panda.config's globalCss).
const slideOut = keyframes({
	to: {
		opacity: "hidden",
		transform: "translateX(calc(var(--onboarding-shift, 24px) * -1))",
	},
});
const slideIn = keyframes({
	from: {
		opacity: "hidden",
		transform: "translateX(var(--onboarding-shift, 24px))",
	},
});
const glide = viewTransition({
	group: {
		_motionSafe: {
			animationDuration: "300",
			animationTimingFunction: "out",
		},
	},
});
const slide = viewTransition({
	old: { _motionSafe: { animation: `180ms ease-in both ${slideOut}` } },
	new: {
		_motionSafe: {
			animation: `280ms cubic-bezier(0.2, 0, 0, 1) 60ms both ${slideIn}`,
		},
	},
});

const styles = {
	page: css({
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		minHeight: "dvh",
		padding: "6",
		boxSizing: "border-box",
	}),
	form: css({
		display: "flex",
		flexDirection: "column",
		gap: "6",
		width: "form",
		maxWidth: "full",
	}),
	header: css({
		display: "flex",
		alignItems: "center",
		flexWrap: "wrap",
		gap: "3.5",
		viewTransitionClass: glide,
	}),
	logo: css({
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: "control.sm",
		height: "control.sm",
		marginRight: "auto",
		borderRadius: "[7px]",
		backgroundColor: "primary",
	}),
	logoDot: css({
		width: "dot.lg",
		height: "dot.lg",
		borderRadius: "full",
		backgroundColor: "onPrimary",
	}),
	stepper: css({
		display: "flex",
		alignItems: "center",
		gap: "2",
		margin: "0",
		padding: "0",
		listStyle: "none",
	}),
	stepLine: css({
		width: "control.lg",
		height: "hairline",
		backgroundColor: "borderStrong",
	}),
	content: css({
		display: "flex",
		flexDirection: "column",
		gap: "6",
		viewTransitionClass: slide,
	}),
	intro: css({
		display: "flex",
		flexDirection: "column",
		gap: "1.5",
	}),
	title: css({
		margin: "0",
		fontSize: "1000",
		fontWeight: 600,
		letterSpacing: "-0.02em",
	}),
	subtitle: css({
		margin: "0",
		color: "muted",
		fontSize: "400",
	}),
	templates: css({
		display: "grid",
		gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
		gap: "3.5",
		margin: "0",
		padding: "0",
		border: "none",
	}),
	radio: css({
		position: "absolute",
		opacity: "hidden",
		pointerEvents: "none",
	}),
	preview: css({
		display: "flex",
		flexDirection: "column",
		gap: "[7px]",
		height: "[112px]",
		padding: "3",
		boxSizing: "border-box",
		borderRadius: "[9px]",
		backgroundColor: "canvas",
	}),
	previewLine: css({
		display: "flex",
		alignItems: "center",
		gap: "[5px]",
	}),
	previewBullet: css({
		flexShrink: 0,
		width: "[7px]",
		height: "[7px]",
		borderRadius: "full",
		backgroundColor: "inkSubtleHover",
	}),
	previewTask: css({
		flexShrink: 0,
		width: "[7px]",
		height: "[7px]",
		boxSizing: "border-box",
		borderRadius: "full",
		border: "1px solid token(colors.borderStrong)",
	}),
	previewBar: css({
		height: "[5px]",
		borderRadius: "xs",
		backgroundColor: "inkSubtle",
	}),
	templateName: css({
		display: "flex",
		alignItems: "center",
		gap: "2",
		fontWeight: 600,
	}),
	soon: css({
		marginLeft: "auto",
		color: "muted",
		fontSize: "200",
		fontWeight: 500,
	}),
	templateDescription: css({
		color: "muted",
		fontSize: "300",
		lineHeight: "normal",
	}),
	basics: css({
		display: "flex",
		flexDirection: "column",
		gap: "1",
		margin: "0",
		padding: "2",
		borderRadius: "xl",
		backgroundColor: "white",
		boxShadow: "hairline",
		listStyle: "none",
	}),
	basic: css({
		display: "flex",
		alignItems: "center",
		gap: "3",
		paddingBlock: "2",
		paddingInline: "2.5",
		fontSize: "400",
	}),
	basicKeys: css({
		display: "flex",
		justifyContent: "flex-end",
		gap: "0.5",
		flexShrink: 0,
		width: "[88px]",
	}),
	notice: css({
		display: "flex",
		flexDirection: "column",
		gap: "2.5",
		margin: "0",
		padding: "4",
		borderRadius: "xl",
		backgroundColor: "primaryMuted",
		fontSize: "400",
		lineHeight: "relaxed",
	}),
	para: css({
		margin: "0",
	}),
	account: css({
		display: "flex",
		alignItems: "center",
		gap: "3",
		padding: "4",
		borderRadius: "xl",
		backgroundColor: "white",
		boxShadow: "hairline",
	}),
	accountText: css({
		display: "flex",
		flexDirection: "column",
		gap: "0.5",
		flex: "1",
		minWidth: "0",
	}),
	accountName: css({
		lineClamp: 1,
		fontWeight: 600,
	}),
	accountHint: css({
		color: "muted",
		fontSize: "300",
	}),
	avatar: css({
		flexShrink: 0,
		width: "control.2xl",
		height: "control.2xl",
		borderRadius: "full",
		backgroundColor: "canvas",
	}),
	footer: css({
		display: "flex",
		alignItems: "center",
		gap: "2.5",
		viewTransitionClass: glide,
	}),
	hint: css({
		marginRight: "auto",
		color: "muted",
		fontSize: "200",
	}),
};

const step = cva({
	base: {
		display: "flex",
		alignItems: "center",
		gap: "2",
		color: "muted",
		fontSize: "300",
	},
	variants: {
		current: {
			true: { color: "ink" },
		},
	},
});

const stepDot = cva({
	base: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: "control.sm",
		height: "control.sm",
		borderRadius: "full",
		boxShadow: "hairlineInset",
		fontFamily: "mono",
		fontSize: "200",
		fontWeight: 600,
	},
	variants: {
		state: {
			todo: {},
			done: {
				backgroundColor: "primary",
				boxShadow: "none",
				color: "onPrimary",
			},
			current: {
				boxShadow: "ringInset",
				color: "primary",
			},
		},
	},
});

const template = cva({
	base: {
		display: "flex",
		flexDirection: "column",
		gap: "3",
		padding: "3.5",
		borderRadius: "xl",
		backgroundColor: "white",
		boxShadow: "hairline",
		cursor: "pointer",
	},
	variants: {
		checked: {
			true: {
				boxShadow:
					"[token(shadows.ring), 0 6px 18px -8px rgba(173, 76, 78, 0.4)]",
			},
		},
		disabled: {
			true: {
				opacity: "disabled",
				cursor: "not-allowed",
			},
		},
	},
});

function Stepper({ current }: { current: number }) {
	return (
		<ol className={styles.stepper} data-testid="onboarding-stepper">
			{STEPS.map(({ id, label }, i) => (
				<li
					key={id}
					data-testid={`onboarding-stepper-${id}`}
					className={step({ current: i === current })}
					aria-current={i === current ? "step" : undefined}
				>
					{i > 0 && <span className={styles.stepLine} aria-hidden />}
					<span
						className={stepDot({
							state: i < current ? "done" : i === current ? "current" : "todo",
						})}
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
		<div className={styles.preview} aria-hidden>
			{lines.map(([depth, task, width], i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: static preview
					key={i}
					className={styles.previewLine}
					style={{ paddingLeft: depth * 12 }}
				>
					<span className={styles.previewBullet} />
					{task && <span className={styles.previewTask} />}
					<span className={styles.previewBar} style={{ width: `${width}%` }} />
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
			<div className={styles.account} data-testid="account">
				{config.user.image ? (
					<img
						className={styles.avatar}
						src={config.user.image}
						alt=""
						referrerPolicy="no-referrer"
					/>
				) : (
					<div className={styles.avatar} aria-hidden />
				)}
				<div className={styles.accountText}>
					<span className={styles.accountName}>{config.user.name}</span>
					<span className={styles.accountHint}>
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
		<div className={styles.account} data-testid="account">
			<div className={styles.accountText}>
				<span className={styles.accountName}>Sync across devices</span>
				<span className={styles.accountHint}>
					Sign in to keep this outline on the server and open it anywhere.
					Without an account it stays in this browser.
				</span>
			</div>
			<Button
				data-testid="sign-in-google"
				disabled={busy}
				onClick={() =>
					run(() =>
						signInWithGoogle(`${location.pathname}?${RETURN_PARAM}=account`),
					)
				}
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
	const [step, setStep] = useState(() =>
		new URLSearchParams(location.search).get(RETURN_PARAM) === "account"
			? STEPS.length - 1
			: 0,
	);
	const [templateId, setTemplate] = useState<TemplateId>("blank");
	const config = useSyncConfig();
	const last = STEPS.length - 1;

	useEffect(() => {
		const url = new URL(location.href);
		if (!url.searchParams.has(RETURN_PARAM)) return;
		url.searchParams.delete(RETURN_PARAM);
		history.replaceState(history.state, "", url);
	}, []);

	function submit(event: FormEvent) {
		event.preventDefault();
		if (step < last) {
			transition(() => setStep(step + 1));
			return;
		}
		transition(onDone);
	}

	return (
		<div className={styles.page}>
			<form
				className={styles.form}
				data-testid="onboarding"
				onSubmit={submit}
				onKeyDown={(event) => {
					if (step !== 1) return;
					const picked = TEMPLATES[Number(event.key) - 1];
					if (picked?.enabled) setTemplate(picked.id);
				}}
			>
				<div
					className={styles.header}
					style={{ viewTransitionName: "onboarding-header" }}
				>
					<div className={styles.logo} aria-hidden>
						<div className={styles.logoDot} />
					</div>
					<Stepper current={step} />
				</div>

				<div
					className={styles.content}
					data-testid={`onboarding-step-${STEPS[step].id}`}
					style={{ viewTransitionName: "onboarding-content" }}
				>
					{step === 0 && (
						<>
							<div className={styles.intro}>
								<h1 className={styles.title}>Everything is a line</h1>
								<p className={styles.subtitle}>
									Cascade is an outliner. Lines nest inside lines, as deep as
									you like.
								</p>
							</div>
							<ul className={styles.basics}>
								{BASICS.map(({ keys, text }) => (
									<li key={text} className={styles.basic}>
										<span className={styles.basicKeys}>
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
							<div className={styles.intro}>
								<h1 className={styles.title}>How do you want to start?</h1>
								<p className={styles.subtitle}>
									You can change everything later. Templates are just nodes.
								</p>
							</div>
							<fieldset className={styles.templates} aria-label="Template">
								{TEMPLATES.map((t, i) => (
									<label
										key={t.id}
										className={template({
											checked: templateId === t.id,
											disabled: !t.enabled,
										})}
									>
										<input
											type="radio"
											name="template"
											value={t.id}
											data-testid={`onboarding-template-${t.id}`}
											checked={templateId === t.id}
											disabled={!t.enabled}
											onChange={() => setTemplate(t.id)}
											className={styles.radio}
										/>
										<Preview lines={t.preview} />
										<span className={styles.templateName}>
											{t.title}
											<Kbd>{i + 1}</Kbd>
											{!t.enabled && (
												<span className={styles.soon}>Coming soon</span>
											)}
										</span>
										<span className={styles.templateDescription}>
											{t.description}
										</span>
									</label>
								))}
							</fieldset>
						</>
					)}

					{step === 2 && (
						<>
							<div className={styles.intro}>
								<h1 className={styles.title}>Still in development</h1>
								<p className={styles.subtitle}>
									Cascade is early. Expect rough edges.
								</p>
							</div>
							<div className={styles.notice}>
								<p className={styles.para}>
									Your outline is saved in this browser first: every edit lands
									here before anything else. Sign in with Google and Cascade
									syncs it to the server in the background.
								</p>
								{config !== null && !config.enabled && (
									<p className={styles.para} data-testid="sync-disabled-notice">
										Sync isn't configured on this server, so for now your notes
										stay in this browser only.
									</p>
								)}
								<p className={styles.para}>
									Templates, import and more are on the way.
								</p>
							</div>
							<Account />
						</>
					)}
				</div>

				<div
					className={styles.footer}
					style={{ viewTransitionName: "onboarding-footer" }}
				>
					<span className={styles.hint}>
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
