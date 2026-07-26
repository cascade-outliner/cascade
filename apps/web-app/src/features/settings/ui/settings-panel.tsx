import type { ReactNode } from "react";

interface SettingsSectionProps {
	title: string;
	description?: string;
	children: ReactNode;
	tone?: "default" | "danger";
}

export function SettingsSection({
	title,
	description,
	children,
	tone = "default",
}: SettingsSectionProps) {
	return (
		<section className="mt-8">
			<div className="mb-3">
				<h3
					className={
						tone === "danger"
							? "text-sm font-semibold text-danger"
							: "text-sm font-semibold"
					}
				>
					{title}
				</h3>
				{description && (
					<p className="mt-0.5 text-sm text-ink/55 dark:text-surface/55">
						{description}
					</p>
				)}
			</div>
			<div
				className={
					tone === "danger"
						? "overflow-hidden rounded-xl border border-danger/30 bg-danger/5"
						: "overflow-hidden rounded-xl border border-ink/10 bg-white dark:border-surface/15 dark:bg-surface/5"
				}
			>
				{children}
			</div>
		</section>
	);
}

interface SettingsRowProps {
	title: string;
	description?: string;
	children: ReactNode;
}

export function SettingsRow({
	title,
	description,
	children,
}: SettingsRowProps) {
	return (
		<div className="flex min-h-16 flex-col justify-center gap-3 border-b border-ink/10 px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-surface/15">
			<div className="min-w-0">
				<div className="text-sm font-medium">{title}</div>
				{description && (
					<div className="mt-0.5 text-sm text-ink/55 dark:text-surface/55">
						{description}
					</div>
				)}
			</div>
			<div className="shrink-0 self-start sm:self-auto">{children}</div>
		</div>
	);
}

export function SettingsPageDescription({ children }: { children: ReactNode }) {
	return (
		<p className="max-w-xl text-sm leading-relaxed text-ink/60 dark:text-surface/60">
			{children}
		</p>
	);
}
