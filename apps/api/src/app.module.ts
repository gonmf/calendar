import { Module } from '@nestjs/common';
import { EventsModule } from './events/events.module';
import { MongooseModule } from '@nestjs/mongoose';
import { DevModule } from './events/dev.module';
import { ConfigModule } from '@nestjs/config';
import { CalendarsModule } from './calendars/calendars.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRoot('mongodb://localhost:27017/calendar'),
    ThrottlerModule.forRoot([{
      name: 'default',
      limit: 8,
      ttl: 2_000,
    }]),
    EventsModule,
    CalendarsModule,
    DevModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
