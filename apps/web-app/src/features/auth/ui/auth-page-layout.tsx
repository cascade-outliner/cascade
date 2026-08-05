import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ProductSlideshow } from "@/features/auth/ui/product-slideshow";

interface AuthPageLayoutProps {
	heading: string;
	subheading?: string;
	children: ReactNode;
	footer: ReactNode;
}

export function AuthPageLayout({
	heading,
	subheading,
	children,
	footer,
}: AuthPageLayoutProps) {
	return (
		<main className="grid min-h-dvh lg:grid-cols-2">
			<div className="flex items-center justify-center px-4 py-10 sm:px-8 sm:py-16">
				<div className="w-full max-w-sm">
					<Link
						to="/"
						className="mb-10 flex items-center justify-center gap-3 font-serif text-2xl italic"
					>
						<img width={40} height={40} alt="" src="/logo192.png" />
						cascade
					</Link>
					<div className="mb-8 text-center">
						<h1 className="font-serif text-3xl italic sm:text-4xl">
							{heading}
						</h1>
						{subheading ? (
							<p className="mt-2 text-sm text-muted">{subheading}</p>
						) : null}
					</div>
					{children}
					<p className="mt-8 text-center text-sm text-muted">{footer}</p>
				</div>
			</div>
			<div className="hidden bg-surface/40 lg:block dark:bg-surface/[0.06]">
				<ProductSlideshow />
			</div>
		</main>
	);
}
