import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '../types';

const API = '/api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('morgan_token'));
  const loading = ref(false);

  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(() => user.value?.is_admin ?? false);
  const isPremium = computed(() => user.value?.is_premium ?? false);

  function setAuth(t: string, u: User) {
    token.value = t;
    user.value = u;
    localStorage.setItem('morgan_token', t);
  }

  function headers() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token.value}` };
  }

  async function register(email: string, username: string, password: string) {
    loading.value = true;
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAuth(data.token, data.user);
      return data;
    } finally { loading.value = false; }
  }

  async function login(email: string, password: string) {
    loading.value = true;
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAuth(data.token, data.user);
      return data;
    } finally { loading.value = false; }
  }

  async function fetchUser() {
    if (!token.value) return;
    try {
      const res = await fetch(`${API}/auth/me`, { headers: headers() });
      if (!res.ok) { logout(); return; }
      user.value = await res.json();
    } catch { logout(); }
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('morgan_token');
  }

  async function updateSettings(settings: Partial<{ behavior_mode: string; selected_character: string }>) {
    const res = await fetch(`${API}/user/settings`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (user.value) {
      if (data.behavior_mode) user.value.behavior_mode = data.behavior_mode;
      if (data.selected_character) user.value.selected_character = data.selected_character;
    }
  }

  return { user, token, loading, isAuthenticated, isAdmin, isPremium, register, login, fetchUser, logout, updateSettings, headers };
});
