import { Controller, Post, Body, Headers, RawBody } from '@nestjs/common'
import { StripeService } from './stripe.service'

@Controller('payments/stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('create-checkout-session')
  async createCheckoutSession(@Body('userId') userId: string, @Body('priceId') priceId: string) {
    return this.stripeService.createCheckoutSession(userId, priceId)
  }
}

@Controller('payments/stripe/webhook')
export class StripeWebhookController {
  constructor(private readonly stripeService: StripeService) {}

  @Post()
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @RawBody() payload: Buffer,
  ) {
    return this.stripeService.handleWebhook(signature, payload)
  }
}
