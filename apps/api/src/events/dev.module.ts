import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsModule } from './events.module';
import { DevController } from './dev.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { EventSchema } from './schemas/event.schema';

@Module({
  controllers: [DevController],
  imports: [MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]), EventsModule],
  providers: [EventsService],
})
export class DevModule {}
