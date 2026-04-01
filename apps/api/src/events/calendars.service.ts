import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Calendar, CalendarDocument } from './schemas/calendar.schema'
import { generateId } from 'src/ids'

@Injectable()
export class CalendarsService {
  constructor(
    @InjectModel(Calendar.name)
    private calendarModel: Model<CalendarDocument>
  ) {}

  async create(): Promise<Calendar | undefined> {
    const created = await this.calendarModel.create({
      id: generateId('cal'),
      timeCreated: Date.now()
    })

    return this.cleanCalendar(created)
  }

  private cleanCalendar(calendar: Calendar): Calendar {
    const { id, timeCreated } = calendar
    return { id, timeCreated }
  }
}
