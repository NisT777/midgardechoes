# 🚀 Midgard Echoes — Пошаговая инструкция запуска

## 🎯 Что мы сделаем
Запустим текстовую MMORPG Midgard Echoes в Telegram. Бот будет работать 24/7.

**Примерное время:** 15-20 минут
**Стоимость:** $0 (бесплатно)

---

## 📋 Шаг 0: Подготовка

Тебе понадобится:
- 📧 Email (любой)
- 💳 Банковская карта **НЕ нужна** — всё бесплатно
- 🖥️ Компьютер с браузером

---

## 🔷 Шаг 1: Залить код на GitHub (5 минут)

### 1.1 Создай аккаунт на GitHub
1. Открой https://github.com/signup
2. Введи email → Придумай пароль → Введи имя пользователя
3. Подтверди email (письмо придёт на почту)
4. **Важно:** запомни свой **GitHub username** (имя пользователя)

### 1.2 Создай репозиторий
1. Зайди на https://github.com/new
2. **Repository name:** `midgardechoes`
3. Выбери **Public** (радиокнопка)
4. **НЕ ставь** галочку "Add a README"
5. Нажми зелёную кнопку **Create repository**
6. На следующей странице скопируй эти 3 команды из секции **"…or push an existing repository"**:

```bash
git remote add origin https://github.com/ТВОЙ_NICK/midgardechoes.git
git branch -M main
git push -u origin main
```

### 1.3 Загрузи код проекта

**Способ A — Через GitHub Desktop (проще):**
1. Скачай GitHub Desktop: https://desktop.github.com
2. File → Add local repository → Выбери папку `/mnt/agents/output/app`
3. Нажми **Publish repository**
4. Готово!

**Способ B — Через терминал:**

Открой терминал (Terminal на Mac, CMD/PowerShell на Windows) и выполни:

```bash
# Если на Linux/Mac:
cd /mnt/agents/output/app

# Если на Windows — скопируй папку app на рабочий стол, затем:
cd Desktop/app

# Далее команды:
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/ТВОЙ_NICK/midgardechoes.git
git branch -M main
git push -u origin main
```
*(замени ТВОЙ_NICK на свой GitHub username)*

**Проверка:** Зайди на https://github.com/ТВОЙ_NICK/midgardechoes — там должен быть код.

---

## 🔷 Шаг 2: Создать базу данных TiDB Cloud (5 минут)

### 2.1 Регистрация
1. Открой https://tidbcloud.com
2. Нажми **Sign Up** → зарегистрируйся через Google или email
3. Выбери **Developer Tier** (бесплатный)

### 2.2 Создать кластер
1. В панели управления нажми **Create Cluster**
2. **Cluster Name:** `midgard-db`
3. **Cloud Provider:** AWS
4. **Region:** Выбери ближайший (Frankfurt для Европы, Singapore для Азии)
5. **Tier:** Serverless **(обязательно выбери Free tier!)**
6. Нажми **Create** → жди 1-2 минуты

### 2.3 Получить данные подключения
1. Когда кластер станет **Available**, нажми **Connect**
2. Выбери **General** в выпадающем списке
3. Нажми кнопку с иконкой **глаза** чтобы показать пароль
4. Нажми **Copy** рядом с **Connection String**

У тебя будет строка вида:
```
mysql://username:password@host:4000/database?sslaccept=strict
```

**Сохрани эту строку** — она понадобится на шаге 4!

---

## 🔷 Шаг 3: Зарегистрироваться на Render (1 минута)

1. Открой https://dashboard.render.com
2. Нажми **Sign Up** → **Sign up with GitHub**
3. Разреши доступ к репозиториям
4. Готово! Ты в панели управления Render.

---

## 🔷 Шаг 4: Создать сервис на Render (5 минут)

### 4.1 Подключить репозиторий
1. В панели Render нажми зелёную кнопку **New +**
2. Выбери **Web Service**
3. Найди и выбери репозиторий `midgardechoes`
4. Нажми **Connect**

### 4.2 Настроить сервис
Заполни поля:

| Поле | Значение |
|------|----------|
| **Name** | `midgardechoes-bot` |
| **Region** | Frankfurt (Europe) или Oregon (US) |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npx tsx api/bot/start-bot-only.ts` |
| **Plan** | `Free` |

### 4.3 Добавить переменные окружения

Прокрути вниз до **Environment Variables**, нажми **Add Environment Variable**:

**Переменная 1:**
- Key: `TELEGRAM_BOT_TOKEN`
- Value: `ВАШ_ТОКЕН_ОТ_BOTFATHER`

**Переменная 2:**
- Key: `DATABASE_URL`
- Value: *(вставь строку подключения из Шага 2.3)*

**Переменная 3:**
- Key: `APP_ID`
- Value: `midgard-echoes-app`

**Переменная 4:**
- Key: `APP_SECRET`
- Value: `midgard-secret-key-2024`

**Переменная 5:**
- Key: `VITE_APP_ID`
- Value: `midgard-echoes-app`

### 4.4 Запустить!
1. Прокрути в самый низ
2. Нажми **Create Web Service**
3. Жди 2-3 минуты пока статус изменится на **Live** 🟢

---

## 🔷 Шаг 5: Проверка (1 минута)

1. Открой Telegram
2. Найди бота **@midgardechoes_bot**
3. Отправь `/start`
4. **🎉 Должен появиться титульный экран игры!**

Если бот не отвечает:
- Проверь логи в Render: вкладка **Logs** в панели управления
- Убедись что статус **Live** (зелёная точка)

---

## 🎮 Начало игры

После `/start` ты увидишь:
```
╔══════════════════════════════════════╗
║        🌟 MIDGARD ECHOES 🌟          ║
╚══════════════════════════════════════╝

👤 Novice_1234 | Lv.1 NOVICE
❤️ HP: 60/60 | 💙 SP: 20/20
💰 Zeny: 0z

[🎮 Играть] [📊 Персонаж]
[🎒 Инвентарь] [⚔️ Бой]
```

Нажми **🎮 Играть** — и начинай своё приключение в Мидгарде!

---

## 🆘 Частые проблемы

### "Build failed" в Render
Проверь логи — возможно ошибка в Build Command. Убедись что точно:
```
npm install && npm run build
```

### "Cannot connect to database"
Проверь что DATABASE_URL скопирован полностью из TiDB Cloud. Должен содержать `sslaccept=strict` в конце.

### Бот не отвечает в Telegram
- Проверь что TELEGRAM_BOT_TOKEN введён правильно
- В логах Render должно быть: `Bot @midgardechoes_bot started!`
- Попробуй перезапустить сервис: в Render нажми **Manual Deploy** → **Deploy latest commit**

---

## 📞 Связь
Если что-то не работает — скинь логи из Render (вкладка Logs) и разберёмся!
