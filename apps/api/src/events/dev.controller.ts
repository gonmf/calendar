import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { EventsService } from './events.service'

@ApiTags('dev')
@Controller('dev')
export class DevController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('delete-all-events')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all events' })
  @ApiResponse({ status: 200, description: 'Events deleted' })
  async resetDb() {
    const success = await this.eventsService.deleteAll()
    return { success }
  }
}
