import { Controller, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { EventsService } from './events.service'
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'
import { SearchEventDto } from './dto/search-event.dto'
import { CalendarsService } from 'src/calendars/calendars.service'
import { UpdateEventColorDto } from './dto/update-event-color.dto'
import { uniq } from 'rambda'

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly calendarsService: CalendarsService,
  ) {}

  @Post(':calId/create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create an event' })
  @ApiParam({ name: 'calId', type: String })
  @ApiResponse({ status: 200, description: 'Event created' })
  async create(@Param('calId') calId: string, @Body() dto: CreateEventDto) {
    const data = await this.eventsService.create(calId, dto)
    const success = !!data
    if (success) {
      await this.calendarUpdated(calId)
    }
    return { success, data }
  }

  @Post(':calId/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch all events' })
  @ApiParam({ name: 'calId', type: String })
  @ApiResponse({ status: 200, description: 'All events' })
  async findAll(@Param('calId') calIdsStr: string) {
    const calIds = uniq(calIdsStr.split('_').map(s => s.trim()).filter(s => s))
    if (calIds.length === 0) {
      return { success: false, data: [] }
    }

    const events = await this.eventsService.findAll(calIds)

    return { success: !!events, data: events ?? [] }
  }

  @Post(':calId/update/:eventId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an event' })
  @ApiParam({ name: 'calId', type: String })
  @ApiParam({ name: 'eventId', type: String })
  @ApiResponse({ status: 200, description: 'Event updated' })
  async update(@Param('calId') calId: string, @Param('eventId') eventId: string, @Body() dto: UpdateEventDto) {
    const success = await this.eventsService.update(calId, eventId, dto)
    if (success) {
      await this.calendarUpdated(calId)
    }
    return { success }
  }

  @Post(':calId/updateColor/:eventId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an event' })
  @ApiParam({ name: 'calId', type: String })
  @ApiParam({ name: 'eventId', type: String })
  @ApiResponse({ status: 200, description: 'Event updated' })
  async updateColor(@Param('calId') calId: string, @Param('eventId') eventId: string, @Body() dto: UpdateEventColorDto) {
    const success = await this.eventsService.updateColor(calId, eventId, dto)
    if (success) {
      await this.calendarUpdated(calId)
    }
    return { success }
  }

  @Post(':calId/delete/:eventId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an event' })
  @ApiParam({ name: 'calId', type: String })
  @ApiParam({ name: 'eventId', type: String })
  @ApiResponse({ status: 200, description: 'Event deleted' })
  async delete(@Param('calId') calId: string, @Param('eventId') eventId: string) {
    const success = await this.eventsService.delete(calId, eventId)
    if (success) {
      await this.calendarUpdated(calId)
    }
    return { success }
  }

  @Post(':calId/undoDelete/:eventId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Undo the recent deletion of an event' })
  @ApiParam({ name: 'calId', type: String })
  @ApiParam({ name: 'eventId', type: String })
  @ApiResponse({ status: 200, description: 'Event not longer deleted' })
  async undoDelete(@Param('calId') calId: string, @Param('eventId') eventId: string) {
    const event = await this.eventsService.undoDelete(calId, eventId)
    if (event) {
      await this.calendarUpdated(calId)
    }
    return { success: !!event, data: event }
  }

  @Post(':calId/search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search events' })
  @ApiParam({ name: 'calId', type: String })
  async search(@Param('calId') calIdsStr: string, @Body() dto: SearchEventDto) {
    const calIds = uniq(calIdsStr.split('_').map(s => s.trim()).filter(s => s))
    if (calIds.length === 0) {
      return { success: false, data: [] }
    }

    const events = await this.eventsService.search(calIds, dto.query)
    return { success: !!events, data: events ?? [] }
  }

  private async calendarUpdated(calId: string) {
    await this.calendarsService.updateTimeUpdated(calId)
  }
}
