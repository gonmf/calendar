import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import { Document } from 'mongoose'

export type EventDocument = Event & Document

@Schema({ id: false, virtuals: false, minimize: false, timestamps: false, versionKey: false, autoIndex: true })
export class Event {
  @ApiProperty({ example: 'evt_xjs09qf3h5m16f7t' })
  @Prop({ required: true, unique: true, index: true })
  id: string

  @ApiProperty({ example: 'cal_eryu5rell9uwj825' })
  @Prop({ required: true, index: true })
  calId: string

  @ApiProperty({ example: 'Example event'})
  @Prop({ required: true })
  title: string

  @ApiProperty()
  @Prop()
  description: string

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
}

export const EventSchema = SchemaFactory.createForClass(Event)
