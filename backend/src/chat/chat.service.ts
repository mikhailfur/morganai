import { Injectable } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId: string, characterId: string, selectedModel: string) {
    return this.prisma.chatSession.create({
      data: { userId, characterId, selectedModel },
    })
  }

  async getSessionWithMessages(sessionId: string, userId: string) {
    return this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        character: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })
  }

  async updateModel(sessionId: string, userId: string, model: string) {
    return this.prisma.chatSession.updateMany({
      where: { id: sessionId, userId },
      data: { selectedModel: model },
    })
  }
}
