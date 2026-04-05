import { Controller, Post, HttpCode, HttpStatus, Body, Param, UnauthorizedException, NotFoundException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { CalendarsService } from './calendars.service'
import { CreateCalendarDto } from 'src/calendars/dto/create-calendar.dto'
import { AccessCalendarDto } from './dto/access-calendar.dto'

@ApiTags('calendars')
@Controller('calendars')
export class CalendarsController {
  constructor(private readonly calendarsService: CalendarsService) {}

  @Post('create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a new calendar' })
  @ApiResponse({ status: 200, description: 'Calendar created' })
  async create(@Body() dto: CreateCalendarDto) {
    const { id, token } = await this.calendarsService.create(dto)
    return { success: !!id, data: { id, token } }
  }

  @Post(':calId/access')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate access to a calendar' })
  @ApiParam({ name: 'calId', type: String })
  @ApiResponse({ status: 200, description: 'Access granted, token returned' })
  @ApiResponse({ status: 401, description: 'Access denied' })
  async access(@Param('calId') calId: string, @Body() dto: AccessCalendarDto) {
    try {
      const { token, name } = await this.calendarsService.access(calId, dto)
      return { success: true, token, name }
    } catch (e) {
      if (e instanceof NotFoundException) {
        return { success: false, reason: 'Calendar not found' }
      }
      if (e instanceof UnauthorizedException) {
        return { success: false, reason: e.message }
      }
      return { success: false, reason: 'unknown' }
    }
  }
}
