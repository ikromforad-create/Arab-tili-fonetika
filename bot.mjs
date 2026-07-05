import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { Bot, InlineKeyboard } from 'grammy';

config({ path: join(dirname(fileURLToPath(import.meta.url)), '.env') });

const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL;
const adminIds = new Set(
  String(process.env.BOT_ADMIN_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
);

if (!token) {
  throw new Error('BOT_TOKEN env qiymatini kiriting.');
}

if (!webAppUrl?.startsWith('https://')) {
  throw new Error('WEB_APP_URL https:// bilan boshlanishi kerak. Telegram Web App uchun HTTPS majburiy.');
}

const bot = new Bot(token);

function gameKeyboard() {
  return new InlineKeyboard().webApp('DASTUR', webAppUrl);
}

function isAdmin(ctx) {
  return Boolean(ctx.from?.id && adminIds.has(String(ctx.from.id)));
}

function requireAdmin(ctx) {
  if (isAdmin(ctx)) return true;
  return false;
}

bot.command('start', async (ctx) => {
  await ctx.reply(
    "Arab tili fonetika dasturini Telegram ichida ochish uchun tugmani bosing.",
    { reply_markup: gameKeyboard() },
  );
});

bot.command('game', async (ctx) => {
  await ctx.reply('Dastur tayyor.', { reply_markup: gameKeyboard() });
});

bot.command('id', async (ctx) => {
  await ctx.reply(`Telegram ID: ${ctx.from?.id || 'topilmadi'}`);
});

// NOTE: /users, /broadcast, and /progress_reminder used to read and write
// Telegram user records via Supabase (telegram_bot_users,
// telegram_broadcasts, telegram_profile_progress_reminders). Supabase has
// been removed from this project, and those tables do not exist in the new
// Postgres (Neon) database that api/_db.js connects to. Rather than leaving
// broken commands that fail at runtime, they've been removed here.
//
// If you want this functionality back, it needs to be rebuilt against the
// current Postgres database: create equivalent tables (a migration under
// neon/), then rewrite these handlers to use `pg` the same way api/_db.js
// does, instead of the Supabase client.
bot.command('users', async (ctx) => {
  if (!requireAdmin(ctx)) {
    await ctx.reply(`Bu komanda faqat admin uchun. Sizning Telegram ID: ${ctx.from?.id || 'topilmadi'}`);
    return;
  }
  await ctx.reply("Bu komanda hozircha ishlamaydi: Supabase o'chirilgan, yangi Postgres bazasida bu jadval hali yaratilmagan.");
});

bot.command('broadcast', async (ctx) => {
  if (!requireAdmin(ctx)) {
    await ctx.reply(`Bu komanda faqat admin uchun. Sizning Telegram ID: ${ctx.from?.id || 'topilmadi'}`);
    return;
  }
  await ctx.reply("Bu komanda hozircha ishlamaydi: Supabase o'chirilgan, yangi Postgres bazasida bu jadval hali yaratilmagan.");
});

bot.command('progress_reminder', async (ctx) => {
  if (!requireAdmin(ctx)) {
    await ctx.reply(`Bu komanda faqat admin uchun. Sizning Telegram ID: ${ctx.from?.id || 'topilmadi'}`);
    return;
  }
  await ctx.reply("Bu komanda hozircha ishlamaydi: Supabase o'chirilgan, yangi Postgres bazasida bu jadval hali yaratilmagan.");
});

bot.catch((error) => {
  console.error('Bot xatosi:', error.error);
});

await bot.api.raw.setChatMenuButton({
  menu_button: {
    type: 'web_app',
    text: 'DASTUR',
    web_app: { url: webAppUrl },
  },
});

await bot.start({
  onStart: (info) => {
    console.log(`@${info.username} ishga tushdi. Web App: ${webAppUrl}`);
  },
});
