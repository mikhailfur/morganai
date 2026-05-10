import { Module } from '@nestjs/common'
import { ChatGateway } from './chat.gateway'
import { AiService } from '../ai/ai.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  providers: [ChatGateway, AiService],
  imports: [PrismaModule],
})
export class ChatModule {}
