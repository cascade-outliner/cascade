const faqs = [
	{
		question: "Is it really free?",
		answer:
			"Yes. Cascade is free to use while we develop the application, in the future we may introduce paid features, but the core experience will remain free.",
	},
	{
		question: "How is it different from other outliners?",
		answer:
			"Right now, we're focusing on perfecting the basics, so it feels very similar to existing tools. We're in active development, though, and have some exciting, unique features on the horizon!",
	},
	{
		question: "Does it work on my phone?",
		answer:
			"Cascade runs in the browser, so it works anywhere a browser does including your phone. An independent app is possible in the future.",
	},
];

export function Faq() {
	return (
		<section className="mx-auto max-w-3xl px-8 py-26">
			<h2 className="mb-12 text-center font-serif text-6xl font-light">
				Questions
			</h2>
			<div className="flex flex-col">
				{faqs.map((faq, i) => (
					<details
						key={faq.question}
						className={`group border-t border-dark-grey/10 py-1 ${
							i === faqs.length - 1 ? "border-b" : ""
						}`}
					>
						<summary className="cursor-pointer list-none px-1 py-6 text-base font-bold [&::-webkit-details-marker]:hidden">
							{faq.question}
						</summary>
						<div className="grid grid-rows-[0fr] transition-[grid-template-rows]">
							<p className="m-0 px-1 pb-6 text-pretty text-base">
								{faq.answer}
							</p>
						</div>
					</details>
				))}
			</div>
		</section>
	);
}
