import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ChatMessage, Character } from '../types';
import { useAuthStore } from './auth';

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([]);
  const characters = ref<Character[]>([]);
  const isLoading = ref(false);
  const isStreaming = ref(false);

  async function fetchHistory(characterSlug: string = 'morgan') {
    const auth = useAuthStore();
    try {
      const res = await fetch(`/api/chat/history?character=${characterSlug}`, { headers: auth.headers() });
      const data = await res.json();
      messages.value = data.messages || [];
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  }

  async function sendMessage(text: string, characterSlug: string = 'morgan'): Promise<void> {
    const auth = useAuthStore();
    // Add user message immediately
    messages.value.push({ role: 'user', content: text, timestamp: Date.now() });
    isLoading.value = true;

    try {
      // Use streaming
      const aiMessage: ChatMessage = { role: 'assistant', content: '', isStreaming: true, timestamp: Date.now() };
      messages.value.push(aiMessage);
      isStreaming.value = true;

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: auth.headers(),
        body: JSON.stringify({ message: text, characterSlug }),
      });

      if (!res.ok) {
        const err = await res.json();
        aiMessage.content = err.error || 'Ошибка';
        aiMessage.isStreaming = false;
        isStreaming.value = false;
        isLoading.value = false;
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              aiMessage.content += parsed.text;
            }
            if (parsed.voice) {
              aiMessage.voiceUrl = parsed.voice;
              aiMessage.has_voice = true;
            }
            if (parsed.error) {
              aiMessage.content += parsed.error;
            }
          } catch { /* skip */ }
        }
      }

      aiMessage.isStreaming = false;
      isStreaming.value = false;
    } catch (err) {
      console.error('Send error:', err);
      const last = messages.value[messages.value.length - 1];
      if (last && last.role === 'assistant') {
        last.content = 'Ошибка соединения. Попробуйте снова.';
        last.isStreaming = false;
      }
      isStreaming.value = false;
    } finally {
      isLoading.value = false;
    }
  }

  async function sendImage(file: File, messageText: string, characterSlug: string = 'morgan') {
    const auth = useAuthStore();
    messages.value.push({ role: 'user', content: messageText || '[Изображение]', has_image: true, timestamp: Date.now() });
    isLoading.value = true;

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('message', messageText);
      formData.append('characterSlug', characterSlug);

      const res = await fetch('/api/image/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      messages.value.push({ role: 'assistant', content: data.response, timestamp: Date.now() });
    } catch (err: any) {
      messages.value.push({ role: 'assistant', content: err.message || 'Ошибка', timestamp: Date.now() });
    } finally {
      isLoading.value = false;
    }
  }

  async function clearHistory(characterSlug: string = 'morgan') {
    const auth = useAuthStore();
    await fetch(`/api/chat/clear?character=${characterSlug}`, { method: 'DELETE', headers: auth.headers() });
    messages.value = [];
  }

  async function fetchCharacters() {
    const auth = useAuthStore();
    try {
      const res = await fetch('/api/user/characters', { headers: auth.headers() });
      const data = await res.json();
      characters.value = data.characters || [];
    } catch { /* */ }
  }

  return { messages, characters, isLoading, isStreaming, fetchHistory, sendMessage, sendImage, clearHistory, fetchCharacters };
});
