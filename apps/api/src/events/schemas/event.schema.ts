import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Document } from 'mongoose'

export type EventDocument = Event & Document

@Schema({ id: false, virtuals: false, minimize: false, timestamps: false, versionKey: false, autoIndex: true })
export class Event {
  @ApiProperty({ example: 'xjs09qf3h5m16f7t' })
  @Prop({ required: true, unique: true, index: true })
  id: string

  @ApiProperty({ example: 'eryu5rell9uwj825' })
  @Prop({ required: true, index: true })
  calId: string

  @ApiProperty({ example: 'Example event'})
  @Prop({ required: true })
  title: string

  @ApiProperty()
  @Prop()
  description: string

  /**
   * On All Day events, a one day event has the same start and end times,
   * lined up to the start of the day in UTC.
   * On events with time, a 10:00 to 11:00 events should start at ms 600000
   * and end at ms 660000 (added to the respective rest of the timestamp).
   */
  @ApiProperty({ example: true })
  @Prop({ required: true })
  allDay: boolean

  @ApiProperty({ example: 1767225600000 })
  @Prop({ required: true, index: true })
  startTime: number

  @ApiProperty({ example: 1767312000000 })
  @Prop({ required: true, index: true })
  endTime: number

  @ApiProperty({ example: 'UTC' })
  @Prop({ required: true })
  startZone: string

  @ApiProperty({ example: 'Europe/Lisbon' })
  @Prop({ required: true })
  endZone: string

  @ApiProperty()
  @Prop({ required: true })
  color: string

  @ApiProperty()
  @Prop({ required: true })
  recurring: boolean

  @ApiPropertyOptional()
  @Prop()
  recurrenceRule?: string

  @ApiPropertyOptional()
  @Prop()
  recurrenceEnd?: number

  @ApiPropertyOptional()
  @Prop()
  recurringEventId?: string

  @ApiPropertyOptional()
  @Prop()
  originalTime?: number
}

export const EventSchema = SchemaFactory.createForClass(Event)
