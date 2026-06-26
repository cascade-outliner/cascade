import { migrate } from "drizzle-orm/postgres-js/migrator";

import { db } from "./index.ts";
import { nodes } from "./schema.ts";

migrate(db, { migrationsFolder: "./drizzle" });

type NodeRow = {
	id: string;
	parentId: string | null;
	position: number;
	text: string;
};

function makeId() {
	return crypto.randomUUID();
}

const rows: NodeRow[] = [];

// Root nodes
const roots = [
	"Work",
	"Personal",
	"Learning",
	"Health",
	"Finance",
	"Projects",
	"Ideas",
	"Archive",
];

const workChildren = [
	"Q3 Planning",
	"Team meetings",
	"Code reviews",
	"Documentation",
	"Onboarding",
	"OKRs",
	"Performance reviews",
];

const personalChildren = [
	"Family",
	"Friends",
	"Hobbies",
	"Travel",
	"Home",
	"Shopping",
	"Events",
];

const learningChildren = [
	"Books",
	"Courses",
	"Podcasts",
	"Articles",
	"Videos",
	"Conferences",
];

const healthChildren = [
	"Exercise",
	"Nutrition",
	"Sleep",
	"Mental health",
	"Checkups",
	"Medications",
];

const financeChildren = [
	"Budget",
	"Investments",
	"Taxes",
	"Insurance",
	"Savings goals",
];

const projectsChildren = [
	"Cascade",
	"Side project A",
	"Side project B",
	"Open source",
	"Portfolio",
];

const ideasChildren = [
	"Product ideas",
	"Business ideas",
	"Creative writing",
	"Art",
	"Music",
];

const archiveChildren = [
	"2023",
	"2024",
	"Old projects",
	"Completed tasks",
	"Reference",
];

const childrenByRoot: Record<string, string[]> = {
	Work: workChildren,
	Personal: personalChildren,
	Learning: learningChildren,
	Health: healthChildren,
	Finance: financeChildren,
	Projects: projectsChildren,
	Ideas: ideasChildren,
	Archive: archiveChildren,
};

const grandchildrenTemplates: Record<string, string[]> = {
	"Q3 Planning": [
		"Define goals",
		"Stakeholder alignment",
		"Resource allocation",
		"Timeline",
		"Risk assessment",
	],
	"Team meetings": [
		"Daily standup",
		"Weekly sync",
		"Retrospective",
		"Sprint planning",
		"1-on-1s",
	],
	"Code reviews": [
		"Frontend PRs",
		"Backend PRs",
		"Infra changes",
		"Review guidelines",
		"Feedback templates",
	],
	Documentation: [
		"API docs",
		"Architecture decision records",
		"Runbooks",
		"Onboarding guide",
		"README updates",
	],
	Onboarding: [
		"Day 1 checklist",
		"Tool access",
		"Team intro",
		"First tasks",
		"30-60-90 plan",
	],
	Cascade: [
		"Bug backlog",
		"Feature ideas",
		"Design system",
		"Deploy pipeline",
		"Analytics",
	],
	Books: [
		"Currently reading",
		"Want to read",
		"Finished",
		"Notes",
		"Recommendations",
	],
	Exercise: ["Gym routine", "Running log", "Stretching", "Goals", "Equipment"],
	Budget: [
		"Monthly expenses",
		"Fixed costs",
		"Variable costs",
		"Income",
		"Reports",
	],
	Family: ["Parents", "Siblings", "Extended family", "Visits", "Gifts"],
};

const rootIds: Record<string, string> = {};

roots.forEach((label, i) => {
	const id = makeId();
	rootIds[label] = id;
	rows.push({ id, parentId: null, position: i + 1, text: label });
});

const childIds: Record<string, string> = {};

roots.forEach((root) => {
	const children = childrenByRoot[root] ?? [];
	children.forEach((child, ci) => {
		const id = makeId();
		childIds[child] = id;
		rows.push({ id, parentId: rootIds[root], position: ci + 1, text: child });
	});
});

Object.entries(grandchildrenTemplates).forEach(([parent, grandchildren]) => {
	const parentId = childIds[parent];
	if (!parentId) return;
	grandchildren.forEach((gc, gi) => {
		const id = makeId();
		rows.push({ id, parentId, position: gi + 1, text: gc });

		// Add one more level for Cascade specifically
		if (parent === "Cascade") {
			const detailItems =
				gc === "Bug backlog"
					? [
							"Login crash on mobile",
							"Slow tree render",
							"Drag-drop broken in Firefox",
							"Search returns stale results",
						]
					: gc === "Feature ideas"
						? [
								"Keyboard shortcuts",
								"Dark mode",
								"Export to markdown",
								"Collaborative editing",
								"Inline AI assistant",
							]
						: gc === "Design system"
							? [
									"Color tokens",
									"Typography scale",
									"Spacing",
									"Component library",
									"Icon set",
								]
							: [];
			detailItems.forEach((item, ii) => {
				rows.push({ id: makeId(), parentId: id, position: ii + 1, text: item });
			});
		}
	});
});

await db.insert(nodes).values(rows);

console.log(`Seeded ${rows.length} nodes.`);
