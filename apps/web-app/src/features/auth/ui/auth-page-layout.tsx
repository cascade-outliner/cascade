import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface AuthPageLayoutProps {
	heading: string;
	children: ReactNode;
	footer: ReactNode;
}

export function AuthPageLayout({
	heading,
	children,
	footer,
}: AuthPageLayoutProps) {
	return (
		<main className="mx-auto min-h-128 w-full max-w-md px-8 pt-16 pb-24">
			<Link
				to="/"
				className="flex items-center justify-center gap-4 pb-12 font-serif text-2xl italic"
			>
				<img width={48} height={48} alt="" src="/logo192.png" />
				cascade
			</Link>
			<h1 className="mb-8 text-center font-serif text-4xl italic">{heading}</h1>
			{children}
			<p className="mt-8 text-center text-sm text-muted">{footer}</p>
		</main>
	);
}
