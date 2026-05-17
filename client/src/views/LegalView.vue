<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { legalDocs } from '../legal/index'

const route = useRoute()
const docs = legalDocs
const activeDocId = ref((route.params.doc as string) || 'privacy')
const activeDoc = computed(() => docs.find(d => d.id === activeDocId.value) || docs[0])
</script>

<template>
  <div class="legal-root">

    <!-- Header -->
    <header class="legal-header">
      <router-link to="/" class="legal-logo">
        <div class="logo-box">M</div>
        <span class="logo-text">Morgan AI</span>
      </router-link>
      <div class="header-links">
        <router-link to="/" class="header-link">Главная</router-link>
        <span class="header-link active">Правовые документы</span>
        <a href="mailto:support@morgan.ai" class="header-link">Поддержка</a>
      </div>
    </header>

    <!-- Content -->
    <div class="legal-body">

      <!-- Sidebar TOC -->
      <nav class="legal-toc">
        <div class="toc-label">Документы</div>
        <div class="toc-list">
          <button
            v-for="d in docs" :key="d.id"
            @click="activeDocId = d.id"
            :class="['toc-item', activeDocId === d.id ? 'active' : '']"
          >
            <span class="toc-num">{{ d.num }}</span>
            <div>
              <div class="toc-name">{{ d.name }}</div>
              <div class="toc-ver">{{ d.version }}</div>
            </div>
          </button>
        </div>
      </nav>

      <!-- Document content -->
      <div class="legal-content">
        <div class="doc-label">{{ activeDoc.num }} — Документ</div>
        <h1 class="doc-heading">{{ activeDoc.heading }}</h1>
        <div class="doc-version">Обновлено {{ activeDoc.version }}</div>
        <div class="doc-divider"></div>

        <p class="doc-intro">
          Привет. Это не типичный документ. Мы — Morgan AI — стараемся писать понятно.
          <span class="doc-highlight">Коротко:</span>
          {{ activeDoc.summary }}
        </p>

        <div v-for="s in activeDoc.sections" :key="s.sym" class="doc-section">
          <div class="section-title">{{ s.sym }} — {{ s.title }}</div>
          <p class="section-text">{{ s.text }}</p>
        </div>
      </div>

      <!-- Right rail -->
      <aside class="legal-aside">
        <div class="aside-card">
          <div class="aside-label">Кратко</div>
          <p class="aside-text">{{ activeDoc.summary }}</p>
        </div>
        <div class="aside-divider"></div>
        <div class="aside-contact-label">Вопросы?</div>
        <a href="mailto:privacy@morgan.ai" class="aside-email">privacy@morgan.ai</a>
      </aside>

    </div>
  </div>
</template>

<style scoped>
.legal-root {
  min-height: 100vh;
  background: var(--bg);
  color: var(--fg);
  position: relative;
  z-index: 1;
}

/* Header */
.legal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 48px;
  height: 56px;
  border-bottom: 1px solid var(--border);
  background: rgb(9 5 20 / 0.8);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 100;
}
.legal-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}
.logo-box {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  color: #fff;
}
.logo-text {
  font-weight: 600;
  font-size: 16px;
  color: var(--fg);
}
.header-links {
  display: flex;
  gap: 24px;
  align-items: center;
  flex-wrap: wrap;
}
.header-link {
  font-size: 13px;
  color: var(--fg-muted);
  text-decoration: none;
  transition: color 0.2s;
}
.header-link:hover { color: var(--fg); }
.header-link.active { color: var(--accent-soft); font-weight: 500; }

/* Layout */
.legal-body {
  display: grid;
  grid-template-columns: 240px 1fr 200px;
  gap: 40px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 48px;
}

/* TOC Sidebar */
.toc-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--fg-subtle);
  margin-bottom: 12px;
}
.toc-list {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.toc-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: none;
  border: none;
  border-top: 1px solid var(--border);
  color: var(--fg-muted);
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.15s, color 0.15s;
}
.toc-item:first-child { border-top: none; }
.toc-item:hover { background: var(--surface-2); color: var(--fg); }
.toc-item.active {
  background: rgb(124 58 237 / 0.12);
  color: var(--accent-soft);
}
.toc-num {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  opacity: 0.6;
  margin-top: 2px;
  flex-shrink: 0;
}
.toc-name {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
}
.toc-ver {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.5;
  margin-top: 3px;
}

/* Document content */
.legal-content { max-width: 620px; }
.doc-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--fg-subtle);
  margin-bottom: 12px;
}
.doc-heading {
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: clamp(28px, 4vw, 48px);
  letter-spacing: -0.03em;
  color: var(--fg);
  margin: 0 0 8px;
  white-space: pre-line;
}
.doc-version {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--fg-subtle);
}
.doc-divider {
  height: 1px;
  background: var(--border);
  margin: 18px 0 24px;
}
.doc-intro {
  font-size: 15px;
  line-height: 1.7;
  color: var(--fg-muted);
}
.doc-highlight {
  background: rgb(124 58 237 / 0.2);
  color: var(--accent-soft);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-weight: 500;
}
.doc-section { margin-top: 28px; }
.section-title {
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: 18px;
  letter-spacing: -0.01em;
  color: var(--accent-soft);
  margin-bottom: 10px;
}
.section-text {
  font-size: 15px;
  line-height: 1.65;
  color: var(--fg-muted);
}

/* Aside */
.aside-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
}
.aside-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-soft);
  font-weight: 700;
  margin-bottom: 8px;
}
.aside-text {
  font-size: 13px;
  line-height: 1.5;
  color: var(--fg-muted);
  font-style: italic;
}
.aside-divider {
  height: 1px;
  background: var(--border);
  margin: 20px 0 16px;
}
.aside-contact-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--fg-subtle);
  margin-bottom: 6px;
}
.aside-email {
  display: block;
  font-size: 14px;
  color: var(--accent-soft);
  text-decoration: underline;
}

@media (max-width: 900px) {
  .legal-header { padding: 0 16px; }
  .legal-body {
    grid-template-columns: 1fr;
    padding: 20px 16px;
    gap: 24px;
  }
}
</style>
