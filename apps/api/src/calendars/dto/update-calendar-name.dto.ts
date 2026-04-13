import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsNotEmpty, MaxLength, MinLength } from "class-validator"

export class UpdateCalendarNameDto {
  @ApiProperty()
  @MaxLength(60)
  @MinLength(1)
  @IsString()
  @IsNotEmpty()
  name: string
}
