import { createContext, useContext, useState, useEffect, useRef } from "react";
import useAuthStore from "../hooks/useAuthStore";
import translations from "../i18n/translations.json";

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState("de");
  // Prevents authUser refetches from rolling back a manual language change mid-save
  const isChangingLanguage = useRef(false);
  const authUser = useAuthStore((s) => s.user);

  // Only sync from server when no manual change is in flight
  useEffect(() => {
    if (!isChangingLanguage.current && authUser?.language) {
      setLanguageState(authUser.language);
    }
  }, [authUser]);

  // Sets language and locks out authUser override until releaseLanguageLock is called
  const setLanguage = (lang) => {
    isChangingLanguage.current = true;
    setLanguageState(lang);
  };

  // Call after save completes (success or failure) to re-enable authUser syncing
  const releaseLanguageLock = () => {
    isChangingLanguage.current = false;
  };

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
    <I18nContext.Provider value={{ language, setLanguage, releaseLanguageLock, t }}>
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
