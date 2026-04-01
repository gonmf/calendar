import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { CalendarsController } from './calendars.controller'
import { CalendarsService } from './calendars.service'
import { Calendar, CalendarSchema } from './schemas/calendar.schema'

@Module({
  imports: [MongooseModule.forFeature([{ name: Calendar.name, schema: CalendarSchema }])],
  controllers: [CalendarsController],
  providers: [CalendarsService],
})
export class CalendarsModule {}
