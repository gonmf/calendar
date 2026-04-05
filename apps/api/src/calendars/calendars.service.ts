import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { JwtService } from '@nestjs/jwt'
import { Model } from 'mongoose'
import * as bcrypt from 'bcrypt'
import { Calendar, CalendarDocument } from './schemas/calendar.schema'
import { CreateCalendarDto } from './dto/create-calendar.dto'
import { AccessCalendarDto } from './dto/access-calendar.dto'
import { generateCalendarId, validateCalendarId } from 'src/ids'

const SALT_ROUNDS = 12

@Injectable()
export class CalendarsService {
  constructor(
    @InjectModel(Calendar.name) private calendarModel: Model<CalendarDocument>,
    private jwtService: JwtService
  ) {}

  async create(dto: CreateCalendarDto): Promise<{ id?: string, token?: string }> {
    let password: string | undefined
    let salt: string | undefined

    if (dto.password) {
      salt = await bcrypt.genSalt(SALT_ROUNDS)
      password = await bcrypt.hash(dto.password, salt)
    }

    const now = Date.now()
    const created = await this.calendarModel.create({
      id: generateCalendarId(),
      name: dto.name,
      password,
      salt,
      timeCreated: now,
      timeUpdated: now,
    })

    const token = this.issueToken(created.id, password ?? null)

    return { id: created.id, token }
  }

  async access(calId: string, dto: AccessCalendarDto): Promise<string> {
    if (!validateCalendarId(calId)) {
      throw new NotFoundException('Calendar not found')
    }
    const calendar = await this.calendarModel.findOne({ id: calId }).exec()
    if (!calendar) {
      throw new NotFoundException('Calendar not found')
    }

    // no password required — issue token immediately
    if (!calendar.password) {
      return this.issueToken(calId, null)
    }

    // existing token provided — validate it
    if (dto.token) {
      try {
        const payload = await this.jwtService.verifyAsync(dto.token)
        if (payload.calId === calId && payload.passwordHash === calendar.password) {
          return this.issueToken(calId, calendar.password)
        }
      } catch {
        // token invalid or expired — fall through to password check
      }
    }

    // password provided — verify it
    if (dto.password) {
      const match = await bcrypt.compare(dto.password, calendar.password)
      if (match) {
        return this.issueToken(calId, calendar.password)
      }
      throw new UnauthorizedException('wrong_password')
    }

    throw new UnauthorizedException('password_required')
  }

  async updateTimeUpdated(calId: string) {
    await this.calendarModel.updateOne({ calId }, { timeUpdated: Date.now() })
  }

  private issueToken(calId: string, passwordHash: string | null): string {
    return this.jwtService.sign({ calId, passwordHash })
  }
}
