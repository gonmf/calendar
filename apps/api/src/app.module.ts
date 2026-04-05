import { Module } from '@nestjs/common';
import { EventsModule } from './events/events.module';
import { MongooseModule } from '@nestjs/mongoose';
import { DevModule } from './events/dev.module';
import { ConfigModule } from '@nestjs/config';
import { CalendarsModule } from './calendars/calendars.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot('mongodb://localhost:27017/calendar'),
    EventsModule,
    CalendarsModule,
    DevModule,
  ],
})
export class AppModule {}
