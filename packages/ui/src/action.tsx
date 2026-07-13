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

const spring =
	"transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]";
const grow = `${spring} group-hover:scale-[1.05] group-active:scale-[1.05] group-focus-within:scale-[1.05]`;
const peel = `${spring} translate-x-0 group-hover:translate-x-(--action-offset) group-active:translate-x-(--action-offset) group-focus-within:translate-x-(--action-offset)`;

// Matches Button's single-icon slide distance, so an Action with one item
// feels identical to Button. Extra icons fan out further, one step apart.
const OFFSET_BASE_REM = 4.75;
const OFFSET_STEP_REM = 3.25;

function offsetStyle(index: number): React.CSSProperties {
	return {
		"--action-offset": `${OFFSET_BASE_REM + index * OFFSET_STEP_REM}rem`,
	} as React.CSSProperties;
}

export interface ActionItem {
	icon: React.ReactNode;
	label: string;
	onClick?: () => void;
	render?: React.ReactElement;
	disabled?: boolean;
}

export interface ActionProps extends React.ComponentProps<typeof BaseButton> {
	actions: ActionItem[];
	variant?: "primary" | "dark";
}

export function Action({
	children,
	actions,
	className,
	variant = "primary",
	...props
}: ActionProps) {
	const filterId = useId();
	const bg = variantBg[variant];

	return (
		<div
			className={`group relative inline-flex select-none items-center ${className ?? ""}`}
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
				className="absolute inset-0 flex"
				style={{ filter: `url(#${filterId})` }}
			>
				<span className={`flex-1 origin-right rounded-full ${bg} ${grow}`} />
				{actions.map((action, index) => (
					<span
						key={action.label}
						className={`size-11 shrink-0 rounded-full ${bg} ${peel}`}
						style={offsetStyle(index)}
					/>
				))}
			</span>
			<BaseButton
				className={trigger({
					variant,
					className: `px-6 font-semibold text-super-ginger ${grow}`,
				})}
				{...props}
			>
				{children}
			</BaseButton>
			{actions.map((action, index) => (
				<BaseButton
					key={action.label}
					aria-label={action.label}
					onClick={action.onClick}
					disabled={action.disabled}
					render={action.render}
					className={trigger({
						variant,
						className: `size-11 text-super-ginger ${peel}`,
					})}
					style={offsetStyle(index)}
				>
					{action.icon}
				</BaseButton>
			))}
		</div>
	);
}
