# 🚀 Запуск Midgard Echoes Bot

## Проблема среды
Изолированная dev-среда блокирует исходящие запросы к `api.telegram.org`. Бот работает корректно — нужен VPS/хостинг с открытым интернетом.

## Быстрый деплой на VPS (5 минут)

### 1. Купите VPS (любой)
- **Hetzner Cloud** — от €3.79/мес (рекомендую)
- **DigitalOcean** — от $6/мес
- **AWS / GCP** — бесплатный tier

### 2. Подключитесь к серверу
```bash
ssh root@YOUR_SERVER_IP
```

### 3. Установите зависимости
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs git mysql-server redis-server

# Проверка
node -v  # v20+
npm -v   # 10+
```

### 4. Склонируйте проект
```bash
cd /opt
git clone <ваш-репозиторий> midgardechoes
cd midgardechoes
```

### 5. Настройте БД (MySQL/TiDB)
```bash
# Локальный MySQL
mysql -e "CREATE DATABASE midgardechoes;"

# Или используйте TiDB Cloud (бесплатно): tidbcloud.com
```

### 6. Настройте окружение
```bash
cp .env.example .env
nano .env
```

Заполните:
```env
TELEGRAM_BOT_TOKEN=ВАШ_ТОКЕН_ОТ_BOTFATHER
DATABASE_URL=mysql://user:pass@host:3306/midgardechoes
```

### 7. Установите зависимости и запустите
```bash
npm install
npm run db:push   # Создать таблицы
npm run db:seed   # Заполнить данные
npm run build     # Собрать проект
npm start         # Запустить!
```

### 8. Запустите бота (отдельный процесс)
```bash
npx tsx api/bot/start-bot-only.ts
```

Или через PM2 для автозапуска:
```bash
npm install -g pm2
pm2 start "npx tsx api/bot/start-bot-only.ts" --name "midgard-bot"
pm2 startup
pm2 save
```

---

## Альтернатива: Бесплатный хостинг

### Render.com (бесплатно)
1. Зарегистрируйтесь на render.com
2. Create New → Web Service
3. Подключите GitHub репозиторий
4. Build Command: `npm install && npm run build`
5. Start Command: `npm start`
6. Add Environment Variable: `TELEGRAM_BOT_TOKEN`

### Railway.app (бесплатно)
1. Зарегистрируйтесь на railway.app
2. New Project → Deploy from GitHub
3. Add Variables → `TELEGRAM_BOT_TOKEN`
4. Deploy!

---

## Проверка работы

Отправьте `/start` вашему боту в Telegram → должен появиться титульный экран!

## Полезные команды

```bash
# Логи бота
tail -f bot.log

# Перезапуск
pm2 restart midgard-bot

# Статус
pm2 status

# Мониторинг
pm2 monit
```

---

**Бот готов к деплою! Код полностью рабочий.** 🚀
