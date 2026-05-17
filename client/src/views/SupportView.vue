<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { SupportTicket } from '../types';

const router = useRouter();
const tickets = ref<SupportTicket[]>([]);
const activeTicket = ref<SupportTicket | null>(null);
const loading = ref(false);
const replyText = ref('');
const sending = ref(false);

// Create ticket form
const showCreate = ref(false);
const newSubject = ref('');
const newMessage = ref('');
const creating = ref(false);
const createError = ref('');

let pollInterval: ReturnType<typeof setInterval> | null = null;

const statusLabel: Record<string, string> = {
  open: 'Открыт',
  in_progress: 'В работе',
  closed: 'Закрыт',
};

const statusColor: Record<string, string> = {
  open: 'text-violet-400 bg-violet-400/10',
  in_progress: 'text-amber-400 bg-amber-400/10',
  closed: 'text-[var(--fg-muted)] bg-white/5',
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

async function loadTickets() {
  try {
    const res = await fetch('/api/support/tickets', { credentials: 'include' });
    const data = await res.json();
    tickets.value = data.tickets || [];
  } catch { /* */ }
}

async function openTicket(ticket: SupportTicket) {
  loading.value = true;
  try {
    const res = await fetch(`/api/support/tickets/${ticket.id}`, { credentials: 'include' });
    const data = await res.json();
    activeTicket.value = data.ticket;
  } finally {
    loading.value = false;
  }
}

async function sendReply() {
  if (!replyText.value.trim() || !activeTicket.value) return;
  sending.value = true;
  try {
    const res = await fetch(`/api/support/tickets/${activeTicket.value.id}/messages`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: replyText.value.trim() }),
    });
    if (res.ok) {
      replyText.value = '';
      await openTicket(activeTicket.value);
    }
  } finally {
    sending.value = false;
  }
}

