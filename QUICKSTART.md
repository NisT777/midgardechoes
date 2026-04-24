# ⚡ Быстрый старт Midgard Echoes

## 🎯 Суть: 3 шага, 15 минут

```
Твой компьютер → GitHub → Render → Telegram Bot 🤖
```

---

## Шаг 1/3: GitHub (5 мин)

1. Зайди на https://github.com/new
2. Название: `midgardechoes`
3. **Public** → **Create repository**
4. Скопируй код проекта на рабочий стол
5. Загрузи код (GitHub Desktop или терминал)

**Готово когда:** открываешь github.com/ТВОЙ_NICK/midgardechoes и видишь файлы

---

## Шаг 2/3: TiDB Cloud (5 мин)

1. Зайди на https://tidbcloud.com → Sign Up
2. **Create Cluster** → Serverless → **Free tier** → **Create**
3. Жди 2 минуты → нажми **Connect** → **Copy** строку подключения

**Готово когда:** есть строка вида `mysql://...`

---

## Шаг 3/3: Render (5 мин)

1. Зайди на https://dashboard.render.com → Sign Up with GitHub
2. **New +** → **Web Service** → выбери `midgardechoes`
3. Заполни:
   - Name: `midgardechoes-bot`
   - Build: `npm install && npm run build`
   - Start: `npx tsx api/bot/start-bot-only.ts`
   - Plan: `Free`
4. **Environment Variables** → добавь 5 переменных:

| Key | Value |
|-----|-------|
| `TELEGRAM_BOT_TOKEN` | `ВАШ_ТОКЕН_ОТ_BOTFATHER` |
| `DATABASE_URL` | *(строка из TiDB шага 2)* |
| `APP_ID` | `midgard-echoes-app` |
| `APP_SECRET` | `midgard-secret-key-2024` |
| `VITE_APP_ID` | `midgard-echoes-app` |

5. **Create Web Service** → жди 🟢 Live

---

## 🎉 Проверка

Отправь `/start` боту **@midgardechoes_bot** в Telegram!

---

## ❌ Не работает?

1. Открой вкладку **Logs** в Render
2. Найди красную ошибку
3. Скинь мне — разберёмся!

---

**Полная инструкция:** см. файл `SETUP-GUIDE.md`
