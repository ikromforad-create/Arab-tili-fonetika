# Telegram Bot

Bu bot Telegram ichida mavjud web appni ochib beradi.

## Sozlash

1. @BotFather orqali bot token oling.
2. Web appni HTTPS manzilga deploy qiling.
3. `.env` fayl yarating:

```bash
BOT_TOKEN=123456:bot-token
BOT_ADMIN_IDS=123456789
WEB_APP_URL=https://your-deployed-site.example.com
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
/progress_reminder
```

`/users`, `/broadcast` va `/progress_reminder` faqat `BOT_ADMIN_IDS` ichidagi Telegram ID larga ishlaydi.

> **Eslatma:** loyiha avval Supabase'da Telegram foydalanuvchilarini kuzatib borgan (`telegram_bot_users` va shunga o'xshash jadvallar orqali). Supabase butunlay olib tashlangan, shuning uchun `/users`, `/broadcast` va `/progress_reminder` hozircha faqat xabar qaytaradi va real ishlamaydi. Bu funksiyalarni qayta ishga tushirish uchun yangi Postgres (Neon) bazasida mos jadvallarni yaratib, `bot.mjs`ni `pg` orqali yozish kerak (xuddi `api/_db.js` qilgani kabi).
