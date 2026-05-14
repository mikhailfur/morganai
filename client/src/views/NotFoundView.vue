<script setup lang="ts">
import { useThemeStore } from '../stores/theme'
const theme = useThemeStore()
</script>

<template>
  <div style="min-height: 100vh; background: var(--bg); color: var(--fg); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 24px;">

    <!-- Decorative manga panel border -->
    <div style="
      border: var(--border);
      box-shadow: var(--shadow-box);
      padding: 56px 64px;
      max-width: 600px;
      width: 100%;
      position: relative;
    ">
      <!-- Top washi tape -->
      <div class="washi-tape" style="position: absolute; top: -5px; left: 32px; width: 80px; transform: rotate(-8deg);"></div>

      <!-- Chapter label -->
      <div class="editorial-label" style="color: var(--accent2); justify-content: center; margin-bottom: 16px;">
        <span style="opacity: 0.55;">404</span>
        СТРАНИЦА НЕ НАЙДЕНА
      </div>

      <!-- Big 404 -->
      <div class="display-heading" style="font-size: clamp(72px, 16vw, 120px); color: var(--accent); opacity: 0.15; line-height: 1; letter-spacing: -4px; margin: 0 0 -20px;">
        404
      </div>

      <!-- Dialogue box -->
      <div style="
        background: var(--bg-alt);
        border: var(--border);
        padding: 18px 22px;
        box-shadow: var(--shadow-sm);
        position: relative;
        margin-top: 12px;
        text-align: left;
      ">
        <div style="
          position: absolute;
          top: -13px;
          left: 16px;
          background: var(--accent3);
          color: var(--fg);
          padding: 2px 10px;
          font-family: var(--font-ui);
          font-size: 11px;
          font-weight: 700;
          border: var(--border);
        ">МОРГАН</div>
        <p style="font-family: var(--font-display); font-style: italic; font-size: 18px; line-height: 1.45; color: var(--fg);">
          «Хм. Кажется, ты зашёл не туда.<br>
          Или я переехала, пока тебя не было.»
        </p>
      </div>

      <!-- Actions -->
      <div style="margin-top: 32px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <router-link to="/" class="btn-primary" style="text-decoration: none;">
          ← На главную
        </router-link>
        <router-link to="/chat" class="btn-ghost" style="text-decoration: none;">
          В чат
        </router-link>
      </div>

      <!-- Meta -->
      <div style="margin-top: 28px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--fg); opacity: 0.4;">
        Morgan AI · страница не существует
      </div>

      <!-- Corner stamp -->
      <div style="
        position: absolute;
        bottom: 16px;
        right: 20px;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 2px solid var(--accent2);
        color: var(--accent2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 16px;
        transform: rotate(12deg);
        opacity: 0.6;
      ">迷</div>
    </div>

    <!-- Theme toggle -->
    <button @click="theme.toggle()" class="theme-toggle" style="margin-top: 24px;">
      {{ theme.isDark ? 'СВЕТ' : 'НОЧЬ' }}
    </button>

  </div>
</template>
