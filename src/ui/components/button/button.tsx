import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import {
	type ComponentPropsWithoutRef,
	forwardRef,
	type ReactNode,
} from "react";

const buttonVariants = cva(
	"inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				default:
					"bg-redleather text-white hover:bg-redleather/85 focus-visible:ring-redleather",
				ghost:
					"hover:bg-redleather hover:text-white focus-visible:ring-redleather",
			},
			size: {
				sm: "h-8 px-3 text-sm",
				md: "h-10 px-4 text-sm",
				lg: "h-11 px-6 text-base",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "md",
		},
	},
);

type ButtonProps = ComponentPropsWithoutRef<typeof BaseButton> &
	VariantProps<typeof buttonVariants> & {
		startIcon?: ReactNode;
		endIcon?: ReactNode;
	};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{ className, variant, size, startIcon, endIcon, children, ...props },
		ref,
	) => (
		<BaseButton
			ref={ref}
			className={buttonVariants({ variant, size, className })}
			{...props}
		>
			{startIcon}
			{children}
			{endIcon}
		</BaseButton>
	),
);
Button.displayName = "Button";

export { Button, buttonVariants };
export type { ButtonProps };
