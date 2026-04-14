import { ApiProperty } from "@nestjs/swagger"
import { Transform, TransformFnParams } from "class-transformer"
import { IsString, MaxLength, MinLength } from "class-validator"

export class SetCalendarPasswordDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  @MinLength(4)
  @Transform(({ value }: TransformFnParams) => value?.trim())
  password: string // plaintext
}
