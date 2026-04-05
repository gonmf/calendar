import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Event, EventSchema } from './schemas/event.schema';
import { CalendarsModule } from 'src/calendars/calendars.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]), CalendarsModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
