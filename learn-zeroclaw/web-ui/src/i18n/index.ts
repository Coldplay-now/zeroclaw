import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import enDashboard from "./locales/en/dashboard.json";
import enChat from "./locales/en/chat.json";
import enPrompts from "./locales/en/prompts.json";
import enMemory from "./locales/en/memory.json";
import enTools from "./locales/en/tools.json";
import enScheduler from "./locales/en/scheduler.json";
import enAudit from "./locales/en/audit.json";
import enMetrics from "./locales/en/metrics.json";
import zhCommon from "./locales/zh/common.json";
import zhDashboard from "./locales/zh/dashboard.json";
import zhChat from "./locales/zh/chat.json";
import zhPrompts from "./locales/zh/prompts.json";
import zhMemory from "./locales/zh/memory.json";
import zhTools from "./locales/zh/tools.json";
import zhScheduler from "./locales/zh/scheduler.json";
import zhAudit from "./locales/zh/audit.json";
import zhMetrics from "./locales/zh/metrics.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon, dashboard: enDashboard, chat: enChat, prompts: enPrompts, memory: enMemory, tools: enTools, scheduler: enScheduler, audit: enAudit, metrics: enMetrics },
    zh: { common: zhCommon, dashboard: zhDashboard, chat: zhChat, prompts: zhPrompts, memory: zhMemory, tools: zhTools, scheduler: zhScheduler, audit: zhAudit, metrics: zhMetrics },
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
