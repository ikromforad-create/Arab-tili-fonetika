export function getTelegramWebApp() {
  return window.Telegram?.WebApp || null;
}

export function isTelegramWebApp() {
  return Boolean(getTelegramWebApp()?.initData);
}

export function getTelegramUser() {
  return getTelegramWebApp()?.initDataUnsafe?.user || null;
}

export function initTelegramWebApp() {
  const webApp = getTelegramWebApp();
  if (!webApp) return null;

  webApp.ready();
  webApp.expand();

  document.documentElement.classList.add('telegram-webapp');
  if (webApp.colorScheme) {
    document.documentElement.dataset.telegramTheme = webApp.colorScheme;
  }
  if (webApp.themeParams?.bg_color) {
    document.documentElement.style.setProperty('--telegram-bg', webApp.themeParams.bg_color);
  }
  if (webApp.themeParams?.text_color) {
    document.documentElement.style.setProperty('--telegram-text', webApp.themeParams.text_color);
  }

  return webApp;
}
