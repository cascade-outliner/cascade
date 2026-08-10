import { ApiProperty } from "@nestjs/swagger";

export class NodeStatusSummaryDto {
	@ApiProperty()
	id!: string;

	@ApiProperty()
	name!: string;

	@ApiProperty()
	color!: string;
}
