<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useThemeStore } from '../stores/theme'
import { legalDocs } from '../legal/index'

const route = useRoute()
const theme = useThemeStore()

const docs = legalDocs

const activeDocId = ref((route.params.doc as string) || 'privacy')
const activeDoc = computed(() => docs.find(d => d.id === activeDocId.value) || docs[0])
</script>

<template>
  <div style="min-height: 100vh; background: var(--bg); color: var(--fg);">

    <!-- Header -->
    <header style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 48px;
      border-bottom: var(--border);
    ">
      <router-link to="/" style="display: flex; align-items: center; gap: 10px; text-decoration: none;">
        <img :src="'/logo.svg'" alt="Morgan" style="height: 42px; border-radius: 5px; display: block;" />
        <span style="font-family: var(--font-display); font-weight: 600; font-size: 22px; color: var(--accent);">Morgan</span>
      </router-link>
      <div style="display: flex; gap: 24px; font-family: var(--font-ui); font-size: 13px; color: var(--fg); align-items: center; flex-wrap: wrap;">
        <router-link to="/" style="color: inherit; text-decoration: none; opacity: 0.7;">Главная</router-link>
        <span style="font-weight: 600; color: var(--accent);">Правовые документы</span>
        <a href="mailto:support@morgan.ai" style="color: inherit; text-decoration: none; opacity: 0.7;">Поддержка</a>
        <button @click="theme.toggle()" class="theme-toggle">{{ theme.isDark ? 'СВЕТ' : 'НОЧЬ' }}</button>
      </div>
    </header>

    <!-- Content -->
    <div style="padding: 32px 48px; display: grid; grid-template-columns: 240px 1fr 200px; gap: 40px; max-width: 1200px;">

      <!-- TOC -->
      <div>
        <div class="editorial-label" style="color: var(--accent2); margin-bottom: 14px;">
          <span style="opacity: 0.55;">目</span>
          ДОКУМЕНТЫ
        </div>
        <div style="border: var(--border);">
          <div
            v-for="(d, i) in docs" :key="d.id"
            @click="activeDocId = d.id"
            :class="['legal-item', activeDocId === d.id ? 'active' : '']"
            :style="{ borderTop: i > 0 ? 'var(--border)' : 'none' }"
          >
            <div style="display: flex; align-items: baseline; gap: 8px;">
              <span style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.4px; opacity: 0.6;">{{ d.num }}</span>
              <span style="font-family: var(--font-display); font-weight: 500; font-size: 14px; line-height: 1.2;">{{ d.name }}</span>
            </div>
            <div style="font-family: var(--font-mono); font-size: 9px; margin-top: 3px; letter-spacing: 1px; text-transform: uppercase; opacity: 0.55;">{{ d.version }}</div>
          </div>
        </div>
      </div>

      <!-- Document content -->
      <div style="max-width: 620px;">
        <div class="editorial-label" style="color: var(--accent2);">
          <span style="opacity: 0.55;">{{ activeDoc.num }}</span>
          ДОКУМЕНТ
        </div>

        <div class="display-heading" style="font-size: clamp(30px, 4vw, 52px); margin-top: 12px; white-space: pre-line;">{{ activeDoc.heading }}</div>
        <div style="margin-top: 8px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--fg); opacity: 0.5;">обновлено {{ activeDoc.version }}</div>

        <div style="margin-top: 18px; height: 1px; background: var(--meta); opacity: 0.4;"></div>

        <div style="margin-top: 26px;">
          <p style="font-family: var(--font-display); font-size: 16px; line-height: 1.7; color: var(--fg);">
            Привет. Это не типичный документ. Мы — Morgan AI — стараемся писать понятно.
            <span style="background: var(--accent3); color: var(--fg); padding: 0 4px;">Коротко:</span>
            {{ activeDoc.summary }}
          </p>

          <div v-for="s in activeDoc.sections" :key="s.sym" style="margin-top: 28px;">
            <div style="font-family: var(--font-display); font-style: italic; font-weight: 500; font-size: 24px; color: var(--accent3); line-height: 1;">
              {{ s.sym }} — {{ s.title }}
            </div>
            <p style="margin-top: 10px; font-family: var(--font-display); font-size: 15px; line-height: 1.65; color: var(--fg); opacity: 0.85;">{{ s.text }}</p>
          </div>
        </div>
      </div>

      <!-- Right rail -->
      <div>
        <!-- Summary box -->
        <div style="
          padding: 16px;
          border: var(--border);
          background: var(--bg-alt);
          box-shadow: var(--shadow-sm);
        ">
          <div style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--accent2); font-weight: 700;">Кратко</div>
          <p style="font-family: var(--font-display); font-style: italic; font-size: 14px; margin-top: 8px; color: var(--fg); line-height: 1.5;">{{ activeDoc.summary }}</p>
        </div>

        <div style="margin-top: 20px; height: 1px; background: var(--rule);"></div>

        <div style="margin-top: 16px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--fg); opacity: 0.6;">
          Вопросы?
        </div>
        <a href="mailto:privacy@morgan.ai" style="display: block; margin-top: 6px; font-family: var(--font-display); font-size: 15px; color: var(--accent); text-decoration: underline;">
          privacy@morgan.ai
        </a>

        <!-- Stamp decoration -->
        <div style="
          margin-top: 24px;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: 2px solid var(--accent2);
          color: var(--accent2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 18px;
          transform: rotate(-8deg);
          opacity: 0.75;
        ">正</div>
      </div>
    </div>

  </div>
</template>

<style scoped>
@media (max-width: 900px) {
  header { padding: 16px 20px !important; }
  div[style*="grid-template-columns: 240px 1fr 200px"] {
    grid-template-columns: 1fr !important;
    padding: 20px !important;
    gap: 24px !important;
  }
}
</style>
