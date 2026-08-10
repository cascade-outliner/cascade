import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class ListStatusesQueryDto {
	@ApiProperty({ description: "The board node these statuses belong to." })
	@IsString()
	boardId!: string;
}

/** This board's statuses in display order, each with usage count and hidden flag. */
export class StatusResponseDto {
	@ApiProperty()
	id!: string;

	@ApiProperty()
	name!: string;

	@ApiProperty()
	color!: string;

	@ApiProperty()
	hidden!: boolean;

	@ApiProperty()
	count!: number;
}
