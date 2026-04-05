import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsString, IsNotEmpty, IsOptional } from "class-validator"

export class CreateCalendarDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  password?: string // plaintext
}