async function createTicket() {
  if (!newSubject.value.trim() || !newMessage.value.trim()) {
    createError.value = 'Заполните все поля';
    return;
  }
  creating.value = true;
  createError.value = '';
  try {
    const res = await fetch('/api/support/tickets', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: newSubject.value.trim(), message: newMessage.value.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { createError.value = data.error; return; }
    newSubject.value = '';
    newMessage.value = '';
    showCreate.value = false;
    await loadTickets();
    await openTicket(data.ticket);
  } finally {
    creating.value = false;
  }
}

const isClosed = computed(() => activeTicket.value?.status === 'closed');

onMounted(async () => {
  await loadTickets();
  pollInterval = setInterval(async () => {
    await loadTickets();
    if (activeTicket.value) await openTicket(activeTicket.value);
  }, 15000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
</script>

<template>
  <div class="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col">
    <!-- Header -->
    <header class="flex items-center gap-3 p-4 border-b border-white/10">
      <button @click="router.back()" class="p-2 rounded-lg hover:bg-white/5 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <h1 class="font-display text-lg font-semibold">Поддержка</h1>
      <div class="ml-auto">
        <button v-if="!activeTicket" @click="showCreate = !showCreate"
          class="btn-primary btn-sm">
          + Создать тикет
        </button>
        <button v-else @click="activeTicket = null"
          class="btn-ghost btn-sm text-sm">
          ← Назад
        </button>
      </div>
    </header>

    <div class="flex-1 overflow-hidden flex flex-col">

      <!-- Create ticket form -->
      <transition name="slide-down">
        <div v-if="showCreate && !activeTicket" class="p-4 border-b border-white/10 bg-white/3">
          <p class="text-sm text-[var(--fg-muted)] mb-3">Опишите вашу проблему — мы ответим в ближайшее время.</p>
          <input v-model="newSubject" placeholder="Тема" maxlength="200"
            class="m-input w-full mb-2 text-sm" />
          <textarea v-model="newMessage" placeholder="Сообщение" rows="4"
            class="m-textarea w-full mb-2 text-sm resize-none" />
          <p v-if="createError" class="text-red-400 text-xs mb-2">{{ createError }}</p>
          <div class="flex gap-2">
            <button @click="createTicket" :disabled="creating" class="btn-primary btn-sm">
              {{ creating ? 'Отправка...' : 'Отправить' }}
            </button>
            <button @click="showCreate = false" class="btn-ghost btn-sm">Отмена</button>
          </div>
        </div>
      </transition>

      <!-- Ticket list -->
      <div v-if="!activeTicket" class="flex-1 overflow-y-auto p-4 space-y-2">
        <div v-if="tickets.length === 0" class="text-center text-[var(--fg-muted)] py-12">
          <svg class="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          <p class="text-sm">У вас нет тикетов</p>
          <p class="text-xs mt-1 opacity-60">Создайте первый, нажав кнопку выше</p>
        </div>

        <div v-for="ticket in tickets" :key="ticket.id"
          @click="openTicket(ticket)"
          class="bg-white/5 hover:bg-white/8 border border-white/8 rounded-xl p-4 cursor-pointer transition-colors">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <p class="font-medium text-sm truncate">{{ ticket.subject }}</p>
              <p v-if="ticket.last_message" class="text-xs text-[var(--fg-muted)] mt-0.5 truncate">
                {{ ticket.last_message }}
              </p>
            </div>
            <span :class="['text-xs px-2 py-0.5 rounded-full shrink-0', statusColor[ticket.status]]">
              {{ statusLabel[ticket.status] }}
            </span>
          </div>
          <p class="text-xs text-[var(--fg-muted)] mt-2">{{ formatDate(ticket.updated_at) }}</p>
        </div>
      </div>

      <!-- Ticket detail -->
      <div v-else class="flex-1 flex flex-col overflow-hidden">
        <!-- Ticket header -->
        <div class="px-4 py-3 border-b border-white/10">
          <div class="flex items-center justify-between">
            <p class="font-medium text-sm truncate">{{ activeTicket.subject }}</p>
            <span :class="['text-xs px-2 py-0.5 rounded-full shrink-0 ml-2', statusColor[activeTicket.status]]">
              {{ statusLabel[activeTicket.status] }}
            </span>
          </div>
          <p class="text-xs text-[var(--fg-muted)] mt-0.5">Тикет #{{ activeTicket.id }}</p>
        </div>

        <!-- Messages -->
        <div v-if="loading" class="flex-1 flex items-center justify-center">
          <div class="typing-dot w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce"/>
        </div>
        <div v-else class="flex-1 overflow-y-auto p-4 space-y-3">
          <div v-for="msg in activeTicket.messages" :key="msg.id"
            :class="['flex', msg.sender_role === 'user' ? 'justify-end' : 'justify-start']">
            <div :class="[
              'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
              msg.sender_role === 'user'
                ? 'bg-[var(--accent)] text-white rounded-tr-sm'
                : 'bg-white/8 text-[var(--fg)] rounded-tl-sm'
            ]">
              <p class="whitespace-pre-wrap break-words">{{ msg.content }}</p>
              <p class="text-xs opacity-60 mt-1">
                {{ msg.sender_role === 'support' ? 'Поддержка' : 'Вы' }} · {{ formatDate(msg.created_at) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Reply input -->
        <div v-if="!isClosed" class="p-4 border-t border-white/10">
          <div class="flex gap-2">
            <textarea v-model="replyText" placeholder="Введите сообщение..." rows="2"
              class="m-textarea flex-1 text-sm resize-none"
              @keydown.enter.meta.prevent="sendReply"
              @keydown.enter.ctrl.prevent="sendReply" />
            <button @click="sendReply" :disabled="sending || !replyText.trim()"
              class="btn-primary self-end px-4 py-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            </button>
          </div>
        </div>
        <div v-else class="p-4 border-t border-white/10 text-center text-sm text-[var(--fg-muted)]">
          Тикет закрыт
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.2s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
