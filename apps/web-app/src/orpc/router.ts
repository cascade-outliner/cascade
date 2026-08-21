import { os } from "@orpc/server";
export const router = {
	nodes: {
		list: os.route({ method: "GET", path: "/nodes" }).handler(() => {
			return {
				nodes: [],
			};
		}),
	},
};
