import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional, IsDateString, IsInt, IsNotEmpty, Max, Min } from 'class-validator'

export class UpdateEventDto {
  @ApiProperty({ example: 'Example event'})
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description?: string

  @ApiProperty({ example: 1767225600000 })
  @IsInt()
  @Min(631152000000)
  @Max(3471292800000)
  time: number

  @ApiProperty({ example: 'Europe/Lisbon' })
  @IsString()
  @IsNotEmpty()
  zone: string
}
