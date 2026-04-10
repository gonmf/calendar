import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Event, EventDocument } from './schemas/event.schema'
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'
import { generateEventId, validateCalendarId, validateEventId } from 'src/ids'
import { UpdateEventColorDto } from './dto/update-event-color.dto'

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

    const { title, description, allDay, startTime, endTime, startZone, endZone, color, recurring, recurrenceRule, recurrenceEnd, recurringEventId, originalTime } = dto

    const id = generateEventId()
    await this.eventModel.create({
      id,
      calId,
      title,
      description,
      allDay,
      startTime,
      endTime,
      startZone,
      endZone,
      color,
      recurring,
      recurrenceRule,
      recurringEventId,
      originalTime,
    })
    const created = await this.eventModel.findOne({ id }).lean().exec()

    return created ? this.cleanEvent(created) : undefined
  }

  async update(calId: string, eventId: string, dto: UpdateEventDto): Promise<boolean> {
    if (!this.validCalendarId(calId) || !this.validEventId(eventId) || !this.validateEvent(dto)) {
      return false
    }

    const { title, description, allDay, startTime, endTime, startZone, endZone, color, recurring, recurrenceRule, recurrenceEnd, recurringEventId, originalTime } = dto

    const result = await this.eventModel.updateOne({ calId, id: eventId, timeDeleted: null }, { title, description, allDay, startTime, endTime, startZone, endZone, color, recurring, recurrenceRule, recurrenceEnd, recurringEventId, originalTime }).lean().exec()
    return result.modifiedCount === 1
  }

  async updateColor(calId: string, eventId: string, dto: UpdateEventColorDto): Promise<boolean> {
    if (!this.validCalendarId(calId) || !this.validEventId(eventId)) {
      return false
    }

    const { color } = dto

    const result = await this.eventModel.updateOne({ calId, id: eventId, timeDeleted: null }, { color }).lean().exec()
    return result.modifiedCount === 1
  }

  async findAll(calIds: string[]): Promise<Event[] | undefined> {
    if (calIds.length === 0 || calIds.some(calId => !this.validCalendarId(calId))) {
      return undefined
    }

    const found = await this.eventModel.find({
      ...(calIds.length === 1 ? { calId: calIds[0] } : { calId: { $in: calIds }}),
      timeDeleted: null
    }).lean().exec()
    return found.map(obj => this.cleanEvent(obj))
  }

  async delete(calId: string, eventId: string): Promise<boolean> {
    if (!this.validCalendarId(calId) || !this.validEventId(eventId)) {
      return false
    }

    const result = await this.eventModel.updateOne({ calId, id: eventId, timeDeleted: null }, { timeDeleted: Date.now() }).lean().exec()
    return result.modifiedCount === 1
  }

  async undoDelete(calId: string, eventId: string): Promise<Event | undefined> {
    if (!this.validCalendarId(calId) || !this.validEventId(eventId)) {
      return
    }

    const result = await this.eventModel.updateOne({ calId, id: eventId }, { timeDeleted: null }).lean().exec()
    if (result.modifiedCount !== 1) {
      return
    }

    const event = await this.eventModel.findOne({ calId, id: eventId, timeDeleted: null }).lean().exec()
    return event ? this.cleanEvent(event) : undefined
  }

  async search(calIds: string[], query: string): Promise<Event[] | undefined> {
    if (calIds.some(calId => !this.validCalendarId(calId))) {
      return undefined
    }

    return this.eventModel
      .find({
        ...(calIds.length === 1 ? { calId: calIds[0] } : { calId: { $in: calIds } }),
        title: { $regex: query, $options: 'i' },
        recurringEventId: null,
        timeDeleted: null,
      })
      .limit(8)
      .lean()
      .exec()
  }

  async deleteAll(): Promise<boolean> {
    await this.eventModel.deleteMany().lean().exec()
    return true
  }

  async markDeletedByCalendarId(calendarIds: string[]) {
    if (calendarIds.length) {
      await this.eventModel.updateMany({ calId: { $in: calendarIds }, timeDeleted: null }, { timeDeleted: Date.now() }).lean().exec()
    }
  }

  async deleteAllMarkedDeletedForSomeTime() {
    const cutoff = Date.now() - 86400 * 1000

    await this.eventModel.deleteMany({ timeDeleted: { $lt: cutoff } })
  }

  private cleanEvent(event: Event): Event {
    const { _id, ...rest } = event as unknown as Record<string, unknown>
    return rest as unknown as Event
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
