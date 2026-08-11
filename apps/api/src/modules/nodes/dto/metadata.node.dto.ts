import { ApiProperty } from "@nestjs/swagger";

export class MetadataNodeDto {
	@ApiProperty()
	expanded!: boolean;
}
