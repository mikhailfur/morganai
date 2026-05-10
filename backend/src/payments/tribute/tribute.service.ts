import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../common/prisma.service'
import { SubscriptionStatus, SubscriptionProvider } from '@prisma/client'
import crypto from 'crypto'

@Injectable()
export class TributeService {
  private readonly logger = new Logger(TributeService.name)

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleWebhook(signature: string, payload: Record<string, any>) {
    const secret = this.config.getOrThrow<string>('TRIBUTE_WEBHOOK_SECRET')
    const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex')

    if (signature !== expected) {
      throw new BadRequestException('Invalid Tribute webhook signature')
    }

    const event = payload.event as string
    const userId = payload.userId as string
    const paymentId = payload.paymentId as string
    const amountCents = payload.amountCents as number

    switch (event) {
      case 'payment.success': {
        // Tribute may not have subscription cycles; we extend premium by 30 days per successful payment
        const periodEnd = new Date()
        periodEnd.setDate(periodEnd.getDate() + 30)

        await this.prisma.subscription.create({
          data: {
            userId,
            provider: SubscriptionProvider.TRIBUTE,
            providerSubId: paymentId,
            status: SubscriptionStatus.ACTIVE,
            priceCents: amountCents,
            currentPeriodStart: new Date(),
            currentPeriodEnd: periodEnd,
          },
        })

        await this.prisma.user.update({
          where: { id: userId },
          data: { isPremium: true, premiumUntil: periodEnd },
        })

        this.logger.log(`Tribute payment accepted for user ${userId}`)
        break
      }
      case 'payment.failed': {
        this.logger.warn(`Tribute payment failed for user ${userId}`)
        break
      }
      default:
        this.logger.log(`Unhandled Tribute event: ${event}`)
    }

    return { received: true }
  }
}
