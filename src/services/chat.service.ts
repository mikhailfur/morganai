import type pino from 'pino';
import { chatCompletion } from '../providers/openrouter/chat.js';
import { transcribeAudio } from '../providers/openrouter/transcription.js';
import type { ContextManager } from '../memory/context-manager.js';
import type { MessageRepository } from '../database/repositories/message.repository.js';
import type { CharacterService } from './character.service.js';
import type { User } from '../database/schema.js';
import type { OpenRouterMessage } from '../providers/openrouter/types.js';

export class ChatService {
  constructor(
    private contextManager: ContextManager,
    private messageRepo: MessageRepository,
    private characterService: CharacterService,
    private logger: pino.Logger,
  ) {}

  async processText(user: User, text: string): Promise<string> {
    return this.process(user, text, 'text');
  }

  async processPhoto(user: User, imageBase64: string, caption?: string): Promise<string> {
    const content: OpenRouterMessage['content'] = [
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      { type: 'text', text: caption ?? 'Что на этом фото?' },
    ];
    return this.process(user, content, 'image');
  }

  async processVoice(user: User, audioBuffer: Buffer): Promise<string> {
    const transcribed = await transcribeAudio(audioBuffer, 'voice.ogg');
    this.logger.info({ userId: user.id }, 'Voice transcribed');
    return this.process(user, transcribed, 'voice');
  }

  private async process(
    user: User,
    content: OpenRouterMessage['content'],
    mediaType: 'text' | 'image' | 'voice',
  ): Promise<string> {
    const character = await this.characterService.getForUser(user.activeCharId);
    const chatId = await this.messageRepo.findOrCreateChat(user.id, character.id);

    const userText = typeof content === 'string' ? content : '[media]';
    const messages = await this.contextManager.buildContextMessages(chatId, content, character);

    const result = await chatCompletion({
      messages,
      tier: user.tier as 'free' | 'premium',
    });

    this.contextManager.addUserMessage(chatId, userText);
    this.contextManager.addAssistantMessage(chatId, result.content);

    this.messageRepo.save({
      chatId,
      role: 'user',
      content: userText,
      mediaType: mediaType !== 'text' ? mediaType : undefined,
    }).catch((err) => this.logger.error({ err }, 'Failed to save user message'));

    this.messageRepo.save({
      chatId,
      role: 'assistant',
      content: result.content,
      modelUsed: result.modelUsed,
      tokensPrompt: result.tokensPrompt,
      tokensCompletion: result.tokensCompletion,
      tokensCacheRead: result.tokensCacheRead,
    }).catch((err) => this.logger.error({ err }, 'Failed to save assistant message'));

    this.logger.info(
      {
        userId: user.id,
        model: result.modelUsed,
        cacheRead: result.tokensCacheRead,
      },
      'Chat response generated',
    );

    return result.content;
  }
}
