import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ChatMessage, Character, UserCharacter } from '../types';

const apiFetch = (url: string, opts: RequestInit = {}) =>
  fetch(url, { ...opts, credentials: 'include', headers: { 'Content-Type': 'application/json', ...((opts as any).headers || {}) } });

const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([]);
  const characters = ref<Character[]>([]);
  const myCharacters = ref<UserCharacter[]>([]);
  const publicCharacters = ref<UserCharacter[]>([]);
  const isLoading = ref(false);
  const isStreaming = ref(false);

  async function fetchHistory(characterSlug: string = 'morgan') {
    try {
      const res = await apiFetch(`/api/chat/history?character=${characterSlug}`);
      const data = await res.json();
      messages.value = data.messages || [];
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  }

  async function sendMessage(text: string, characterSlug: string = 'morgan'): Promise<void> {
    messages.value.push({ role: 'user', content: text, timestamp: Date.now() });
    isLoading.value = true;

    try {
      const aiMessage: ChatMessage = { role: 'assistant', content: '', isStreaming: true, timestamp: Date.now() };
      messages.value.push(aiMessage);
      isStreaming.value = true;

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, characterSlug, clientTimezone }),
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
            if (parsed.text) aiMessage.content += parsed.text;
            if (parsed.voice) { aiMessage.voiceUrl = parsed.voice; aiMessage.has_voice = true; }
            if (parsed.error) aiMessage.content += parsed.error;
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
    messages.value.push({ role: 'user', content: messageText || '[Изображение]', has_image: true, timestamp: Date.now() });
    isLoading.value = true;

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('message', messageText);
      formData.append('characterSlug', characterSlug);

      const res = await fetch('/api/image/upload', { method: 'POST', credentials: 'include', body: formData });
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
    await fetch(`/api/chat/clear?character=${characterSlug}`, { method: 'DELETE', credentials: 'include' });
    messages.value = [];
  }

  async function fetchCharacters() {
    try {
      const res = await apiFetch('/api/user/characters');
      const data = await res.json();
      characters.value = data.characters || [];
    } catch { /* */ }
  }

  async function fetchMyCharacters() {
    try {
      const res = await apiFetch('/api/user/characters/my');
      const data = await res.json();
      myCharacters.value = data.characters || [];
    } catch { /* */ }
  }

  async function fetchPublicCharacters() {
    try {
      const res = await apiFetch('/api/auth/characters/public');
      const data = await res.json();
      publicCharacters.value = data.characters || [];
    } catch { /* */ }
  }

  async function createUserCharacter(data: {
    name: string; description?: string; system_prompt: string;
    greeting_message?: string; avatar_url?: string; is_public?: boolean;
  }): Promise<UserCharacter> {
    const res = await apiFetch('/api/user/characters', { method: 'POST', body: JSON.stringify(data) });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    myCharacters.value.unshift(result.character);
    return result.character;
  }

  async function updateUserCharacter(id: number, data: Partial<UserCharacter>): Promise<UserCharacter> {
    const res = await apiFetch(`/api/user/characters/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    const idx = myCharacters.value.findIndex(c => c.id === id);
    if (idx !== -1) myCharacters.value[idx] = result.character;
    return result.character;
  }

  async function deleteUserCharacter(id: number): Promise<void> {
    const res = await apiFetch(`/api/user/characters/${id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
    myCharacters.value = myCharacters.value.filter(c => c.id !== id);
  }

  async function togglePublishCharacter(id: number): Promise<boolean> {
    const res = await apiFetch(`/api/user/characters/${id}/publish`, { method: 'PATCH' });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    const idx = myCharacters.value.findIndex(c => c.id === id);
    if (idx !== -1) myCharacters.value[idx].is_public = result.is_public;
    return result.is_public;
  }

  return {
    messages, characters, myCharacters, publicCharacters, isLoading, isStreaming,
    fetchHistory, sendMessage, sendImage, clearHistory, fetchCharacters,
    fetchMyCharacters, fetchPublicCharacters, createUserCharacter, updateUserCharacter,
    deleteUserCharacter, togglePublishCharacter,
  };
});
