import type { Footer, Header, Page } from "@/payload-types";

type Seed<T> = Omit<T, "id" | "createdAt" | "updatedAt">;

const START_FREE = "https://app.cascadelist.com/signup";
const LOG_IN = "https://app.cascadelist.com/login";

export const headerSeed: Seed<Header> = {
	siteName: "Cascadelist",
	navigation: [
		{ label: "Features", url: "/#features" },
		{ label: "Daily notes", url: "/#daily-notes" },
		{ label: "Pricing", url: "/#pricing" },
		{ label: "FAQ", url: "/#faq" },
	],
	secondaryAction: { label: "Log in", url: LOG_IN, newTab: false },
	primaryAction: { label: "Start free", url: START_FREE, newTab: false },
};

export const footerSeed: Seed<Footer> = {
	copyright: "Cascadelist",
	links: [
		{ label: "Changelog", url: "/changelog" },
		{ label: "Privacy", url: "/privacy" },
		{ label: "Terms", url: "/terms" },
	],
};

export const homeSeed: Seed<Page> = {
	title: "Every thought gets a place to land",
	slug: "home",
	description:
		"Cascadelist is one infinite list you can nest, fold, zoom and link. An outliner for writers, researchers, engineers and anyone with 40 tabs open in their head.",
	layout: [
		{
			blockType: "hero",
			eyebrow: "An outliner for tangled brains",
			heading: "Every thought gets a place to land.",
			body: "Cascadelist is one infinite list you can nest, fold, zoom and link. Your novel, your sprint and your grocery run, all in the same tree, none of them in the way.",
			cta: { label: "Start outlining, free", url: START_FREE, newTab: false },
			note: "no card · web, Mac, iOS",
			sticker: "go on, it's real →",
		},
		{
			blockType: "featureGrid",
			anchor: "features",
			heading: "One outline. A dozen ways to look at it.",
			body: "Every view is the same tree underneath. Switch freely; nothing gets copied, nothing goes stale.",
			features: [
				{
					illustration: "board",
					title: "Board",
					comingSoon: true,
					description:
						"Children become columns. Drag a card, and you've just moved a bullet.",
				},
				{
					illustration: "table",
					title: "Table",
					comingSoon: true,
					description:
						"Add fields, get columns. It's still a tree, so rows fold like everything else.",
				},
				{
					illustration: "links",
					title: "[[Links]] & backlinks",
					comingSoon: true,
					description:
						"Type two brackets, pick a bullet. Every page knows who's talking about it.",
				},
				{
					illustration: "mirrors",
					title: "Mirrors",
					comingSoon: true,
					description:
						"One bullet, many homes. Check it off in one place and it's done everywhere.",
				},
				{
					illustration: "split",
					title: "Split pane",
					comingSoon: true,
					description:
						"Research on the left, draft on the right. Drag bullets across like a pickpocket.",
				},
				{
					illustration: "history",
					title: "History",
					comingSoon: true,
					description:
						"Scrub back to Tuesday. Rescue the sentence you deleted in a fit of confidence.",
				},
			],
		},
		{
			blockType: "dailyNotes",
			anchor: "daily-notes",
			eyebrow: "Daily notes",
			heading:
				"A fresh page every morning. Yesterday's loose ends come with it.",
			body: "Open Cascadelist and today is waiting. Jot, link, move on. Anything you didn't finish rolls forward on its own, so nothing falls through the floorboards.",
			preview: {
				dateLabel: "Thursday, Sep 24",
				entries: [
					{ text: "Standup: [[Search revamp]] ships Monday" },
					{ text: "Idea: the heist happens during the wedding" },
					{ text: "Book the movers", carriedFrom: "Tue" },
				],
			},
		},
		{
			blockType: "pricing",
			anchor: "pricing",
			heading: "Pricing, without a spreadsheet",
			body: "Free is generous on purpose. Pro is for when your outline gets ambitious.",
			plans: [
				{
					name: "Free",
					price: "$0",
					period: "forever",
					featured: false,
					features: [
						{ text: "Unlimited bullets, all views" },
						{ text: "Daily notes & backlinks" },
						{ text: "7 days of history" },
					],
					cta: { label: "Start free", url: START_FREE, newTab: false },
				},
				{
					name: "Pro",
					price: "$6",
					period: "/ month, billed yearly",
					featured: true,
					badge: "Most loved",
					features: [
						{ text: "Everything in Free" },
						{ text: "Mirrors, embeds & sharing" },
						{ text: "Unlimited history & file uploads" },
						{ text: "AI splits a messy line into dated, assigned tasks" },
					],
					cta: {
						label: "Try Pro for 30 days",
						url: `${START_FREE}?plan=pro`,
						newTab: false,
					},
				},
			],
		},
		{
			blockType: "faq",
			anchor: "faq",
			heading: "Questions, nested",
			items: [
				{
					question: "Why an outliner and not a doc?",
					answer:
						"Docs make you decide the shape up front. Outlines let the shape show up later: dump it, then drag it into order.",
				},
				{
					question: "Can I bring my notes from somewhere else?",
					answer:
						"Paste Markdown, OPML or plain indented text and it lands as a tree.",
				},
				{
					question: "Does it work offline?",
					answer: "Yes. Edits sync when you're back online.",
				},
				{
					question: "Is it keyboard-friendly?",
					answer:
						"Aggressively. ⌘K does almost everything; your mouse can take the day off.",
				},
			],
		},
		{
			blockType: "cta",
			heading: "Start with one bullet.",
			body: "The rest tends to cascade.",
			cta: { label: "Open Cascadelist", url: START_FREE, newTab: false },
		},
	],
};
