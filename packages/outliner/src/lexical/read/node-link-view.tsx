import { Input } from "@cascade/ui/input";
import { Popover, PopoverContent } from "@cascade/ui/popover";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { type ReactNode, useRef, useState } from "react";
import { useOutlinerLabels } from "../../labels-context";
import { MAX_URL_LENGTH, normalizeHttpUrl } from "../link-url";

export type OnSaveLink = (
	path: number[],
	update: { text: string; url: string },
) => void;

const anchorClassName =
	"text-redleather underline decoration-redleather/40 underline-offset-2 hover:decoration-redleather dark:text-peach dark:decoration-peach/40 dark:hover:decoration-peach";

/** Small trailing icon that always opens the URL directly in a new tab. */
function OpenLinkIcon({ url, label }: { url: string; label: string }) {
	return (
		<a
			href={url}
			target="_blank"
			rel="noreferrer"
			aria-label={label}
			title={url}
			className="inline-block align-[-0.1em] ml-0.5 text-redleather hover:text-redleather/70 dark:text-peach dark:hover:text-peach/70"
			onClick={(event) => event.stopPropagation()}
		>
			<ArrowSquareOutIcon size="0.9em" />
		</a>
	);
}

interface NodeLinkViewProps {
	url: string;
	text: string;
	path: number[];
	onSaveLink?: OnSaveLink;
	children: ReactNode;
}

/**
 * A link inside node content. Read-only consumers (no `onSaveLink`) get a
 * plain anchor; inside the outline, clicking it opens a popover that shows
 * the full URL and lets the user edit the link text and URL or open it.
 */
export function NodeLinkView({
	url,
	text,
	path,
	onSaveLink,
	children,
}: NodeLinkViewProps) {
	const labels = useOutlinerLabels();
	if (!onSaveLink) {
		return (
			<>
				<a
					href={url}
					title={url}
					target="_blank"
					rel="noreferrer"
					className={anchorClassName}
					onClick={(event) => event.stopPropagation()}
				>
					{children}
				</a>
				<OpenLinkIcon url={url} label={labels.linkOpen} />
			</>
		);
	}
	return (
		<EditableLink url={url} text={text} path={path} onSaveLink={onSaveLink}>
			{children}
		</EditableLink>
	);
}

function EditableLink({
	url,
	text,
	path,
	onSaveLink,
	children,
}: NodeLinkViewProps & { onSaveLink: OnSaveLink }) {
	const labels = useOutlinerLabels();
	const anchorRef = useRef<HTMLAnchorElement>(null);
	const [open, setOpen] = useState(false);
	const [draftText, setDraftText] = useState(text);
	const [draftUrl, setDraftUrl] = useState(url);

	const normalizedUrl = normalizeHttpUrl(draftUrl);
	const canSave = normalizedUrl !== null && draftText.trim() !== "";

	const save = () => {
		if (normalizedUrl === null) return;
		const trimmedText = draftText.trim();
		if (trimmedText === "") return;
		onSaveLink(path, { text: trimmedText, url: normalizedUrl });
		setOpen(false);
	};

	return (
		<>
			<a
				ref={anchorRef}
				href={url}
				title={url}
				className={anchorClassName}
				aria-haspopup="dialog"
				aria-expanded={open}
				onClick={(event) => {
					// Don't navigate, and don't let the row switch into edit mode.
					event.preventDefault();
					event.stopPropagation();
					setDraftText(text);
					setDraftUrl(url);
					setOpen(true);
				}}
				onKeyDown={(event) => event.stopPropagation()}
			>
				{children}
			</a>
			<OpenLinkIcon url={url} label={labels.linkOpen} />
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverContent
					anchor={anchorRef}
					aria-label={labels.linkEditTitle}
					className="w-72"
				>
					{/* The popover portal keeps React events bubbling through the row
					    (role="button"), so keep clicks/keystrokes from starting an edit. */}
					<form
						className="flex flex-col gap-3"
						onClick={(event) => event.stopPropagation()}
						onKeyDown={(event) => {
							// Escape must keep bubbling so the popover can close itself.
							if (event.key !== "Escape") event.stopPropagation();
						}}
						onSubmit={(event) => {
							event.preventDefault();
							save();
						}}
					>
						<Input
							label={labels.linkTextLabel}
							value={draftText}
							autoFocus
							onChange={(event) => setDraftText(event.target.value)}
						/>
						<Input
							label={labels.linkUrlLabel}
							value={draftUrl}
							maxLength={MAX_URL_LENGTH}
							aria-invalid={normalizedUrl === null || undefined}
							onChange={(event) => setDraftUrl(event.target.value)}
						/>
						<div className="flex items-center justify-between gap-2">
							<a
								href={url}
								target="_blank"
								rel="noreferrer"
								className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm outline-none hover:bg-ginger/70 focus-visible:ring-2 focus-visible:ring-redleather/50 dark:hover:bg-ginger/20"
							>
								<ArrowSquareOutIcon size="1em" />
								{labels.linkOpen}
							</a>
							<button
								type="submit"
								disabled={!canSave}
								className="cursor-pointer rounded-md bg-redleather px-3 py-1.5 text-sm text-super-ginger outline-none hover:bg-redleather/90 focus-visible:ring-2 focus-visible:ring-redleather/50 disabled:cursor-default disabled:opacity-40"
							>
								{labels.linkSave}
							</button>
						</div>
					</form>
				</PopoverContent>
			</Popover>
		</>
	);
}
