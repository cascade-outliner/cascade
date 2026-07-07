import { createFileRoute } from "@tanstack/react-router";
import { Faq } from "@/components/marketing/faq";
import { Features } from "@/components/marketing/features";
import { FooterCta } from "@/components/marketing/footer-cta";
import { Hero } from "@/components/marketing/hero";
import { Nav } from "@/components/marketing/nav";
import { OutlinerDemo } from "@/components/marketing/outliner-demo";
import { Pricing } from "@/components/marketing/pricing";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<div>
			<Nav />
			<Hero />
			<OutlinerDemo />
			<Features />
			<Pricing />
			<Faq />
			<FooterCta />
		</div>
	);
}
