import { Module } from '@nestjs/common';
import { EventsModule } from './events/events.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CalendarsModule } from './events/calendars.module';
import { DevModule } from './events/dev.module';
import { ConfigModule } from '@nestjs/config';

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
