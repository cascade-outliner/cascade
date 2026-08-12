import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const metadataNodeSchema = z.object({
	expanded: z.boolean(),
});

export class MetadataNodeDto extends createZodDto(metadataNodeSchema) {}
