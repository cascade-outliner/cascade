import { Button as BaseButton } from "@base-ui/react";
import { useId } from "react";
import { cva } from "./cva.config";

const variantRing = {
	primary: "focus-visible:ring-primary/50",
	dark: "focus-visible:ring-ink/50",
	danger: "focus-visible:ring-danger/50",
};

const variantBg = {
	primary: "bg-primary",
	dark: "bg-ink",
	danger: "bg-danger",
};

const root = cva({
	base: [
		"group relative inline-flex select-none items-center rounded-full outline-none cursor-pointer",
		"focus-visible:ring-2",
		"disabled:cursor-default disabled:opacity-40",
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
const slide = `${spring} group-hover:translate-x-4.75 group-active:translate-x-4.75`;
const grow = `${spring} group-hover:scale-[1.05] group-active:scale-[1.05]`;

const sizes = {
	md: { height: "h-11", textPadding: "px-6", text: "font-semibold" },
	sm: { height: "h-8", textPadding: "px-4", text: "text-sm font-semibold" },
};

export interface ButtonProps extends React.ComponentProps<typeof BaseButton> {
	icon?: React.ReactNode;
	variant?: "primary" | "dark" | "danger";
	size?: "md" | "sm";
}

export function Button({
	children,
	icon,
	className,
	variant = "primary",
	size = "md",
	...props
}: ButtonProps) {
	const filterId = useId();
	const bg = variantBg[variant];
	const { height, textPadding, text } = sizes[size];

	/**
	 * The blobby goo split needs two separate pieces to pull apart, so it only
	 * applies to the default size with an icon. Small buttons (and any button
	 * without an icon) just scale in place.
	 */
	if (size !== "md" || !icon) {
		return (
			<BaseButton className={root({ variant, className })} {...props}>
				<span className={`absolute inset-0 rounded-full ${bg} ${grow}`} />
				<span
					className={`relative z-10 flex ${height} items-center justify-center gap-2 ${textPadding} ${text} text-canvas ${grow}`}
				>
					{children}
					{icon}
				</span>
			</BaseButton>
		);
	}

	return (
		<BaseButton className={root({ variant, className })} {...props}>
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
				<span
					className={`absolute inset-y-0 left-0 right-11 origin-right rounded-full ${bg} ${grow}`}
				/>
				<span
					className={`absolute inset-y-0 right-0 w-11 rounded-full ${bg} ${slide}`}
				/>
			</span>
			<span className={`relative z-10 flex ${height} items-center`}>
				<span
					className={`origin-right ${textPadding} ${text} text-canvas ${grow}`}
				>
					{children}
				</span>
				<span
					className={`flex size-11 items-center justify-center text-canvas ${slide}`}
				>
					{icon}
				</span>
			</span>
		</BaseButton>
	);
}
