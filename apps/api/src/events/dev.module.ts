import { Module } from '@nestjs/common';
import { EventsModule } from './events.module';
import { DevController } from './dev.controller';
import { CalendarsModule } from 'src/calendars/calendars.module';

@Module({
  controllers: [DevController],
  imports: [EventsModule, CalendarsModule],
})
export class DevModule {}
