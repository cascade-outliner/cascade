import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import type { VisibleTreeData } from "../tree-data.types";
import { dedupeAppend, getHandler, type HandlerContext } from "./handlers";
import type {
	TreeHistory,
	TreeMotion,
	TreeRemote,
	TreeViewStore,
} from "./ports";
import { SerialQueue, SerialQueueRegistry } from "./serial-queue";
import type { ChangeContext, ChangeOutcome, TreeCommand } from "./types";

export interface VisibleTreeChangeModule {
	execute(
		command: TreeCommand,
		context?: ChangeContext,
	): Promise<ChangeOutcome>;
}

export interface ChangeModulePorts {
	remote: TreeRemote;
	store: TreeViewStore;
	motion: TreeMotion;
	history: TreeHistory;
}

/**
 * Builds the private command module behind `VisibleTree`. `execute` runs
 * the full protocol for one command: validate, capture, cancel in-flight
 * reads, presentation-before motion, optimistic projection, the remote
 * call, authoritative reconciliation, query-family invalidation, history
 * registration, presentation-after motion. Undo/redo re-enter through the
 * same `execute` with a non-`"record"` history mode, so they traverse
 * identical validation, sequencing, remote, reconciliation, and motion
 * handling as the original command.
 *
 * Structural commands (toggle/move/remove/restore/create/duplicate/
 * loadMore) serialize on one per-view queue from capture through
 * reconciliation, so each validates against the previous one's already-
 * reconciled structure. Field commands (updateContent/setType/setDueDate/
 * setRecurrence/setTags/setTaskCompleted) capture and project immediately;
 * only their remote call is sequenced, per `nodeId:field`, so independent
 * fields can be in flight concurrently while same-field writes still land
 * on the server in the order they were made.
 */
export function createVisibleTreeChangeModule(
	ports: ChangeModulePorts,
): VisibleTreeChangeModule {
	const { remote, store, motion, history } = ports;
	const structuralQueue = new SerialQueue();
	const fieldQueues = new SerialQueueRegistry();
	let loadedPageCount = 1;

	async function runMotion(run: () => Promise<void> | void): Promise<void> {
		try {
			await run();
		} catch {
			// Motion is presentation-only: isolated from the semantic outcome.
		}
	}

	async function runCommand(
		command: TreeCommand,
		context: ChangeContext,
	): Promise<ChangeOutcome> {
		const id = crypto.randomUUID();
		const handler = getHandler(command.kind);
		const ctx: HandlerContext = {
			rows: store.getRows(),
			base: store.getBase(),
			remote,
		};

		const validationError = handler.validate?.(command, ctx) ?? null;
		if (validationError) {
			return { id, command, status: "failed", error: validationError };
		}

		const captured = await handler.capture(command, ctx);

		await store.cancelActiveReads();
		await runMotion(() => motion.before(command));

		const project = (rows: VisibleNodeRow[]) =>
			handler.project(command, rows, captured);
		store.addPending({ id, command, project });

		let outcome: ChangeOutcome;
		try {
			const runRemote = () => handler.run(command, remote, captured);
			const result = handler.structural
				? await runRemote()
				: await fieldQueues
						.for(handler.fieldKey?.(command) ?? command.kind)
						.run(runRemote);

			if (handler.structural) {
				if (handler.reconciliation === "foldProject") {
					store.resolve(id, (base) => ({ ...base, rows: project(base.rows) }));
				} else if (handler.reconciliation === "appendPage") {
					const page = result as VisibleTreeData | null;
					if (page) {
						loadedPageCount += 1;
						store.resolve(id, (base) => ({
							rows: dedupeAppend(base.rows, page.rows),
							nextCursor: page.nextCursor,
						}));
					} else {
						store.resolve(id, (base) => base);
					}
				} else {
					const refreshed = await remote.fetchWindow(loadedPageCount);
					store.resolve(id, () => refreshed);
				}
			} else {
				store.resolve(id, (base) => ({ ...base, rows: project(base.rows) }));
			}

			store.invalidate(handler.invalidation(command, result));
			outcome = { id, command, status: "succeeded" };

			if ((context.history ?? "record") === "record") {
				const inverted = handler.invert(command, captured, result, store);
				if (inverted) {
					history.push({
						undo: async () => {
							await execute(inverted.undo, { history: "undo" });
						},
						redo: async () => {
							await execute(inverted.redo, { history: "redo" });
						},
					});
				}
			}
		} catch (cause) {
			const refreshedBase = await remote
				.fetchWindow(loadedPageCount)
				.catch(() => undefined);
			store.reject(id, refreshedBase);
			outcome = {
				id,
				command,
				status: "failed",
				error: {
					kind: "remote",
					message: cause instanceof Error ? cause.message : String(cause),
					cause,
				},
			};
		}

		await runMotion(() => motion.after(command, outcome));
		return outcome;
	}

	function execute(
		command: TreeCommand,
		context: ChangeContext = {},
	): Promise<ChangeOutcome> {
		const handler = getHandler(command.kind);
		const task = () => runCommand(command, context);
		return handler.structural ? structuralQueue.run(task) : task();
	}

	return { execute };
}
