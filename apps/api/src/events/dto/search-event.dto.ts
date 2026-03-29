import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty } from 'class-validator'

export class SearchEventDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  query: string
}
