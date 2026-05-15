# Гайд: Добавление иллюстраций в Morgan AI

## Где размещать изображения

Положи файлы в `client/public/characters/`:

```
client/public/characters/
  morgan-portrait.jpg        ← LoginView, левая панель
  morgan-hero.jpg            ← LandingPage, главная панель
  morgan-avatar.jpg          ← Аватар в чате (будущее)
  alisa-portrait.jpg         ← Другие персонажи
```

Файлы из `public/` доступны напрямую: `/characters/morgan-portrait.jpg`

## Рекомендуемые размеры

| Место | Размер | Соотношение |
|-------|--------|-------------|
| LoginView (левая панель) | 600×900 px | 2:3 (портрет) |
| LandingPage (главная) | 800×1200 px | 2:3 (портрет) |
| Аватар в чате | 256×256 px | 1:1 (квадрат) |

**Оптимизация:** WebP формат, качество 85%, размер < 200 KB.

## Как заменить штриховку на изображение

### LoginView.vue

Найди секцию с `.art-slot` для левой панели и замени на:

```html
<div class="art-panel" style="...">
  <img
    src="/characters/morgan-portrait.jpg"
    alt="Морган"
    style="
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
    "
  />
  <!-- Оставь washi-tape и диалог поверх -->
  <div class="washi-tape" ...></div>
</div>
```

### LandingPage.vue

Найди `.panel-art` с `.art-slot` внутри:

```html
<div class="panel-art">
  <img
    src="/characters/morgan-hero.jpg"
    alt="Морган"
    style="
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
    "
  />
  <!-- Оставь panel-dialogue overlay -->
  <div class="panel-dialogue">...</div>
</div>
```

## Добавление через CSS (альтернатива)

Для быстрой замены без правки HTML добавь в `style.css`:

```css
.panel-art .art-slot {
  background-image: url('/characters/morgan-hero.jpg');
  background-size: cover;
  background-position: center top;
  background-repeat: no-repeat;
}
```

## Используемые стили-заглушки

- `.art-slot` — диагональная штриховка, `background: repeating-linear-gradient(...)`
- `.art-slot-label` — подпись под штриховкой (убери после добавления изображения)
- `.washi-tape` — декоративная лента (оставь поверх изображения)

## Советы по иллюстрациям

- Аниме/манга стиль лучше всего подходит под дизайн Yume/Nocturne
- Лёгкая зернистость или grain текстура смотрится в стиле
- Для тёмной темы: изображение можно фильтровать через CSS `filter: brightness(0.85)`
- Рекомендуется использовать `object-position: center top` чтобы лицо персонажа всегда было видно
