import { ThrottlerGuard } from '@nestjs/throttler'
import { Injectable } from '@nestjs/common'

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    if (req.params?.calId) {
      console.log(`cal:${req.params.calId}`)
      return Promise.resolve(`cal:${req.params.calId}`)
    }

    console.log(req.ip)
    return Promise.resolve(req.ip)
  }
}
