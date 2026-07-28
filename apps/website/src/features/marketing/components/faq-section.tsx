import { Collapsible } from "@base-ui/react/collapsible";
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
					<Collapsible.Root
						key={faq.question}
						className={`border-t border-ink/10 py-1 ${
							i === faqs.length - 1 ? "border-b" : ""
						}`}
					>
						<Collapsible.Trigger className="w-full cursor-pointer px-1 py-6 text-left text-base font-bold">
							{faq.question}
						</Collapsible.Trigger>
						<Collapsible.Panel className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-medium-enter ease-standard data-starting-style:h-0 data-ending-style:h-0 data-ending-style:duration-medium-exit motion-reduce:transition-none">
							<p className="m-0 px-1 pb-6 text-pretty text-base">
								{faq.answer}
							</p>
						</Collapsible.Panel>
					</Collapsible.Root>
				))}
			</div>
		</section>
	);
}
