import { Controller, Post, Headers, Body } from '@nestjs/common'
import { TributeService } from './tribute.service'

@Controller('payments/tribute/webhook')
export class TributeWebhookController {
  constructor(private readonly tributeService: TributeService) {}

  @Post()
  async handleWebhook(
    @Headers('x-tribute-signature') signature: string,
    @Body() payload: Record<string, any>,
  ) {
    return this.tributeService.handleWebhook(signature, payload)
  }
}
