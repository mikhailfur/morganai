import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../common/prisma.service'
import { SubscriptionStatus, SubscriptionProvider } from '@prisma/client'

// In a real app, import Stripe from 'stripe' and use stripe.webhooks.constructEvent
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name)
  // private readonly stripe: Stripe

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // this.stripe = new Stripe(config.getOrThrow('STRIPE_SECRET_KEY'), { apiVersion: '2024-04-10' })
  }

  async createCheckoutSession(userId: string, priceId: string) {
    // const session = await this.stripe.checkout.sessions.create({
    //   mode: 'subscription',
    //   customer_email: ...,
    //   line_items: [{ price: priceId, quantity: 1 }],
    //   success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    //   cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
    //   metadata: { userId },
    // })
    // return { url: session.url }
    return { url: `https://checkout.stripe.com/pay/${priceId}?client_reference_id=${userId}` }
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const secret = this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET')
    try {
      // const event = this.stripe.webhooks.constructEvent(payload, signature, secret)
      const event = JSON.parse(payload.toString()) as { type: string; data: { object: any } }

      switch (event.type) {
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object
          // const subId = invoice.subscription as string
          // const userId = invoice.metadata?.userId as string
          // const periodEnd = new Date(invoice.lines.data[0].period.end * 1000)
          this.logger.log('Stripe payment succeeded — sync subscription in DB')
          // await this.upsertSubscription(userId, subId, periodEnd)
          break
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object
          // await this.cancelSubscription(subscription.id as string)
          this.logger.log('Stripe subscription cancelled')
          break
        }
        default:
          this.logger.log(`Unhandled Stripe event: ${event.type}`)
      }

      return { received: true }
    } catch (err) {
      this.logger.error(`Stripe webhook error: ${err}`)
      throw new BadRequestException('Invalid webhook signature')
    }
  }

  private async upsertSubscription(userId: string, providerSubId: string, periodEnd: Date, priceCents?: number) {
    await this.prisma.subscription.upsert({
      where: { providerSubId },
      update: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: periodEnd,
        updatedAt: new Date(),
      },
      create: {
        userId,
        provider: SubscriptionProvider.STRIPE,
        providerSubId,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: periodEnd,
        priceCents,
      },
    })

    await this.prisma.user.update({
      where: { id: userId },
      data: { isPremium: true, premiumUntil: periodEnd },
    })
  }

  private async cancelSubscription(providerSubId: string) {
    await this.prisma.subscription.updateMany({
      where: { providerSubId },
      data: { status: SubscriptionStatus.CANCELLED },
    })
  }
}
