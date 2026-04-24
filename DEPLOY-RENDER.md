# 🚀 Деплой на Render.com (2 кнопки!)

## Шаг 1: Залить код на GitHub (1 команда в терминале)

Скопируй и вставь эту команду в терминал своего компьютера:

```bash
cd /mnt/agents/output/app && git init && git add . && git commit -m "v1" && gh repo create midgardechoes --public --push --source=. 2>/dev/null || (echo "Введите URL нового репозитория:" && read url && git remote add origin $url && git push -u origin main)
```

**Если нет gh CLI:**
1. Зайди на [github.com/new](https://github.com/new)
2. Название: `midgardechoes`
3. Нажми **Create repository**
4. Скопируй команды от GitHub и вставь в терминал

---

## Шаг 2: Нажать 1 кнопку на Render

### Вариант A: BluePrint (автоматически)

Нажми эту кнопку после того как код на GitHub:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/blueprints?repo=https://github.com/ТВОЙ_GITHUB_НИК/midgardechoes)

*(Замени ТВОЙ_GITHUB_НИК на свой ник перед нажатием)*

### Вариант B: Вручную (2 минуты)

1. Зайди на [dashboard.render.com](https://dashboard.render.com)
2. Нажми **New +** → **Web Service**
3. Выбери свой репозиторий `midgardechoes`
4. Заполни:

| Поле | Значение |
|------|----------|
| Name | `midgardechoes-bot` |
| Environment | `Node` |
| Build Command | `npm install && npm run build` |
| Start Command | `npx tsx api/bot/start-bot-only.ts` |
| Plan | `Free` |

5. Нажми **Advanced** → **Add Environment Variable**:
   - Key: `TELEGRAM_BOT_TOKEN`
   - Value: `ВАШ_ТОКЕН_ОТ_BOTFATHER`

6. Нажми **Create Web Service** ✅

---

## Шаг 3: Готово! 🎉

Через 2-3 минуты статус изменится на `Live`.

Отправь `/start` боту в Telegram → игра начнётся!

---

## Проверка

В логах Render (вкладка Logs) должно появиться:
```
🤖 Starting Telegram Bot...
Bot @midgardechoes_bot started!
```

---

## ⚠️ Важно: База данных

На бесплатном плане Render нет MySQL. Есть 2 варианта:

### Вариант 1: TiDB Cloud (бесплатно, рекомендую)
1. Зайди на [tidbcloud.com](https://tidbcloud.com) → Sign Up
2. Create Cluster → Serverless → AWS → Free Tier
3. Подожди 2 минуты пока кластер создастся
4. Нажми **Connect** → копируй строку подключения
5. В Render: добавь Environment Variable `DATABASE_URL` со строкой из TiDB

### Вариант 2: SQLite (проще, но медленнее)
Я могу переключить проект на SQLite — не нужен внешний сервер БД.

**Хочешь, я переключу на SQLite для простоты?**
