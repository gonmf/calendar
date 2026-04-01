import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { CalendarsService } from './calendars.service'
import { Calendar } from './schemas/calendar.schema'

@ApiTags('calendars')
@Controller('calendars')
export class CalendarsController {
  constructor(private readonly calendarsService: CalendarsService) {}

  @Post('create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a new calendar' })
  @ApiResponse({ status: 200, type: Calendar })
  async create() {
    const data = await this.calendarsService.create()
    return { success: !!data, data }
  }}
