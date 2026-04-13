import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength } from "class-validator"

export class CreateCalendarDto {
  @ApiProperty()
  @MaxLength(60)
  @MinLength(1)
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  password?: string // plaintext
}
