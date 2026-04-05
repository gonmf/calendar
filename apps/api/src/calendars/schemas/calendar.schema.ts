import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import { Document } from 'mongoose'

export type CalendarDocument = Calendar & Document

@Schema({ id: false, virtuals: false, minimize: false, timestamps: false, versionKey: false, autoIndex: true })
export class Calendar {
  @ApiProperty({ example: 'xjs09qf3h5m16f7t' })
  @Prop({ required: true, unique: true, index: true })
  id: string

  @ApiProperty({ example: 'warm lake' })
  @Prop({ required: true })
  name: string

  @ApiProperty({ example: 1767312000000 })
  @Prop({ required: true, index: true })
  timeCreated: number

  @Prop({ required: true, index: true })
  timeUpdated: number

  @Prop()
  password?: string

  @Prop()
  salt?: string
}

export const CalendarSchema = SchemaFactory.createForClass(Calendar)
