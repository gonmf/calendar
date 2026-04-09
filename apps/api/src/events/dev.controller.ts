import { Controller, Post, HttpCode, HttpStatus, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { EventsService } from './events.service'
import { BearerTokenGuard } from 'src/auth/bearer-token.guard'

@ApiTags('dev')
@Controller('dev')
@ApiBearerAuth()
@UseGuards(BearerTokenGuard)
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
