import { forwardRef, Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { JwtModule } from '@nestjs/jwt'
import { CalendarsController } from './calendars.controller'
import { CalendarsService } from './calendars.service'
import { Calendar, CalendarSchema } from './schemas/calendar.schema'
import { ConfigModule } from '@nestjs/config'
import { EventsModule } from 'src/events/events.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forFeature([{ name: Calendar.name, schema: CalendarSchema }]),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? '',
      signOptions: { expiresIn: '90d' },
    }),
    forwardRef(() => EventsModule),
  ],
  controllers: [CalendarsController],
  providers: [CalendarsService],
  exports: [CalendarsService],
})
export class CalendarsModule {}
