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

const root = cva({
	base: [
		"group relative inline-flex select-none items-center rounded-full outline-none cursor-pointer",
		"focus-visible:ring-2",
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

export interface ButtonProps extends React.ComponentProps<typeof BaseButton> {
	icon: React.ReactNode;
	variant?: "primary" | "dark";
}

export function Button({
	children,
	icon,
	className,
	variant = "primary",
	...props
}: ButtonProps) {
	const filterId = useId();
	const bg = variantBg[variant];

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
					className={`absolute inset-y-0 left-0 right-11 origin-left rounded-full ${bg} ${grow}`}
				/>
				<span
					className={`absolute inset-y-0 right-0 w-11 rounded-full ${bg} ${slide}`}
				/>
			</span>
			<span className="relative z-10 flex h-11 items-center">
				<span className={`origin-left px-6 font-semibold text-ginger ${grow}`}>
					{children}
				</span>
				<span
					className={`flex size-11 items-center justify-center text-ginger ${slide}`}
				>
					{icon}
				</span>
			</span>
		</BaseButton>
	);
}
