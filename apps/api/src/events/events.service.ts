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

  async create(dto: CreateEventDto): Promise<Event | undefined> {
    if (!this.validateEvent(dto)) {
      return
    }

    const created = await this.eventModel.create({
      ...dto,
      id: this.generateId(),
    })
    return this.cleanEvent(created)
  }

  async update(id: string, dto: UpdateEventDto): Promise<boolean> {
    if (!this.validEventId(id) || !this.validateEvent(dto)) {
      return false
    }

    const result = await this.eventModel.updateOne({ id }, { ...dto, id }).exec()
    return result.modifiedCount === 1
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

  async findAll(): Promise<Event[]> {
    const found = await this.eventModel.find().lean().exec()
    return found.map(obj => this.cleanEvent(obj))
  }

  async delete(id: string): Promise<boolean> {
    if (!this.validEventId(id)) {
      return false
    }

    const result = await this.eventModel.deleteOne({ id }).exec()
    return result.deletedCount === 1
  }

  async deleteAll(): Promise<boolean> {
    await this.eventModel.deleteMany().lean().exec()
    return true
  }

  private cleanEvent(event: Event): Event {
    const { id, title, description, allDay, startTime, endTime, startZone, endZone, color } = event
    return { id, title, description, allDay, startTime, endTime, startZone, endZone, color }
  }

  private generateId() {
    return `evt_${generateRandomString(16)}`
  }

  private validEventId(id: string) {
    return id.length === 20 && id.startsWith('evt_')
  }
}
