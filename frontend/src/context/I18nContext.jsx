import { createContext, useContext, useState, useEffect } from "react";
import useAuthStore from "../hooks/useAuthStore";
import translations from "../i18n/translations.json";

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState("de");
  const authUser = useAuthStore((s) => s.user);

  // Load language from user preferences when user is fetched
  useEffect(() => {
    if (authUser?.language) {
      setLanguage(authUser.language);
    }
  }, [authUser]);

  const t = (key) => {
    const keys = key.split(".");
    let value = translations[language] ?? translations["de"];

    for (const k of keys) {
      if (value && typeof value === "object") {
        value = value[k];
      } else {
        return key;
      }
    }

    return value || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
