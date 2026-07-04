import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Bot, InlineKeyboard } from 'grammy';

config({ path: join(dirname(fileURLToPath(import.meta.url)), '.env') });

const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const telegramDbWriteSecret = process.env.TELEGRAM_DB_WRITE_SECRET;
const adminIds = new Set(
  String(process.env.BOT_ADMIN_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
);
let warnedAboutSupabase = false;

if (!token) {
  throw new Error('BOT_TOKEN env qiymatini kiriting.');
}

if (!webAppUrl?.startsWith('https://')) {
  throw new Error('WEB_APP_URL https:// bilan boshlanishi kerak. Telegram Web App uchun HTTPS majburiy.');
}

const bot = new Bot(token);
const supabaseKey = serviceRoleKey || (telegramDbWriteSecret ? supabasePublishableKey : null);
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  : null;
const usePrivateRpc = Boolean(supabase && !serviceRoleKey && telegramDbWriteSecret);

function gameKeyboard() {
  return new InlineKeyboard().webApp('DASTUR', webAppUrl);
}

function isPrivateUser(ctx) {
  return ctx.chat?.type === 'private' && ctx.from?.id;
}

function isAdmin(ctx) {
  return Boolean(ctx.from?.id && adminIds.has(String(ctx.from.id)));
}

function requireAdmin(ctx) {
  if (isAdmin(ctx)) return true;
  return false;
}

async function recordTelegramUser(ctx) {
  if (!isPrivateUser(ctx)) return;
  if (!supabase) {
    if (!warnedAboutSupabase) {
      warnedAboutSupabase = true;
      console.warn('SUPABASE_SERVICE_ROLE_KEY yoki TELEGRAM_DB_WRITE_SECRET sozlanmagan, Telegram foydalanuvchilari DB ga yozilmaydi.');
    }
    return;
  }

  const user = ctx.from;
  const payload = {
    telegram_user_id: user.id,
    chat_id: ctx.chat.id,
    username: user.username || null,
    first_name: user.first_name || null,
    last_name: user.last_name || null,
    language_code: user.language_code || null,
    is_bot: Boolean(user.is_bot),
  };
  const { error } = usePrivateRpc
    ? await supabase.rpc('record_telegram_bot_user', {
      p_write_secret: telegramDbWriteSecret,
      p_telegram_user_id: payload.telegram_user_id,
      p_chat_id: payload.chat_id,
      p_username: payload.username,
      p_first_name: payload.first_name,
      p_last_name: payload.last_name,
      p_language_code: payload.language_code,
      p_is_bot: payload.is_bot,
    })
    : await supabase
      .from('telegram_bot_users')
      .upsert({
        ...payload,
        last_seen_at: new Date().toISOString(),
        blocked_at: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'telegram_user_id' });

  if (error) console.error('Telegram user saqlanmadi:', error.message);
}

async function getBroadcastRecipients() {
  if (!supabase) throw new Error('SUPABASE_SERVICE_ROLE_KEY yoki TELEGRAM_DB_WRITE_SECRET sozlanmagan.');
  if (usePrivateRpc) {
    const { data, error } = await supabase.rpc('telegram_bot_recipients', {
      p_write_secret: telegramDbWriteSecret,
    });
    if (error) throw new Error(error.message);
    return data || [];
  }

  const { data, error } = await supabase
    .from('telegram_bot_users')
    .select('telegram_user_id, chat_id')
    .eq('allows_broadcast', true)
    .is('blocked_at', null);
  if (error) throw new Error(error.message);
  return data || [];
}

async function getProgressReminderRecipients() {
  if (!supabase) throw new Error('SUPABASE_SERVICE_ROLE_KEY yoki TELEGRAM_DB_WRITE_SECRET sozlanmagan.');
  if (usePrivateRpc) {
    const { data, error } = await supabase.rpc('telegram_progress_reminder_recipients', {
      p_write_secret: telegramDbWriteSecret,
    });
    if (error) throw new Error(error.message);
    return data || [];
  }

  const { data, error } = await supabase
    .from('telegram_profile_progress_reminders')
    .select('telegram_user_id, chat_id, profile_id, username, unlocked_level, message_text');
  if (error) throw new Error(error.message);
  return data || [];
}

async function markBlocked(telegramUserId) {
  if (!supabase) return;
  if (usePrivateRpc) {
    await supabase.rpc('mark_telegram_bot_user_blocked', {
      p_write_secret: telegramDbWriteSecret,
      p_telegram_user_id: telegramUserId,
    });
    return;
  }

  await supabase
    .from('telegram_bot_users')
    .update({ blocked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('telegram_user_id', telegramUserId);
}

async function logBroadcast({ adminId, message, attempted, sent, failed }) {
  if (!supabase) return;
  if (usePrivateRpc) {
    await supabase.rpc('log_telegram_broadcast', {
      p_write_secret: telegramDbWriteSecret,
      p_admin_telegram_user_id: adminId,
      p_message: message,
      p_attempted_count: attempted,
      p_sent_count: sent,
      p_failed_count: failed,
    });
    return;
  }

  await supabase.from('telegram_broadcasts').insert({
    admin_telegram_user_id: adminId,
    message,
    attempted_count: attempted,
    sent_count: sent,
    failed_count: failed,
  });
}

bot.use(async (ctx, next) => {
  await recordTelegramUser(ctx);
  return next();
});

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

bot.command('users', async (ctx) => {
  if (!requireAdmin(ctx)) {
    await ctx.reply(`Bu komanda faqat admin uchun. Sizning Telegram ID: ${ctx.from?.id || 'topilmadi'}`);
    return;
  }
  try {
    const recipients = await getBroadcastRecipients();
    await ctx.reply(`Bot foydalanuvchilari: ${recipients.length}`);
  } catch (error) {
    await ctx.reply(`Foydalanuvchilar olinmadi: ${error.message}`);
  }
});

bot.command('broadcast', async (ctx) => {
  if (!requireAdmin(ctx)) {
    await ctx.reply(`Bu komanda faqat admin uchun. Sizning Telegram ID: ${ctx.from?.id || 'topilmadi'}`);
    return;
  }

  const message = ctx.message?.text?.replace(/^\/broadcast(@\w+)?\s*/i, '').trim();
  if (!message) {
    await ctx.reply('Yuborish formati: /broadcast Xabar matni');
    return;
  }

  let recipients;
  try {
    recipients = await getBroadcastRecipients();
  } catch (error) {
    await ctx.reply(`Broadcast boshlanmadi: ${error.message}`);
    return;
  }
  let sent = 0;
  let failed = 0;

  await ctx.reply(`${recipients.length} ta foydalanuvchiga xabar yuborish boshlandi.`);

  for (const recipient of recipients) {
    try {
      await bot.api.sendMessage(recipient.chat_id, message);
      sent += 1;
    } catch (error) {
      failed += 1;
      const description = error?.description || error?.message || '';
      if (description.includes('bot was blocked') || description.includes('chat not found')) {
        await markBlocked(recipient.telegram_user_id);
      }
      console.error(`Broadcast xatosi ${recipient.chat_id}:`, description);
    }
  }

  await logBroadcast({
    adminId: ctx.from.id,
    message,
    attempted: recipients.length,
    sent,
    failed,
  });
  await ctx.reply(`Broadcast tugadi. Yuborildi: ${sent}. Xato: ${failed}.`);
});

bot.command('progress_reminder', async (ctx) => {
  if (!requireAdmin(ctx)) {
    await ctx.reply(`Bu komanda faqat admin uchun. Sizning Telegram ID: ${ctx.from?.id || 'topilmadi'}`);
    return;
  }

  let recipients;
  try {
    recipients = await getProgressReminderRecipients();
  } catch (error) {
    await ctx.reply(`Progress eslatma boshlanmadi: ${error.message}`);
    return;
  }

  let sent = 0;
  let failed = 0;

  await ctx.reply(`${recipients.length} ta profili bog'langan foydalanuvchiga progress eslatma yuborish boshlandi.`);

  for (const recipient of recipients) {
    try {
      await bot.api.sendMessage(recipient.chat_id, recipient.message_text);
      sent += 1;
    } catch (error) {
      failed += 1;
      const description = error?.description || error?.message || '';
      if (description.includes('bot was blocked') || description.includes('chat not found')) {
        await markBlocked(recipient.telegram_user_id);
      }
      console.error(`Progress eslatma xatosi ${recipient.chat_id}:`, description);
    }
  }

  await logBroadcast({
    adminId: ctx.from.id,
    message: 'progress_reminder',
    attempted: recipients.length,
    sent,
    failed,
  });
  await ctx.reply(`Progress eslatma tugadi. Yuborildi: ${sent}. Xato: ${failed}.`);
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
