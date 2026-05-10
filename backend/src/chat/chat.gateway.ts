import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger, UseGuards } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { OnEvent } from '@nestjs/event-emitter'
import { ChatService } from './chat.service'
import { OpenRouterService } from '../openrouter/openrouter.service'
import { PrismaService } from '../common/prisma.service' // assumed global module

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server
  private readonly logger = new Logger(ChatGateway.name)

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly openRouter: OpenRouterService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token as string
    try {
      const payload = this.jwtService.verify(token)
      client.data.userId = payload.sub
      this.logger.log(`Client connected: ${client.id} (user ${payload.sub})`)
    } catch {
      client.disconnect()
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
  }

  @SubscribeMessage('chat.join')
  async handleJoin(client: Socket, payload: { sessionId: string }) {
    client.join(payload.sessionId)
    this.logger.log(`Client ${client.id} joined room ${payload.sessionId}`)
  }

  @SubscribeMessage('chat.message')
  async handleMessage(
    client: Socket,
    payload: { sessionId: string; content: string },
  ) {
    const userId = client.data.userId as string
    const session = await this.prisma.chatSession.findUnique({
      where: { id: payload.sessionId },
      include: { character: true, messages: { orderBy: { createdAt: 'asc' } } },
    })

    if (!session || session.userId !== userId) {
      client.emit('chat.error', { message: 'Session not found or forbidden' })
      return
    }

    // Save user message
    await this.prisma.message.create({
      data: {
        sessionId: payload.sessionId,
        role: 'USER',
        content: payload.content,
        modelUsed: session.selectedModel,
      },
    })

    // Broadcast user message
    this.server.to(payload.sessionId).emit('chat.message', payload)

    // Build OpenRouter messages: system prompt + history + new user message
    const messages = [
      { role: 'system' as const, content: session.character.systemPrompt },
      ...session.messages.map((m) => ({
        role: m.role.toLowerCase() as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: payload.content },
    ]

    const assistantMessageId = crypto.randomUUID()

    // Start assistant placeholder
    this.server.to(payload.sessionId).emit('chat.assistant.start', {
      messageId: assistantMessageId,
    })

    // Kick off streaming in background; errors handled via event emitter
    this.openRouter.streamCompletion({
      sessionId: payload.sessionId,
      messageId: assistantMessageId,
      messages,
      model: session.selectedModel,
    })
  }

  @OnEvent('chat.chunk')
  handleChunk(payload: {
    sessionId: string
    messageId: string
    chunk: string
    finishReason: string | null
  }) {
    this.server.to(payload.sessionId).emit('chat.chunk', payload)
  }

  @OnEvent('chat.error')
  handleError(payload: {
    sessionId: string
    messageId: string
    error: string
  }) {
    this.server.to(payload.sessionId).emit('chat.error', payload)
  }
}
