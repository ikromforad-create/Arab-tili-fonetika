import type { Config, Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { Bot, Keyboard, InlineKeyboard, webhookCallback } from "grammy";

const token = Netlify.env.get("BOT_TOKEN");
const webAppUrl = Netlify.env.get("WEB_APP_URL");
const supabaseUrl = Netlify.env.get("SUPABASE_URL") || Netlify.env.get("VITE_SUPABASE_URL");
const serviceRoleKey = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
const telegramDbWriteSecret = Netlify.env.get("TELEGRAM_DB_WRITE_SECRET");
const webhookSecret = Netlify.env.get("TELEGRAM_WEBHOOK_SECRET") || telegramDbWriteSecret;
const publishableKey = Netlify.env.get("SUPABASE_PUBLISHABLE_KEY") || Netlify.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");
const adminIds = new Set(
  String(Netlify.env.get("BOT_ADMIN_IDS") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);

if (!token) throw new Error("BOT_TOKEN env qiymatini kiriting.");
if (!webAppUrl?.startsWith("https://")) {
  throw new Error("WEB_APP_URL https:// bilan boshlanishi kerak.");
}

const bot = new Bot(token);
const supabaseKey = serviceRoleKey || (telegramDbWriteSecret ? publishableKey : null);
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  : null;
const usePrivateRpc = Boolean(supabase && !serviceRoleKey && telegramDbWriteSecret);

const AUTHOR_URL = "https://t.me/Ikrom_Abdulahad";
const AUTHOR_SITE = "https://www.ikromabdulahad.uz";
const AUTHOR_YOUTUBE = "https://www.youtube.com/channel/UC3GUt51Tf1_ffICPtOBxL8Q";
const CHATBOT_LABEL = "DASTUR";
const AUTHOR_LABEL = "👨‍🏫 Muallif bilan bog'lanish";

function mainKeyboard() {
  return new Keyboard()
    .webApp(CHATBOT_LABEL, webAppUrl)
    .row()
    .text(AUTHOR_LABEL)
    .resized()
    .persistent();
}

function inlineWebAppKeyboard() {
  return new InlineKeyboard().webApp(CHATBOT_LABEL, webAppUrl);
}

function normalize(text: string) {
  return text.toLowerCase().replace(/['‘’`]/g, "").replace(/\s+/g, " ").trim();
}

function updateKind(update: Record<string, unknown>) {
  return Object.keys(update).find((key) => key !== "update_id") || "unknown";
}

function messageFromUpdate(update: Record<string, any>) {
  return update.message || update.edited_message || update.callback_query?.message || null;
}

function fromUpdate(update: Record<string, any>) {
  return update.message?.from
    || update.edited_message?.from
    || update.callback_query?.from
    || update.web_app_data?.from
    || null;
}

async function recordUpdate(update: Record<string, any>) {
  if (!supabase) return;

  const from = fromUpdate(update);
  const message = messageFromUpdate(update);
  const chat = message?.chat || null;

  if (from?.id && chat?.id && chat.type === "private") {
    const userPayload = {
      telegram_user_id: from.id,
      chat_id: chat.id,
      username: from.username || null,
      first_name: from.first_name || null,
      last_name: from.last_name || null,
      language_code: from.language_code || null,
      is_bot: Boolean(from.is_bot),
    };
    const { error: userError } = usePrivateRpc
      ? await supabase.rpc("record_telegram_bot_user", {
        p_write_secret: telegramDbWriteSecret,
        p_telegram_user_id: userPayload.telegram_user_id,
        p_chat_id: userPayload.chat_id,
        p_username: userPayload.username,
        p_first_name: userPayload.first_name,
        p_last_name: userPayload.last_name,
        p_language_code: userPayload.language_code,
        p_is_bot: userPayload.is_bot,
      })
      : await supabase.from("telegram_bot_users").upsert({
        ...userPayload,
        last_seen_at: new Date().toISOString(),
        blocked_at: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "telegram_user_id" });

    if (userError) console.error("Telegram user saqlanmadi:", userError.message);
  }

  const updatePayload = {
    update_id: update.update_id || null,
    telegram_user_id: from?.id || null,
    chat_id: chat?.id || null,
    message_id: message?.message_id || null,
    update_type: updateKind(update),
    text: update.message?.text || update.edited_message?.text || null,
    payload: update,
  };
  const { error: updateError } = usePrivateRpc
    ? await supabase.rpc("record_telegram_bot_update", {
      p_write_secret: telegramDbWriteSecret,
      p_update_id: updatePayload.update_id,
      p_telegram_user_id: updatePayload.telegram_user_id,
      p_chat_id: updatePayload.chat_id,
      p_message_id: updatePayload.message_id,
      p_update_type: updatePayload.update_type,
      p_text: updatePayload.text,
      p_payload: updatePayload.payload,
    })
    : await supabase.from("telegram_bot_updates").insert(updatePayload);

  if (updateError && updateError.code !== "23505") {
    console.error("Telegram update saqlanmadi:", updateError.message);
  }
}

function isAdmin(id?: number) {
  return Boolean(id && adminIds.has(String(id)));
}

async function replyWithHome(ctx: any, text: string) {
  await ctx.reply(text, {
    reply_markup: mainKeyboard(),
  });
}

bot.use(async (ctx, next) => {
  await recordUpdate(ctx.update as Record<string, any>);
  return next();
});

bot.command("start", async (ctx) => {
  await replyWithHome(
    ctx,
    "Assalomu alaykum azizlar! Endilikda siz LUG'AT YODLA dasturidan Telegram ichida foydalanishingiz mumkin.",
  );
});

bot.command("game", async (ctx) => {
  await ctx.reply("Chatbot tayyor. Tugmani bosib davom eting.", {
    reply_markup: inlineWebAppKeyboard(),
  });
  await ctx.reply("Asosiy tugmalar:", { reply_markup: mainKeyboard() });
});

bot.command("id", async (ctx) => {
  await ctx.reply(`Telegram ID: ${ctx.from?.id || "topilmadi"}`);
});

bot.command("users", async (ctx) => {
  if (!isAdmin(ctx.from?.id)) {
    await ctx.reply(`Bu komanda faqat admin uchun. Sizning Telegram ID: ${ctx.from?.id || "topilmadi"}`);
    return;
  }
  if (!supabase) {
    await ctx.reply("Supabase sozlanmagan.");
    return;
  }
  const { count, error } = await supabase
    .from("telegram_bot_users")
    .select("telegram_user_id", { count: "exact", head: true })
    .is("blocked_at", null);
  await ctx.reply(error ? `Foydalanuvchilar olinmadi: ${error.message}` : `Bot foydalanuvchilari: ${count || 0}`);
});

bot.hears(new RegExp("muallif|bog'?lanish|abdulahad", "i"), async (ctx) => {
  await ctx.reply(AUTHOR_URL, {
    reply_markup: new InlineKeyboard().url("Muallifga yozish", AUTHOR_URL),
    disable_web_page_preview: false,
  });
});

bot.hears(new RegExp("chatbot|dastur|ishlash", "i"), async (ctx) => {
  await ctx.reply("Chatbotni ochish uchun tugmani bosing.", {
    reply_markup: inlineWebAppKeyboard(),
  });
});

bot.on("message", async (ctx) => {
  const text = normalize(ctx.message.text || "");
  if (text === "/start" || text === "/game" || text === "/id") return;
  await replyWithHome(ctx, "⚠️ Faqat quyidagi tugmalardan foydalaning.");
});

bot.catch((error) => {
  console.error("Bot xatosi:", error.error);
});

const handleWebhook = webhookCallback(bot, "std/http");

export default async (req: Request, _context: Context) => {
  if (req.method === "GET") {
    await bot.api.raw.setChatMenuButton({
      menu_button: {
        type: "web_app",
        text: "DASTUR",
        web_app: { url: webAppUrl },
      },
    });
    return new Response("LUG'AT YODLA Telegram webhook tayyor.");
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (webhookSecret && req.headers.get("X-Telegram-Bot-Api-Secret-Token") !== webhookSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  return handleWebhook(req);
};

export const config: Config = {
  path: "/telegram-webhook",
};
