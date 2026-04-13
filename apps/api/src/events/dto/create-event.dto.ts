import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, TransformFnParams } from 'class-transformer'
import { IsString, IsNotEmpty, IsInt, Min, Max, IsBoolean, Length, IsOptional, MaxLength, MinLength } from "class-validator"

export class CreateEventDto {
  @ApiProperty({ example: 'Example event'})
  @MaxLength(200)
  @MinLength(1)
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: TransformFnParams) => value?.trim())
  title: string

  @ApiProperty()
  @MaxLength(4000)
  @IsString()
  @Transform(({ value }: TransformFnParams) => value?.trim())
  description: string

  @ApiProperty()
  @IsBoolean()
  allDay: boolean

  @ApiProperty({ example: 1767225600000 })
  @IsInt()
  @Min(631152000000)
  @Max(3471292800000)
  startTime: number

  @ApiProperty({ example: 1767312000000 })
  @IsInt()
  @Min(631152000000)
  @Max(3471292800000)
  endTime: number

  @ApiProperty({ example: 'UTC' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: TransformFnParams) => value?.trim())
  startZone: string

  @ApiProperty({ example: 'Europe/Lisbon' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: TransformFnParams) => value?.trim())
  endZone: string

  @ApiProperty({ example: '#0f9d58'})
  @IsString()
  @Length(7, 7)
  @Transform(({ value }: TransformFnParams) => value?.trim())
  color: string

  @ApiProperty()
  @IsOptional()
  recurring: boolean

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }: TransformFnParams) => value?.trim())
  recurrenceRule?: string

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  recurrenceEnd?: number

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }: TransformFnParams) => value?.trim())
  recurringEventId?: string

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  originalTime?: number
}
