import { ApiProperty } from '@nestjs/swagger'
import { Transform, TransformFnParams } from 'class-transformer'
import { IsString, Length } from 'class-validator'

export class UpdateEventColorDto {
  @ApiProperty({ example: '#0f9d58'})
  @IsString()
  @Length(7, 7)
  @Transform(({ value }: TransformFnParams) => value?.trim())
  color: string
}
