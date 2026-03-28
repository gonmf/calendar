import { Controller, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { EventsService } from './events.service'
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'
import { Event } from './schemas/event.schema'

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create an event' })
  @ApiResponse({ status: 200, type: Event })
  async create(@Body() dto: CreateEventDto) {
    const data = await this.eventsService.create(dto)
    return { success: true, data }
  }

  @Post('all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch all events' })
  @ApiResponse({ status: 200, type: [Event] })
  async findAll() {
    const data = await this.eventsService.findAll()
    return { success: true, data }
  }

  @Post('update/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an event' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Event updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    const success = await this.eventsService.update(id, dto)
    return { success }
  }

  @Post('delete/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an event' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Event deleted' })
  async delete(@Param('id') id: string) {
    const success = await this.eventsService.delete(id)
    return { success }
  }
}
