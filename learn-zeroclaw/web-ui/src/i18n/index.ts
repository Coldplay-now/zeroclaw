import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import enDashboard from "./locales/en/dashboard.json";
import zhCommon from "./locales/zh/common.json";
import zhDashboard from "./locales/zh/dashboard.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon, dashboard: enDashboard },
    zh: { common: zhCommon, dashboard: zhDashboard },
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
