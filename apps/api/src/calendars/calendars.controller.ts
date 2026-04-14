import { Controller, Post, HttpCode, HttpStatus, Body, Param, UnauthorizedException, NotFoundException, Get } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { CalendarsService } from './calendars.service'
import { CreateCalendarDto } from 'src/calendars/dto/create-calendar.dto'
import { AccessCalendarDto } from './dto/access-calendar.dto'
import { Throttle } from '@nestjs/throttler'
import { UpdateCalendarNameDto } from './dto/update-calendar-name.dto'
import { UpdateCalendarColorDto } from './dto/update-calendar-color.dto'
import { SetCalendarPasswordDto } from './dto/set-calendar-password.dto'

@ApiTags('calendars')
@Controller('calendars')
export class CalendarsController {
  constructor(private readonly calendarsService: CalendarsService) {}

  @Throttle({ default: { limit: 4, ttl: 2_000 } })
  @Post('create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a new calendar' })
  @ApiResponse({ status: 200, description: 'Calendar created' })
  async create(@Body() dto: CreateCalendarDto) {
    const { id, token } = await this.calendarsService.create(dto)
    return { success: !!id, data: { id, token } }
  }

  @Post(':calId/updateName')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update calendar name' })
  @ApiParam({ name: 'calId', type: String })
  @ApiResponse({ status: 200, description: 'Calendar updated' })
  async updateName(@Param('calId') calId: string, @Body() dto: UpdateCalendarNameDto) {
    const result = await this.calendarsService.updateName(calId, dto)
    return { success: result }
  }

  @Post(':calId/updateColor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update calendar color' })
  @ApiParam({ name: 'calId', type: String })
  @ApiResponse({ status: 200, description: 'Calendar updated' })
  async updateColor(@Param('calId') calId: string, @Body() dto: UpdateCalendarColorDto) {
    const result = await this.calendarsService.updateColor(calId, dto)
    return { success: result }
  }

  @Get(':calId/hasPassword')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Query if calendar has password' })
  @ApiParam({ name: 'calId', type: String })
  @ApiResponse({ status: 200 })
  async hasPassword(@Param('calId') calId: string) {
    const result = await this.calendarsService.hasPassword(calId)
    return { success: result !== undefined, hasPassword: result }
  }

  @Post(':calId/setPassword')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set calendar password' })
  @ApiParam({ name: 'calId', type: String })
  @ApiResponse({ status: 200 })
  async setPassword(@Param('calId') calId: string, @Body() dto: SetCalendarPasswordDto) {
    const result = await this.calendarsService.setPassword(calId, dto)
    return { success: result }
  }

  @Post(':calId/removePassword')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set calendar password' })
  @ApiParam({ name: 'calId', type: String })
  @ApiResponse({ status: 200 })
  async removePassword(@Param('calId') calId: string) {
    const result = await this.calendarsService.removePassword(calId)
    return { success: result }
  }

  @Post(':calId/delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete calendar' })
  @ApiParam({ name: 'calId', type: String })
  @ApiResponse({ status: 200, description: 'Calendar deleted' })
  async delete(@Param('calId') calId: string) {
    const result = await this.calendarsService.delete(calId)
    return { success: result }
  }

  @Post(':calId/access')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate access to a calendar' })
  @ApiParam({ name: 'calId', type: String })
  @ApiResponse({ status: 200, description: 'Access granted, token returned' })
  @ApiResponse({ status: 401, description: 'Access denied' })
  async access(@Param('calId') calId: string, @Body() dto: AccessCalendarDto) {
    try {
      const { token, name, color } = await this.calendarsService.access(calId, dto)
      return { success: true, token, name, color }
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
