import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsInt, Min, Max, IsBoolean, Length, IsOptional } from "class-validator"

export class CreateEventDto {
  @ApiProperty({ example: 'Example event'})
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiProperty()
  @IsString()
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
  startZone: string

  @ApiProperty({ example: 'Europe/Lisbon' })
  @IsString()
  @IsNotEmpty()
  endZone: string

  @ApiProperty({ example: '#0f9d58'})
  @IsString()
  @Length(7, 7)
  color: string

  @ApiProperty()
  @IsOptional()
  recurring: boolean

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  recurrenceRule?: string

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  recurrenceEnd?: number

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  recurringEventId?: string

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  originalTime?: number
}
