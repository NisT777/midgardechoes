#!/bin/bash

# Midgard Echoes — Bot Launcher

echo "🌟 Midgard Echoes — Telegram Bot Launcher"
echo "=========================================="

# Check if token is set
if grep -q "TELEGRAM_BOT_TOKEN=ВАШ_ТОКЕН_ЗДЕСЬ" .env; then
  echo ""
  echo "❌ TELEGRAM_BOT_TOKEN не настроен!"
  echo ""
  echo "📖 Как получить токен (1 минута):"
  echo "   1. Откройте Telegram и найдите @BotFather"
  echo "   2. Отправьте: /newbot"
  echo "   3. Введите имя бота: Midgard Echoes"
  echo "   4. Введите username: midgardechoes_bot (или любой другой, оканчивающийся на _bot)"
  echo "   5. Скопируйте токен, который даст BotFather"
  echo "   6. Вставьте токен в файл .env в строку TELEGRAM_BOT_TOKEN="
  echo ""
  echo "⚡ Или дайте мне токен — я всё настрою!"
  exit 1
fi

echo "✅ Токен найден"
echo "🔄 Запуск сервера..."
echo ""

npm run dev
