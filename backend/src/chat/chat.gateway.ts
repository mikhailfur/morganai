import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AiService } from '../ai/ai.service'

interface ChatMessage {
  sessionId: string
  content: string
  imageUrl?: string
  audioBlob?: Buffer
}

interface AuthenticatedSocket extends Socket {
  userId?: string
  sessionId?: string
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(ChatGateway.name)
  private activeSessions = new Map<string, { userId: string; characterId: string }>()

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth.token
      if (!token) {
        client.disconnect()
        return
      }

      // Verify JWT token (implement your auth logic)
      const user = await this.prisma.user.findFirst({
        where: { /* verify token */ },
      })

      if (!user) {
        client.disconnect()
        return
      }

      client.userId = user.id
      this.logger.log(`Client connected: ${client.id}, User: ${user.id}`)
    } catch (error) {
      this.logger.error('Connection error:', error)
      client.disconnect()
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`)
    if (client.sessionId) {
      this.activeSessions.delete(client.sessionId)
    }
  }

  @SubscribeMessage('join_session')
  async handleJoinSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    const { sessionId } = data

    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { character: true, user: true },
    })

    if (!session || session.userId !== client.userId) {
      client.emit('error', { message: 'Unauthorized or session not found' })
      return
    }

    client.join(sessionId)
    client.sessionId = sessionId
    this.activeSessions.set(client.id, {
      userId: session.userId,
      characterId: session.characterId,
    })

    // Send chat history
    const messages = await this.prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    })

    client.emit('session_history', messages)
    this.logger.log(`User ${client.userId} joined session ${sessionId}`)
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: ChatMessage,
  ) {
    const sessionInfo = this.activeSessions.get(client.id)
    if (!sessionInfo) {
      client.emit('error', { message: 'No active session' })
      return
    }

    const { userId, characterId } = sessionInfo
    const { sessionId, content, imageUrl, audioBlob } = data

    try {
      // Get character with system_prompt
      const character = await this.prisma.character.findUnique({
        where: { id: characterId },
      })

      if (!character) {
        client.emit('error', { message: 'Character not found' })
        return
      }

      // Check subscription limits
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { subscriptions: true },
      })

      if (user && user.messageCount >= user.messageLimit) {
        client.emit('error', { message: 'Message limit reached. Please upgrade.' })
        return
      }

      // Process voice message if present
      let messageContent = content
      if (audioBlob) {
        messageContent = await this.aiService.transcribeAudio(audioBlob)
      }

      // Save user message
      const userMessage = await this.prisma.message.create({
        data: {
          content: messageContent,
          role: 'USER',
          imageUrl,
          sessionId,
        },
      })

      client.emit('message_saved', userMessage)

      // Get conversation history
      const history = await this.prisma.message.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: 20, // Last 20 messages for context
      })

      // Emit typing indicator
      client.emit('ai_typing', { status: true })

      // Generate AI response with system_prompt
      const aiResponse = await this.aiService.generateResponse({
        systemPrompt: character.systemPrompt,
        welcomeMessage: character.welcomeMessage,
        history: history.map(msg => ({
          role: msg.role.toLowerCase(),
          content: msg.content,
        })),
        userMessage: messageContent,
        imageUrl,
      })

      // Save AI response
      const assistantMessage = await this.prisma.message.create({
        data: {
          content: aiResponse.text,
          role: 'ASSISTANT',
          sessionId,
        },
      })

      // Update user message count
      await this.prisma.user.update({
        where: { id: userId },
        data: { messageCount: { increment: 1 } },
      })

      // Stop typing indicator
      client.emit('ai_typing', { status: false })

      // Send response
      client.emit('message_received', assistantMessage)

      // Handle voice response if user has access
      const activeSub = user?.subscriptions.find(s => s.hasVoiceAccess && s.expiresAt > new Date())
      if (activeSub && aiResponse.text) {
        const audioBuffer = await this.aiService.textToSpeech(aiResponse.text)
        client.emit('voice_response', {
          messageId: assistantMessage.id,
          audio: audioBuffer.toString('base64'),
        })
      }
    } catch (error) {
      this.logger.error('Message handling error:', error)
      client.emit('error', { message: 'Failed to process message' })
      client.emit('ai_typing', { status: false })
    }
  }

  @SubscribeMessage('leave_session')
  handleLeaveSession(@ConnectedSocket() client: AuthenticatedSocket) {
    if (client.sessionId) {
      client.leave(client.sessionId)
      this.activeSessions.delete(client.id)
      client.sessionId = undefined
      this.logger.log(`User left session`)
    }
  }
}
