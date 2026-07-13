import { Button as BaseButton } from "@base-ui/react";
import { useId } from "react";
import { cva } from "./cva.config";

const variantRing = {
	primary: "focus-visible:ring-redleather/50",
	dark: "focus-visible:ring-dark-grey/50",
};

const variantBg = {
	primary: "bg-redleather",
	dark: "bg-dark-grey",
};

const trigger = cva({
	base: [
		"relative z-10 inline-flex h-11 select-none items-center justify-center rounded-full outline-none cursor-pointer",
		"focus-visible:ring-2",
		"data-disabled:cursor-default data-disabled:opacity-40",
	],
	variants: {
		variant: variantRing,
	},
	defaultVariants: {
		variant: "primary",
	},
});

const springTransform =
	"transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]";
const springGap =
	"transition-[gap] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]";
const springWidth =
	"transition-[width] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]";
const springWidthOpacity =
	"transition-[width,opacity] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]";
const grow = `${springTransform} group-hover:scale-[1.05] group-active:scale-[1.05] group-focus-within:scale-[1.05]`;

// A real flex gap (not a transform) so the space between peeled-off icons
// stays inside the group's hoverable box — crossing it can't drop hover.
const gapOpen = `gap-0 ${springGap} group-hover:gap-3.5 group-active:gap-3.5 group-focus-within:gap-3.5`;

// hideUntilHover: icons collapse to zero width at rest instead of just
// staying flush against the text, so the resting pill is text-only.
const widthOpen = `w-0 overflow-hidden ${springWidth} group-hover:w-11 group-active:w-11 group-focus-within:w-11`;

// hideUntilHover: the resting icon shrinks away as the real actions open up.
const widthClose = `w-4 opacity-100 overflow-hidden ${springWidthOpacity} group-hover:w-0 group-hover:opacity-0 group-active:w-0 group-active:opacity-0 group-focus-within:w-0 group-focus-within:opacity-0`;

// hideUntilHover: trailing padding is tighter than px-6 since the resting
// icon already occupies that space — a plain px-6 would double it up.
const restIconGap = `gap-1.5 ${springGap} group-hover:gap-0 group-active:gap-0 group-focus-within:gap-0`;

export interface ActionItem {
	icon: React.ReactNode;
	label: string;
	onClick?: () => void;
	render?: React.ReactElement;
	disabled?: boolean;
}

interface ActionCommonProps extends React.ComponentProps<typeof BaseButton> {
	actions: ActionItem[];
	variant?: "primary" | "dark";
}

export interface ActionProps extends ActionCommonProps {
	hideUntilHover?: boolean;
	icon?: React.ReactNode;
}

export function Action(
	props: ActionCommonProps & { hideUntilHover: true; icon: React.ReactNode },
): React.ReactElement;
export function Action(
	props: ActionCommonProps & { hideUntilHover?: false },
): React.ReactElement;
export function Action({
	children,
	actions,
	className,
	variant = "primary",
	hideUntilHover = false,
	icon,
	...props
}: ActionProps) {
	const filterId = useId();
	const bg = variantBg[variant];
	const iconSize = hideUntilHover
		? `h-11 shrink-0 ${widthOpen}`
		: "size-11 shrink-0";

	return (
		<div
			className={`group relative inline-flex select-none items-center gap-0 ${springGap} hover:gap-3.5 focus-within:gap-3.5 active:gap-3.5 ${className ?? ""}`}
		>
			<svg aria-hidden role="presentation" className="absolute size-0">
				<filter id={filterId}>
					<feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
					<feColorMatrix
						in="blur"
						values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
						result="goo"
					/>
					<feComposite in="SourceGraphic" in2="goo" operator="atop" />
				</filter>
			</svg>
			<span
				className={`absolute inset-0 flex ${gapOpen}`}
				style={{ filter: `url(#${filterId})` }}
			>
				<span className={`flex-1 origin-right rounded-full ${bg} ${grow}`} />
				{actions.map((action) => (
					<span
						key={action.label}
						className={`rounded-full ${bg} ${iconSize}`}
					/>
				))}
			</span>
			<BaseButton
				className={trigger({
					variant,
					className: hideUntilHover
						? `pl-6 pr-3 font-semibold text-super-ginger ${grow} ${restIconGap}`
						: `px-6 font-semibold text-super-ginger ${grow}`,
				})}
				{...props}
			>
				{children}
				{hideUntilHover && (
					<span
						aria-hidden
						className={`flex items-center justify-center ${widthClose}`}
					>
						{icon}
					</span>
				)}
			</BaseButton>
			{actions.map((action) => (
				<BaseButton
					key={action.label}
					aria-label={action.label}
					onClick={action.onClick}
					disabled={action.disabled}
					render={action.render}
					className={trigger({
						variant,
						className: `text-super-ginger ${iconSize}`,
					})}
				>
					{action.icon}
				</BaseButton>
			))}
		</div>
	);
}
