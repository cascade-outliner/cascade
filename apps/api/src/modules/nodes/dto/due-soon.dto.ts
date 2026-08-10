import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class DueSoonTaskDto {
	@ApiProperty()
	id!: string;

	@ApiProperty()
	slug!: string;

	@ApiProperty()
	label!: string;

	@ApiProperty()
	dueDate!: string;

	@ApiProperty()
	dueTime!: string;

	@ApiPropertyOptional({ type: Object, nullable: true })
	recurrence!: unknown;
}

export class DueSoonResponseDto {
	@ApiProperty({ type: [DueSoonTaskDto] })
	tasks!: DueSoonTaskDto[];
}
