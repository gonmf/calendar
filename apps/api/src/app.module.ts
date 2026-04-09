import { Module } from '@nestjs/common';
import { EventsModule } from './events/events.module';
import { MongooseModule } from '@nestjs/mongoose';
import { DevModule } from './events/dev.module';
import { ConfigModule } from '@nestjs/config';
import { CalendarsModule } from './calendars/calendars.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRoot('mongodb://localhost:27017/calendar'),
    EventsModule,
    CalendarsModule,
    DevModule,
  ],
})
export class AppModule {}
