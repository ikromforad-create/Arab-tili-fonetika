# Telegram Bot

Bu bot Telegram ichida mavjud web appni ochib beradi. Web App ochilganda Supabase sessiya tracking yozuvi yaratiladi: foydalanuvchi necha marta kirgani va ilovada taxminan qancha vaqt qolganini ko'rish mumkin.

## Sozlash

1. @BotFather orqali bot token oling.
2. Web appni HTTPS manzilga deploy qiling.
3. `.env` fayl yarating:

```bash
BOT_TOKEN=123456:bot-token
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TELEGRAM_DB_WRITE_SECRET=your-telegram-db-write-secret
BOT_ADMIN_IDS=123456789
WEB_APP_URL=https://your-site.netlify.app
VITE_SUPABASE_URL=https://lmguiyywgkucvkxcfrai.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

## Ishga tushirish

```bash
npm run bot
```

Botda `/start` yoki `/game` yuborilganda "DASTUR" tugmasi chiqadi. Telegram menu buttoni ham "DASTUR" deb chiqadi va web appni bevosita ochadi.

Admin komandalar:

```bash
/id
/users
/broadcast Assalomu alaykum! Bugun yangi mashqlar qo'shildi.
```

`/broadcast`, `/progress_reminder` va `/users` faqat `BOT_ADMIN_IDS` ichidagi Telegram ID larga ishlaydi. Telegram foydalanuvchilari `telegram_bot_users` jadvaliga yoziladi. Web App ichida login/register qilgan profil Telegram ID bilan bog'lanadi. Web App kirishlari `telegram_web_app_sessions` jadvaliga yoziladi, umumiy ko'rinish esa `analytics_telegram_web_app_usage` view orqali olinadi. `/progress_reminder` profili bog'langan foydalanuvchilarga `Siz {bosqich} bosqichiga yetib kelibsiz, so'z yodlashni davom ettiring.` mazmunidagi xabarni yuboradi. `SUPABASE_SERVICE_ROLE_KEY` bo'lmasa, bot `TELEGRAM_DB_WRITE_SECRET` orqali maxfiy RPC lardan foydalanadi.
