import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Event, EventDocument } from './schemas/event.schema'
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'
import { generateEventId, validateCalendarId, validateEventId } from 'src/ids'

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name)
    private eventModel: Model<EventDocument>
  ) {}

  async create(calId: string, dto: CreateEventDto): Promise<Event | undefined> {
    if (!this.validCalendarId(calId) || !this.validateEvent(dto)) {
      return
    }

    const created = await this.eventModel.create({
      ...dto,
      id: generateEventId(),
      calId,
    })

    return this.cleanEvent(created)
  }

  async update(calId: string, eventId: string, dto: UpdateEventDto): Promise<boolean> {
    if (!this.validCalendarId(calId) || !this.validEventId(eventId) || !this.validateEvent(dto)) {
      return false
    }

    const result = await this.eventModel.updateOne({ calId, id: eventId }, dto).lean().exec()
    return result.modifiedCount === 1
  }

  async findAll(calId: string): Promise<Event[] | undefined> {
    if (!this.validCalendarId(calId)) {
      return undefined
    }

    const found = await this.eventModel.find({ calId }).lean().exec()
    return found.map(obj => this.cleanEvent(obj))
  }

  async delete(calId: string, eventId: string): Promise<boolean> {
    if (!this.validCalendarId(calId) || !this.validEventId(eventId)) {
      return false
    }

    const result = await this.eventModel.deleteOne({ calId, id: eventId }).lean().exec()
    return result.deletedCount === 1
  }

  async search(calId: string, query: string): Promise<Event[]> {
    if (!this.validCalendarId(calId)) {
      return []
    }

    return this.eventModel
      .find({
        calId,
        title: { $regex: query, $options: 'i' }
      })
      .limit(8)
      .lean()
      .exec()
  }

  async deleteAll(): Promise<boolean> {
    await this.eventModel.deleteMany().lean().exec()
    return true
  }

  private cleanEvent(event: Event): Event {
    const { id, calId, title, description, allDay, startTime, endTime, startZone, endZone, color, recurring, recurrenceRule, recurrenceEnd, recurringEventId, originalTime } = event
    return { id, calId, title, description, allDay, startTime, endTime, startZone, endZone, color, recurring, recurrenceRule, recurrenceEnd, recurringEventId, originalTime }
  }

  private validCalendarId(id: string) {
    const ret = validateCalendarId(id)
    if (!ret) {
      console.warn('invalid calendar ID', id)
    }
    return ret
  }

  private validEventId(id: string) {
    const ret = validateEventId(id)
    if (!ret) {
      console.warn('invalid event ID', id)
    }
    return ret
  }

  private validateEvent(dto: CreateEventDto | UpdateEventDto) {
    if (dto.allDay) {
      if (dto.startTime > dto.endTime) {
        console.warn('invalid end time before start time', { startTime: dto.startTime, endTime: dto.endTime })
        return false
      }
      if ((dto.startTime % 86400000) !== 0) {
        console.warn('invalid start time not lined to the day', dto.startTime)
        return false
      }
      if ((dto.endTime % 86400000) !== 0) {
        console.warn('invalid end time not lined to the day', dto.endTime)
        return false
      }
    }
    if (!dto.allDay) {
      if (dto.startTime >= dto.endTime) {
        console.warn('invalid start time not before end time', { startTime: dto.startTime, endTime: dto.endTime })
        return false
      }
      if ((dto.startTime % 60000) !== 0) {
        console.warn('invalid start time not lined up to the minute', dto.startTime)
        return false
      }
      if ((dto.endTime % 60000) !== 0) {
        console.warn('invalid end time not lined up to the minute', dto.endTime)
        return false
      }
    }

    dto.title = dto.title.trim()
    if (dto.title.length > 200) {
      console.warn('invalid title length too long', dto.title.length)
      return false
    }

    dto.description = (dto.description ?? '').trim()
    if (dto.description.length > 4000) {
      console.warn('invalid description length too long', dto.description.length)
      return false
    }

    return true
  }
}
