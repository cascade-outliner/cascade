import { PublicPageLayout } from "#/components/site/public-page-layout";
import { FaqSection } from "../components/faq-section";
import { FeaturesSection } from "../components/features-section";
import { HeroSection } from "../components/hero-section";
import { PricingSection } from "../components/pricing-section";

export function HomePage() {
	return (
		<PublicPageLayout>
			<HeroSection />
			<FeaturesSection />
			<PricingSection />
			<FaqSection />
		</PublicPageLayout>
	);
}
