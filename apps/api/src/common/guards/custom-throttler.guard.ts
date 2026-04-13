import { ThrottlerGuard } from '@nestjs/throttler'
import { Injectable } from '@nestjs/common'

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    return Promise.resolve(req.params.calId || req.ip)
  }
}
