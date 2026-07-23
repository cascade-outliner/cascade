import { m } from "#/paraglide/messages.js";

const faqs = [
	{ question: m.faq_q1_question(), answer: m.faq_q1_answer() },
	{ question: m.faq_q2_question(), answer: m.faq_q2_answer() },
	{ question: m.faq_q3_question(), answer: m.faq_q3_answer() },
];

export function FaqSection() {
	return (
		<section className="mx-auto max-w-3xl px-8 py-26">
			<h2 className="mb-12 text-center font-serif text-4xl md:text-6xl font-light">
				{m.faq_heading()}
			</h2>
			<div className="flex flex-col">
				{faqs.map((faq, i) => (
					<details
						key={faq.question}
						className={`group border-t border-ink/10 py-1 ${
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
