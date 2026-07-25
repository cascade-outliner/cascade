import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react/ssr";
import { useHotkey } from "@tanstack/react-hotkeys";
import { m } from "#/paraglide/messages.js";
import { useNavigationHistory } from "@/features/nodes/client/navigation-history/use-navigation-history";

const stepButton =
	"flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none hover:text-danger focus-visible:ring-2 focus-visible:ring-danger/50 disabled:cursor-default disabled:opacity-30 disabled:hover:text-inherit";

/**
 * Back/forward across the nodes visited this session. Mounted once in the app
 * header so the stack keeps recording on every route under `_authed`.
 *
 * `Alt+ArrowLeft`/`Alt+ArrowRight` mirror the browser's own back/forward keys
 * on Windows/Linux. They keep `useHotkey`'s default `ignoreInputs: true`, so
 * word-wise cursor movement inside the node editor is untouched, and they only
 * `preventDefault` when there's actually somewhere to step — once the in-app
 * stack is exhausted the keys fall through to the browser, which can still
 * take the user back out of the app.
 */
export function NavigationHistoryControls() {
	const { canGoBack, canGoForward, goBack, goForward } = useNavigationHistory();

	useHotkey(
		"Alt+ArrowLeft",
		(event) => {
			if (!canGoBack) return;
			event.preventDefault();
			goBack();
		},
		{ preventDefault: false },
	);

	useHotkey(
		"Alt+ArrowRight",
		(event) => {
			if (!canGoForward) return;
			event.preventDefault();
			goForward();
		},
		{ preventDefault: false },
	);

	return (
		<div className="flex shrink-0 items-center">
			<button
				type="button"
				onClick={goBack}
				disabled={!canGoBack}
				aria-label={m.navigation_history_back()}
				className={stepButton}
			>
				<ArrowLeftIcon size={16} weight="bold" />
			</button>
			<button
				type="button"
				onClick={goForward}
				disabled={!canGoForward}
				aria-label={m.navigation_history_forward()}
				className={stepButton}
			>
				<ArrowRightIcon size={16} weight="bold" />
			</button>
		</div>
	);
}
