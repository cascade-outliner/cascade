import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "#/components/marketing/footer";
import { Faq } from "@/components/marketing/faq";
import { Features } from "@/components/marketing/features";
import { Hero } from "@/components/marketing/hero";
import { Nav } from "@/components/marketing/nav";
import { Pricing } from "@/components/marketing/pricing";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<>
			<Nav />
			<Hero />
			<Features />
			<Pricing />
			<Faq />
			<Footer />
		</>
	);
}
