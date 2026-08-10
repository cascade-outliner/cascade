import { ApiProperty } from "@nestjs/swagger";

/** This user's tags with how many nodes each is on, sorted by name. */
export class TagResponseDto {
	@ApiProperty()
	name!: string;

	@ApiProperty()
	count!: number;
}
