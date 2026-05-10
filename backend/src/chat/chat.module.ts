import { Module } from '@nestjs/common'
import { ChatGateway } from './chat.gateway'
import { ChatService } from './chat.service'
import { OpenRouterModule } from '../openrouter/openrouter.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [OpenRouterModule, AuthModule],
  providers: [ChatGateway, ChatService],
  exports: [ChatService],
})
export class ChatModule {}
