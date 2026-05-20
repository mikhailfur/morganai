import type pino from 'pino';
import { chatCompletion } from '../providers/openrouter/chat.js';
import { transcribeAudio } from '../providers/openrouter/transcription.js';
import type { ContextManager } from '../memory/context-manager.js';
import type { MessageRepository } from '../database/repositories/message.repository.js';
import type { SessionRepository } from '../database/repositories/session.repository.js';
import type { CharacterRepository } from '../database/repositories/character.repository.js';
import type { CharacterService } from './character.service.js';
import type { SessionService } from './session.service.js';
import type { NsfwService } from './nsfw.service.js';
import { NsfwBlockedError } from './nsfw.service.js';
import type { User } from '../database/schema.js';
import type { OpenRouterMessage } from '../providers/openrouter/types.js';

export class ChatService {
  constructor(
    private contextManager: ContextManager,
    private messageRepo: MessageRepository,
    private sessionRepo: SessionRepository,
    private charRepo: CharacterRepository,
    private characterService: CharacterService,
    private sessionService: SessionService,
    private nsfwService: NsfwService,
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
    const transcribed = await transcribeAudio(audioBuffer, 'ogg');
    this.logger.info({ userId: user.id }, 'Voice transcribed');
    return this.process(user, transcribed, 'voice');
  }

  private async process(
    user: User,
    content: OpenRouterMessage['content'],
    mediaType: 'text' | 'image' | 'voice',
  ): Promise<string> {
    const character = await this.characterService.getForUser(user.activeCharId);
    const session = await this.sessionService.getOrCreate(user.id, character.id);

    const userText = typeof content === 'string' ? content : '[media]';

    // Fire-and-forget: name session on first message
    if (!session.name && typeof content === 'string') {
      this.sessionService.nameSessionAsync(session.id, content).catch(() => {});
    }

    // Build system prompt with mode addon and NSFW safety modifier
    let systemPrompt = character.systemPrompt;

    if (session.activeModeId) {
      const mode = await this.charRepo.findModeById(session.activeModeId);
      if (mode?.promptAddon) {
        systemPrompt += `\n\n${mode.promptAddon}`;
      }
    }

    const safetyAddon = this.nsfwService.getSafetySystemPromptAddon(user);
    if (safetyAddon) {
      systemPrompt += safetyAddon;
    }

    const charWithPrompt = { ...character, systemPrompt };
    const messages = await this.contextManager.buildContextMessages(session.id, content, charWithPrompt);

    const result = await chatCompletion({
      messages,
      tier: user.tier as 'free' | 'premium',
      hasImages: mediaType === 'image',
    });

    // Sentinel response means the model detected NSFW content
    if (this.nsfwService.isSentinel(result.content)) {
      const reason = this.nsfwService.getNsfwBlockReason(user) ?? 'no_access';
      this.logger.info({ userId: user.id, sessionId: session.id }, 'NSFW sentinel detected');
      throw new NsfwBlockedError(reason);
    }

    this.contextManager.addUserMessage(session.id, userText);
    this.contextManager.addAssistantMessage(session.id, result.content);

    this.messageRepo.save({
      chatId: session.id,
      role: 'user',
      content: userText,
      mediaType: mediaType !== 'text' ? mediaType : undefined,
    }).catch((err) => this.logger.error({ err }, 'Failed to save user message'));

    this.messageRepo.save({
      chatId: session.id,
      role: 'assistant',
      content: result.content,
      modelUsed: result.modelUsed,
      tokensPrompt: result.tokensPrompt,
      tokensCompletion: result.tokensCompletion,
      tokensCacheRead: result.tokensCacheRead,
    }).catch((err) => this.logger.error({ err }, 'Failed to save assistant message'));

    this.sessionRepo.touchUpdatedAt(session.id).catch(() => {});

    this.logger.info(
      {
        userId: user.id,
        sessionId: session.id,
        model: result.modelUsed,
        cacheRead: result.tokensCacheRead,
      },
      'Chat response generated',
    );

    return result.content;
  }
}
