import { PublicPageLayout } from "#/components/site/public-page-layout";

export interface LegalSection {
	heading: string;
	body: string;
}

interface LegalDocumentPageProps {
	title: string;
	lastUpdated: string;
	introduction: string;
	sections: LegalSection[];
	contactHeading: string;
	contactBody: string;
}

export function LegalDocumentPage({
	title,
	lastUpdated,
	introduction,
	sections,
	contactHeading,
	contactBody,
}: LegalDocumentPageProps) {
	return (
		<PublicPageLayout>
			<main className="prose mx-auto max-w-3xl p-8 min-h-128">
				<h1 className="font-serif text-4xl italic mb-2">{title}</h1>
				<p className="text-sm text-muted">{lastUpdated}</p>
				<p>{introduction}</p>
				<LegalSections sections={sections} />
				<h2>{contactHeading}</h2>
				<p>
					{contactBody}{" "}
					<a href="mailto:contact@patrickroelofs.com">
						contact@patrickroelofs.com
					</a>
					.
				</p>
			</main>
		</PublicPageLayout>
	);
}

function LegalSections({ sections }: { sections: LegalSection[] }) {
	return sections.map((section) => (
		<LegalSectionContent key={section.heading} section={section} />
	));
}

function LegalSectionContent({ section }: { section: LegalSection }) {
	return (
		<>
			<h2>{section.heading}</h2>
			<p>{section.body}</p>
		</>
	);
}
