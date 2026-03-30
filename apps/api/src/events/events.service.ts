import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Event, EventDocument } from './schemas/event.schema'
import { CreateEventDto } from './dto/create-event.dto'
import { generateRandomString } from 'src/constants'
import { UpdateEventDto } from './dto/update-event.dto'

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
      id: this.generateId(),
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

  async findAll(calId: string): Promise<Event[]> {
    if (!this.validCalendarId(calId)) {
      return []
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

  private generateId() {
    return `evt_${generateRandomString(16)}`
  }

  private validCalendarId(id: string) {
    return id.length === 20 && id.startsWith('cal_')
  }

  private validEventId(id: string) {
    return id.length === 20 && id.startsWith('evt_')
  }

  private validateEvent(dto: CreateEventDto | UpdateEventDto) {
    if (dto.startTime >= dto.endTime) {
      return false
    }
    if (dto.title.length > 200 || dto.description.length > 4000) {
      return false
    }

    dto.title = dto.title.trim()
    dto.description = (dto.description ?? '').trim()

    return true
  }
}
