import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";

export class QuickOpenQueryDto {
	@ApiProperty({ maxLength: 200 })
	@IsString()
	@MaxLength(200)
	query!: string;
}

export class QuickOpenHighlightRangeDto {
	@ApiProperty()
	start!: number;

	@ApiProperty()
	end!: number;
}

export class QuickOpenSnippetDto {
	@ApiProperty()
	text!: string;

	@ApiProperty({ type: [QuickOpenHighlightRangeDto] })
	highlightRanges!: QuickOpenHighlightRangeDto[];

	@ApiProperty()
	hasPrefix!: boolean;

	@ApiProperty()
	hasSuffix!: boolean;
}

export class QuickOpenAncestorDto {
	@ApiProperty()
	id!: string;

	@ApiProperty()
	text!: string;
}

export class QuickOpenResultDto {
	@ApiProperty()
	id!: string;

	@ApiProperty()
	slug!: string;

	@ApiProperty({ type: QuickOpenSnippetDto })
	snippet!: QuickOpenSnippetDto;

	@ApiProperty({ type: [QuickOpenAncestorDto] })
	ancestors!: QuickOpenAncestorDto[];

	@ApiProperty()
	omittedAncestorCount!: number;
}
