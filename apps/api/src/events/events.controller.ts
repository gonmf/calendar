import { Controller, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { EventsService } from './events.service'
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'
import { Event } from './schemas/event.schema'
import { SearchEventDto } from './dto/search-event.dto'

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post(':calId/create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create an event' })
  @ApiParam({ name: 'calId', type: String })
  @ApiResponse({ status: 200, type: Event })
  async create(@Param('calId') calId: string, @Body() dto: CreateEventDto) {
    const data = await this.eventsService.create(calId, dto)
    return { success: !!data, data }
  }

  @Post(':calId/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch all events' })
  @ApiParam({ name: 'calId', type: String })
  @ApiResponse({ status: 200, type: [Event] })
  async findAll(@Param('calId') calId: string) {
    const data = await this.eventsService.findAll(calId)
    return { success: !!data, data: data ?? [] }
  }

  @Post(':calId/update/:eventId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an event' })
  @ApiParam({ name: 'calId', type: String })
  @ApiParam({ name: 'eventId', type: String })
  @ApiResponse({ status: 200, description: 'Event updated' })
  async update(@Param('calId') calId: string, @Param('eventId') eventId: string, @Body() dto: UpdateEventDto) {
    const success = await this.eventsService.update(calId, eventId, dto)
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
    return { success }
  }

  @Post(':calId/search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search events' })
  @ApiParam({ name: 'calId', type: String })
  async search(@Param('calId') calId: string, @Body() dto: SearchEventDto) {
    const data = await this.eventsService.search(calId, dto.query)
    return { success: true, data }
  }
}
