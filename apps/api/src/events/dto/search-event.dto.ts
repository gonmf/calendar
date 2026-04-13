import { ApiProperty } from '@nestjs/swagger'
import { Transform, TransformFnParams } from 'class-transformer'
import { IsString, MaxLength, MinLength } from 'class-validator'

export class SearchEventDto {
  @ApiProperty()
  @MaxLength(60)
  @MinLength(1)
  @IsString()
  @Transform(({ value }: TransformFnParams) => value?.trim())
  query: string
}
