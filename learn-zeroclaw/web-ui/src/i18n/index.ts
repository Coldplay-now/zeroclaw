import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import enDashboard from "./locales/en/dashboard.json";
import enChat from "./locales/en/chat.json";
import enPrompts from "./locales/en/prompts.json";
import zhCommon from "./locales/zh/common.json";
import zhDashboard from "./locales/zh/dashboard.json";
import zhChat from "./locales/zh/chat.json";
import zhPrompts from "./locales/zh/prompts.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon, dashboard: enDashboard, chat: enChat, prompts: enPrompts },
    zh: { common: zhCommon, dashboard: zhDashboard, chat: zhChat, prompts: zhPrompts },
  },
  lng: (() => { try { return localStorage.getItem("zeroclaw_lang") || undefined; } catch { return undefined; } })(),
  fallbackLng: "en",
  defaultNS: "common",
  interpolation: { escapeValue: false },
  detection: {
    order: ["localStorage", "navigator"],
    lookupLocalStorage: "zeroclaw_lang",
  },
});

export default i18n;
