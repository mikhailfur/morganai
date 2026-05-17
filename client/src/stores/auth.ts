import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '../types';

const API = '/api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(false);
  const appConfig = ref<{ googleClientId: string | null; telegramBotId: string | null }>({
    googleClientId: null,
    telegramBotId: null,
  });

  const isAuthenticated = computed(() => !!user.value);
  const isAdmin = computed(() => user.value?.is_admin ?? false);
  const isPremium = computed(() => user.value?.is_premium ?? false);
  const isKycVerified = computed(() => user.value?.kyc_verified ?? false);
  const canNsfw = computed(() => isPremium.value || isKycVerified.value);

  async function fetchAppConfig() {
    try {
      const res = await fetch(`${API}/auth/config`);
      if (res.ok) appConfig.value = await res.json();
    } catch {}
  }

  async function fetchUser() {
    try {
      const res = await fetch(`${API}/auth/me`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) user.value = null;
        return;
      }
      user.value = await res.json();
    } catch { /* network error — don't clear authenticated state */ }
  }

  async function register(email: string, username: string, password: string) {
    loading.value = true;
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      user.value = data.user;
      return data;
    } finally { loading.value = false; }
  }

  async function login(email: string, password: string) {
    loading.value = true;
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      user.value = data.user;
      return data;
    } finally { loading.value = false; }
  }

  async function loginWithGoogle(idToken: string) {
    loading.value = true;
    try {
      const res = await fetch(`${API}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      user.value = data.user;
      return data;
    } finally { loading.value = false; }
  }

  async function loginWithTelegram(telegramData: Record<string, any>) {
    loading.value = true;
    try {
      const res = await fetch(`${API}/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(telegramData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      user.value = data.user;
      return data;
    } finally { loading.value = false; }
  }

  async function logout() {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    user.value = null;
  }

  async function updateSettings(settings: Partial<{ behavior_mode: string; selected_character: string }>) {
    const res = await fetch(`${API}/user/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (user.value) {
      if (data.behavior_mode) user.value.behavior_mode = data.behavior_mode;
      if (data.selected_character) user.value.selected_character = data.selected_character;
    }
  }

  async function verifyKyc() {
    const res = await fetch(`${API}/user/kyc-verify`, { method: 'POST', credentials: 'include' });
    if (res.ok && user.value) user.value.kyc_verified = true;
  }

  async function startKycSession(): Promise<{ session_url?: string; already_verified?: boolean }> {
    const res = await fetch(`${API}/kyc/session`, { method: 'POST', credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка KYC');
    return data;
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    const res = await fetch(`${API}/user/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }

  async function deleteAccount(password: string) {
    const res = await fetch(`${API}/user/account`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    user.value = null;
    return data;
  }

  return {
    user, loading, appConfig,
    isAuthenticated, isAdmin, isPremium, isKycVerified, canNsfw,
    fetchAppConfig, fetchUser, register, login, loginWithGoogle, loginWithTelegram, logout,
    updateSettings, verifyKyc, startKycSession, changePassword, deleteAccount,
  };
});
