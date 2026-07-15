import { expect, test } from "./support/fixtures";
import type { OrpcClient } from "./support/orpc-client";

/**
 * Regression test for https://github.com/Patrickroelofs/cascade/issues/186:
 * concurrent moveNode calls racing to build a cycle.
 *
 * Fixture per round: A (root), B (root), C (child of B). Firing
 * `move A under C` and `move B under A` at the same time is *not* a cycle
 * from either request's point of view at the moment it's checked (A isn't
 * yet in C's ancestor chain, B isn't yet in A's), but if both committed the
 * result would be A -> C -> B -> A.
 *
 * A direct 2-node A<->B swap isn't used here because it happens to
 * self-deadlock on Postgres's FK-constraint row locking (parent_id
 * self-references nodes.id), which masks the race rather than exercising
 * the advisory-lock fix.
 */

const ROUNDS = 5;

async function walkParentChain(
	orpcClient: OrpcClient,
	startId: string,
): Promise<{ cycle: boolean; chain: string[] }> {
	const chain: string[] = [];
	let currentId: string | null = startId;
	for (let hop = 0; hop < 10 && currentId; hop++) {
		if (chain.includes(currentId)) return { cycle: true, chain };
		chain.push(currentId);
		const node = await orpcClient.nodes.get({ id: currentId });
		currentId = node.parentId;
	}
	return { cycle: false, chain };
}

test("concurrent moveNode calls can't create a parent cycle", async ({
	orpcClient,
}) => {
	for (let round = 0; round < ROUNDS; round++) {
		const a = await orpcClient.nodes.create({ parentId: null });
		const b = await orpcClient.nodes.create({ parentId: null });
		const c = await orpcClient.nodes.create({ parentId: b.id });

		try {
			const [moveAUnderC, moveBUnderA] = await Promise.allSettled([
				orpcClient.nodes.move({
					id: a.id,
					parentId: c.id,
					position: "append",
				}),
				orpcClient.nodes.move({
					id: b.id,
					parentId: a.id,
					position: "append",
				}),
			]);

			const settled = [moveAUnderC, moveBUnderA];
			const fulfilled = settled.filter((r) => r.status === "fulfilled");
			const rejected = settled.filter((r) => r.status === "rejected");

			// Exactly one of the two racing moves must win; the loser has to be
			// rejected once the winner's edge makes it a cycle. Both succeeding
			// would mean the cycle was created.
			expect(fulfilled.length, "exactly one racing move should succeed").toBe(
				1,
			);
			expect(rejected.length).toBe(1);
			const rejection = rejected[0] as PromiseRejectedResult;
			expect(String(rejection.reason)).toMatch(/own subtree/i);

			const { cycle, chain } = await walkParentChain(orpcClient, a.id);
			expect(
				cycle,
				`parent chain from A formed a cycle: ${chain.join(" -> ")}`,
			).toBe(false);
		} finally {
			await Promise.allSettled([
				orpcClient.nodes.delete({ id: a.id }),
				orpcClient.nodes.delete({ id: b.id }),
				orpcClient.nodes.delete({ id: c.id }),
			]);
		}
	}
});
