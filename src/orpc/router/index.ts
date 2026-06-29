import type { CascadeConfig } from "#/core/config";
import config from "../../../cascade.config";

import * as nodeProcedures from "../../core/nodes/node.procedures";

function assembleRouter(_: CascadeConfig) {
	return Object.assign({}, nodeProcedures);
}

export default assembleRouter(config);
