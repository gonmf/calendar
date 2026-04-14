import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { Transform, TransformFnParams } from "class-transformer"
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
  @MaxLength(100)
  @MinLength(4)
  @Transform(({ value }: TransformFnParams) => value?.trim())
  password?: string // plaintext
}
