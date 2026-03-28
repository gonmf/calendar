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

  async create(dto: CreateEventDto): Promise<Event> {
    const created = await this.eventModel.create({
      ...dto,
      id: this.generateId(),
    })
    return this.cleanObject(created)
  }

  async update(id: string, dto: UpdateEventDto): Promise<boolean> {
    if (!this.validEventId(id)) {
      return false
    }

    const result = await this.eventModel.updateOne({ id }, { ...dto, id }).exec()
    return result.modifiedCount === 1
  }

  async findAll(): Promise<Event[]> {
    const found = await this.eventModel.find().lean().exec()
    return found.map(obj => this.cleanObject(obj))
  }

  async delete(id: string): Promise<boolean> {
    if (!this.validEventId(id)) {
      return false
    }

    const result = await this.eventModel.deleteOne({ id }).exec()
    return result.deletedCount === 1
  }

  private cleanObject(obj: Event): Event {
    const { _id, ...rest } = obj as unknown as Record<string, unknown>
    return rest as unknown as Event
  }

  private generateId() {
    return `evt_${generateRandomString(16)}`
  }

  private validEventId(id: string) {
    return id.length === 20 && id.startsWith('evt_')
  }
}
