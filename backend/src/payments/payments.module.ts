import { Module } from '@nestjs/common'
import { StripeController, StripeWebhookController } from './stripe/stripe.controller'
import { StripeService } from './stripe/stripe.service'
import { TributeWebhookController } from './tribute/tribute.webhook.controller'
import { TributeService } from './tribute/tribute.service'

@Module({
  controllers: [StripeController, StripeWebhookController, TributeWebhookController],
  providers: [StripeService, TributeService],
  exports: [StripeService, TributeService],
})
export class PaymentsModule {}
