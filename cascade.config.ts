import { defineConfig } from "#/core/config";
import { authFeature } from "#/features/auth";
import { nodesFeature } from "#/features/nodes";

export default defineConfig({
	features: [authFeature, nodesFeature],
});
