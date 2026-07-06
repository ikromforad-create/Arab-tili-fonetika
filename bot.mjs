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

function mainKeyboard() {
  return new InlineKeyboard().webApp('DASTUR', webAppUrl);
}

function isAdmin(ctx) {
  return Boolean(ctx.from?.id && adminIds.has(String(ctx.from.id)));
}

function requireAdmin(ctx) {
  return isAdmin(ctx);
}

bot.command('start', async (ctx) => {
  const keyboard = mainKeyboard();
  await ctx.reply('Dasturdan foydalanish uchun quyidagi DASTUR tugmasini bosing.', {
    reply_markup: keyboard,
  });
});

bot.command('game', async (ctx) => {
  await ctx.reply('Dastur tayyor.', { reply_markup: mainKeyboard() });
});

bot.command('id', async (ctx) => {
  await ctx.reply(`Telegram ID: ${ctx.from?.id || 'topilmadi'}`);
});

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

try {
  await bot.api.setChatMenuButton({
    menu_button: {
      type: 'web_app',
      text: 'DASTUR',
      web_app: { url: webAppUrl },
    },
  });
} catch (error) {
  console.error('Chat menu button sozlanmadi:', error);
}

try {
  await bot.api.setMyCommands([
    { command: 'start', description: 'DASTUR tugmasini ochish' },
    { command: 'game', description: 'Dastur tugmasini yuborish' },
    { command: 'id', description: 'Telegram ID ni ko‘rish' },
  ]);
} catch (error) {
  console.error('Bot komandalarini sozlashda xato:', error);
}

await bot.start({
  onStart: (info) => {
    console.log(`@${info.username} ishga tushdi. Web App: ${webAppUrl}`);
  },
});
