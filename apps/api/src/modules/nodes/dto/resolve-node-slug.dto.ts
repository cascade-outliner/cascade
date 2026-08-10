import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class ResolveNodeSlugQueryDto {
	@ApiPropertyOptional({
		description:
			"The disambiguating slug text preceding the id/id-prefix, used to break ties when a first-block id prefix matches multiple nodes.",
	})
	@IsOptional()
	@IsString()
	slugText?: string;
}

export class ResolveNodeSlugResponseDto {
	@ApiProperty()
	id!: string;
}
