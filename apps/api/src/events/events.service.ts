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
    if (!validateCalendarId(calId) || !this.validateEvent(dto)) {
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
    if (!validateCalendarId(calId) || !validateEventId(eventId) || !this.validateEvent(dto)) {
      return false
    }

    const { title, description, allDay, startTime, endTime, startZone, endZone, color, recurring, recurrenceRule, recurrenceEnd, recurringEventId, originalTime } = dto

    const result = await this.eventModel.updateOne({ calId, id: eventId, timeDeleted: null }, { title, description, allDay, startTime, endTime, startZone, endZone, color, recurring, recurrenceRule, recurrenceEnd, recurringEventId, originalTime }).lean().exec()
    return result.modifiedCount === 1
  }

  async updateColor(calId: string, eventId: string, dto: UpdateEventColorDto): Promise<boolean> {
    if (!validateCalendarId(calId) || !validateEventId(eventId)) {
      return false
    }

    const { color } = dto

    const result = await this.eventModel.updateOne({ calId, id: eventId, timeDeleted: null }, { color }).lean().exec()
    return result.modifiedCount === 1
  }

  async findAll(calIds: string[]): Promise<Event[] | undefined> {
    if (calIds.length === 0 || calIds.some(calId => !validateCalendarId(calId))) {
      return undefined
    }

    const found = await this.eventModel.find({
      ...(calIds.length === 1 ? { calId: calIds[0] } : { calId: { $in: calIds }}),
      timeDeleted: null
    }).lean().exec()
    return found.map(obj => this.cleanEvent(obj))
  }

  async delete(calId: string, eventId: string): Promise<boolean> {
    if (!validateCalendarId(calId) || !validateEventId(eventId)) {
      return false
    }

    const result = await this.eventModel.updateOne({ calId, id: eventId, timeDeleted: null }, { timeDeleted: Date.now() }).lean().exec()
    return result.modifiedCount === 1
  }

  async undoDelete(calId: string, eventId: string): Promise<Event | undefined> {
    if (!validateCalendarId(calId) || !validateEventId(eventId)) {
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
    if (calIds.some(calId => !validateCalendarId(calId))) {
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

  private validateEvent(dto: CreateEventDto | UpdateEventDto) {
    if (dto.allDay) {
      if (dto.startTime > dto.endTime) {
        return false
      }
      if ((dto.startTime % 86400000) !== 0) {
        return false
      }
      if ((dto.endTime % 86400000) !== 0) {
        return false
      }
    }
    if (!dto.allDay) {
      if (dto.startTime >= dto.endTime) {
        return false
      }
      if ((dto.startTime % 60000) !== 0) {
        return false
      }
      if ((dto.endTime % 60000) !== 0) {
        return false
      }
    }

    return true
  }
}
