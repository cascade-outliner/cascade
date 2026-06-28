import { defineFeature } from "#/core/feature";
import * as procedures from "./procedures";
import * as schema from "./schema";

export const nodesFeature = defineFeature({
	name: "nodes",
	description: "Hierarchical tree node management",
	schema,
	procedures,
	dependencies: ["auth"],
});
