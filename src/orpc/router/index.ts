import { assembleRouter } from "#/core/assemble";
import type * as nodesProcedures from "#/features/nodes/procedures";
import config from "../../../cascade.config";

// Assembled at runtime from cascade.config features.
// Type assertion preserves ORPC procedure brands for the client.
// When adding a new feature with procedures, add its type to this intersection.
export default assembleRouter(config) as typeof nodesProcedures;
