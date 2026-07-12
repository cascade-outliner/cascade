import { Toast } from "@base-ui/react/toast";
import {
	CheckCircleIcon,
	InfoIcon,
	WarningCircleIcon,
	XCircleIcon,
	XIcon,
} from "@phosphor-icons/react/ssr";
import { cva } from "./cva.config";
import { useUiLabels } from "./labels-context";

type ToastType = "success" | "error" | "warning" | "info";

export const toastManager = Toast.createToastManager();

function addToast(
	type: ToastType,
	description: React.ReactNode,
	title?: React.ReactNode,
) {
	return toastManager.add({ type, title, description });
}

export const toast = {
	success: (description: React.ReactNode, title?: React.ReactNode) =>
		addToast("success", description, title),
	error: (description: React.ReactNode, title?: React.ReactNode) =>
		addToast("error", description, title),
	warning: (description: React.ReactNode, title?: React.ReactNode) =>
		addToast("warning", description, title),
	info: (description: React.ReactNode, title?: React.ReactNode) =>
		addToast("info", description, title),
	dismiss: (id?: string) => toastManager.close(id),
};

const icons: Record<ToastType, React.ReactNode> = {
	success: <CheckCircleIcon size={24} weight="fill" />,
	error: <XCircleIcon size={24} weight="fill" />,
	warning: <WarningCircleIcon size={24} weight="fill" />,
	info: <InfoIcon size={24} weight="fill" />,
};

// Stacking geometry per base-ui's docs: toasts sit absolutely positioned in
// the viewport, peeking out behind the frontmost one until the viewport is
// hovered/focused (`data-expanded`), then they fan out to full height.
const root = cva({
	base: [
		"[--gap:0.5rem] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
		"[--height:var(--toast-frontmost-height,var(--toast-height))]",
		"[--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))]",
		"absolute right-0 bottom-0 left-auto mr-0 w-80 origin-bottom",
		"[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))]",
		"z-[calc(1000-var(--toast-index))] h-[var(--height)]",
		"rounded-lg border border-dark-grey/10 bg-white text-dark-grey shadow-lg shadow-dark-grey/15",
		"select-none [transition:transform_0.4s_cubic-bezier(0.22,1,0.36,1),opacity_0.4s,height_0.15s]",
		"data-expanded:h-[var(--toast-height)]",
		"data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
		"data-starting-style:[transform:translateY(150%)]",
		"data-ending-style:opacity-0 data-limited:opacity-0",
		"[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]",
	],
	variants: {
		type: {
			success: "[&_.toast-icon]:text-green-600",
			error: "[&_.toast-icon]:text-redleather",
			warning: "[&_.toast-icon]:text-amber-600",
			info: "[&_.toast-icon]:text-graphite",
		},
	},
	defaultVariants: {
		type: "info",
	},
});

const content = cva({
	base: [
		"flex h-full items-center gap-3 overflow-hidden p-3 transition-opacity duration-200 ease-out",
		"data-behind:opacity-0 data-expanded:opacity-100",
	],
});

function ToastList() {
	const { toasts } = Toast.useToastManager();
	const labels = useUiLabels();

	return toasts.map((item) => (
		<Toast.Root
			key={item.id}
			toast={item}
			className={root({ type: item.type as ToastType })}
		>
			<Toast.Content className={content()}>
				<div className="toast-icon mt-0.5 shrink-0">
					{icons[item.type as ToastType]}
				</div>
				<div className="flex-1 space-y-0.5">
					<Toast.Title className="font-semibold text-sm" />
					<Toast.Description className="text-sm text-dark-grey" />
				</div>
				<Toast.Close
					aria-label={labels.dismissToast}
					className="shrink-0 cursor-pointer rounded p-1 text-dark-grey outline-none hover:bg-dark-grey/5 "
				>
					<XIcon size={16} className="text-dark-grey" />
				</Toast.Close>
			</Toast.Content>
		</Toast.Root>
	));
}

export function Toaster({ children }: { children: React.ReactNode }) {
	return (
		<Toast.Provider toastManager={toastManager}>
			{children}
			<Toast.Portal>
				<Toast.Viewport className="fixed right-4 bottom-4 z-50 h-16 w-80 outline-none">
					<ToastList />
				</Toast.Viewport>
			</Toast.Portal>
		</Toast.Provider>
	);
}
