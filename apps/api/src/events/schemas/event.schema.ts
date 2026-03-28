import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Document } from 'mongoose'

export type EventDocument = Event & Document

@Schema({ id: false, virtuals: false, minimize: false, timestamps: false, versionKey: false, autoIndex: true })
export class Event {
  @ApiProperty({ example: 'evt_xjs09qf3h5m16f7t' })
  @Prop({ required: true, unique: true, index: true })
  id: string

  @ApiProperty({ example: 'Example event'})
  @Prop({ required: true })
  title: string

  @ApiPropertyOptional()
  @Prop()
  description?: string

  @ApiProperty({ example: 1767225600000 })
  @Prop({ required: true, index: true })
  time: number

  @ApiProperty({ example: 'Europe/Lisbon' })
  @Prop({ required: true })
  zone: string
}

export const EventSchema = SchemaFactory.createForClass(Event)
