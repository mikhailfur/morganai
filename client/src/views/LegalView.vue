<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useThemeStore } from '../stores/theme'

const route = useRoute()
const theme = useThemeStore()

const docs = [
  {
    id: 'privacy',
    num: '01',
    name: 'Политика конфиденциальности',
    version: 'v1.2 · май 2026',
    heading: 'Политика\nконфиденциальности.',
    summary: 'Мы храним только то, что нужно для работы чата. Не продаём данные. Удаляем всё по запросу за 30 секунд.',
    sections: [
      {
        sym: '§ 1', title: 'Что мы храним',
        text: 'Email (для входа), хешированный пароль (никто, включая нас, не видит его в открытом виде), историю переписки с персонажем (до 50 последних сообщений), статистику использования (для лимитов).',
      },
      {
        sym: '§ 2', title: 'Чего мы НЕ делаем',
        text: 'Не продаём данные третьим лицам. Не показываем рекламу на основе твоих диалогов. Не читаем переписку — её обрабатывает только AI-модель для генерации ответа.',
      },
      {
        sym: '§ 3', title: 'Как удалить',
        text: 'Зайди в Настройки → Удалить аккаунт. Всё стирается за 30 секунд. Можно написать на privacy@morgan.ai — ответим за 24 часа.',
      },
      {
        sym: '§ 4', title: 'Cookies',
        text: 'Мы используем только технические cookies для авторизации (JWT-токен). Аналитические cookies — только с явного согласия.',
      },
    ],
  },
  {
    id: 'terms',
    num: '02',
    name: 'Условия использования',
    version: 'v1.1 · май 2026',
    heading: 'Условия\nиспользования.',
    summary: 'Платформа 18+. Запрещено использование для мошенничества, спама и создания вредоносного контента.',
    sections: [
      {
        sym: '§ 1', title: 'Возраст',
        text: 'Сервис предназначен для лиц, достигших 18 лет. Регистрируясь, вы подтверждаете своё совершеннолетие.',
      },
      {
        sym: '§ 2', title: 'Разрешённое использование',
        text: 'Сервис предназначен для развлечения, ролевых игр и общения с AI-персонажами. Любое использование в коммерческих целях без согласования с нами запрещено.',
      },
      {
        sym: '§ 3', title: 'Запрещено',
        text: 'Использование для мошенничества, спама, создания вредоносного контента, попытки получить несанкционированный доступ к системе, обход лимитов.',
      },
      {
        sym: '§ 4', title: 'Ограничение ответственности',
        text: 'Morgan AI предоставляется «как есть». Мы не несём ответственности за возможные убытки, связанные с использованием или невозможностью использования сервиса.',
      },
    ],
  },
  {
    id: 'oferta',
    num: '03',
    name: 'Публичная оферта',
    version: 'v1.0 · май 2026',
    heading: 'Публичная\nоферта.',
    summary: 'Договор на предоставление доступа к платным функциям Morgan AI. Принятие — оплата.',
    sections: [
      {
        sym: '§ 1', title: 'Предмет договора',
        text: 'Исполнитель (Morgan AI) предоставляет Пользователю доступ к расширенным функциям сервиса (Premium/Premium+) на условиях настоящей оферты.',
      },
      {
        sym: '§ 2', title: 'Акцепт',
        text: 'Акцептом оферты является факт оплаты Пользователем выбранного тарифа. С момента акцепта договор считается заключённым.',
      },
      {
        sym: '§ 3', title: 'Стоимость и порядок оплаты',
        text: 'Стоимость устанавливается в соответствии с актуальным прайс-листом на странице Тарифы. Оплата производится картой, СБП или Telegram Stars.',
      },
      {
        sym: '§ 4', title: 'Срок действия',
        text: 'Premium и Premium+: 30 дней с момента оплаты. Подписка не продлевается автоматически.',
      },
    ],
  },
  {
    id: 'refund',
    num: '04',
    name: 'Политика возврата средств',
    version: 'v1.0 · май 2026',
    heading: 'Политика\nвозврата средств.',
    summary: 'Возврат возможен в течение 14 дней при неиспользовании Premium-функций.',
    sections: [
      {
        sym: '§ 1', title: 'Условия возврата',
        text: 'Возврат средств возможен в течение 14 календарных дней с момента оплаты, если Пользователь не использовал Premium-функции (голосовые ответы, NSFW-режим, персонажи Premium).',
      },
      {
        sym: '§ 2', title: 'Порядок возврата',
        text: 'Для оформления возврата напишите на support@morgan.ai с темой «Возврат» и укажите email аккаунта и дату оплаты. Срок обработки — до 3 рабочих дней.',
      },
      {
        sym: '§ 3', title: 'Исключения',
        text: 'Возврат не производится: если Premium-функции были использованы; по истечении 14-дневного срока; для тарифа Premium+ после использования эксклюзивных персонажей.',
      },
    ],
  },
  {
    id: 'cookie',
    num: '05',
    name: 'Cookie-политика',
    version: 'v1.0 · май 2026',
    heading: 'Cookie-\nполитика.',
    summary: 'Мы используем только обязательные cookies для входа в систему. Аналитику — с вашего согласия.',
    sections: [
      {
        sym: '§ 1', title: 'Обязательные cookies',
        text: 'JWT-токен авторизации (срок хранения 7 дней). Без них невозможен вход в систему. Эти cookies нельзя отключить.',
      },
      {
        sym: '§ 2', title: 'Аналитические cookies',
        text: 'Используются для улучшения сервиса. Устанавливаются только с явного согласия пользователя. Можно отозвать в любой момент в настройках браузера.',
      },
      {
        sym: '§ 3', title: 'Управление',
        text: 'Вы можете удалить все cookies в настройках браузера. Это приведёт к выходу из системы. Никакие данные cookies не передаются третьим лицам.',
      },
    ],
  },
]

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
        <img :src="'/logo.png'" alt="Morgan" style="height: 34px; border-radius: 5px; display: block;" />
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
