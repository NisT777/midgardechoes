#!/bin/bash
set -e

echo "================================================"
echo "  🌟 Midgard Echoes — Автоматическая установка"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js не найден!${NC}"
    echo "Установи Node.js 20+: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}❌ Node.js слишком старый: $(node -v)${NC}"
    echo "Нужен Node.js 20+. Скачай: https://nodejs.org"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm не найден!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm -v)${NC}"

# Install dependencies
echo ""
echo -e "${YELLOW}📦 Установка зависимостей...${NC}"
npm install

# Check environment
echo ""
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Файл .env не найден!${NC}"
    echo ""
    echo "Создаю .env..."
    
    read -p "Введите TELEGRAM_BOT_TOKEN: " BOT_TOKEN
    read -p "Введите DATABASE_URL (из TiDB Cloud): " DB_URL
    
    cat > .env <<EOF
APP_ID=midgard-echoes-app
APP_SECRET=midgard-secret-key-2024
VITE_APP_ID=midgard-echoes-app
DATABASE_URL=${DB_URL}
TELEGRAM_BOT_TOKEN=${BOT_TOKEN}
EOF
    echo -e "${GREEN}✅ .env создан!${NC}"
else
    echo -e "${GREEN}✅ .env найден${NC}"
fi

# Setup database
echo ""
echo -e "${YELLOW}🗄️  Настройка базы данных...${NC}"
npm run db:push

echo ""
echo -e "${YELLOW}🌱 Заполнение игровых данных...${NC}"
npx tsx db/seed.ts

# Build project
echo ""
echo -e "${YELLOW}🔨 Сборка проекта...${NC}"
npm run build

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  ✅ Установка завершена!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Запусти бота командой:"
echo -e "${YELLOW}  npm run bot${NC}"
echo ""
echo "Или для разработки:"
echo -e "${YELLOW}  npm run dev${NC}"
echo ""
