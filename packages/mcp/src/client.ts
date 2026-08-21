import { env } from "./env.ts";

export type Node = {
	id: string;
	parentId: string | null;
	userId: string;
	content: unknown;
	expanded: boolean;
	createdAt: string;
	updatedAt: string;
};

export type NodeInput = {
	parentId?: string | null;
	content?: unknown;
	expanded?: boolean;
};

class CascadeApiError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = "CascadeApiError";
		this.status = status;
	}
}

async function request<T>(
	path: string,
	init?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<T> {
	const response = await fetch(new URL(path, `${env.CASCADE_API_URL}/`), {
		...init,
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${env.CASCADE_API_TOKEN}`,
			...init?.headers,
		},
		body: init?.body === undefined ? undefined : JSON.stringify(init.body),
	});

	if (!response.ok) {
		const body = await response.text();
		throw new CascadeApiError(
			response.status,
			`Cascade API request to ${path} failed with ${response.status}: ${body}`,
		);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	return (await response.json()) as T;
}

export const cascadeClient = {
	listNodes: () => request<{ nodes: Node[] }>("nodes"),

	getNode: (id: string) => request<Node>(`nodes/${id}`),

	createNode: (input: NodeInput) =>
		request<Node>("nodes", { method: "POST", body: input }),

	updateNode: (id: string, input: NodeInput) =>
		request<Node>(`nodes/${id}`, { method: "PATCH", body: input }),

	deleteNode: (id: string) =>
		request<{ success: boolean }>(`nodes/${id}`, { method: "DELETE" }),
};
