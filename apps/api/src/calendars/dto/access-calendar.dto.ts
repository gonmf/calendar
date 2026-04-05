import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional } from 'class-validator'

export class AccessCalendarDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  password?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  token?: string
}
