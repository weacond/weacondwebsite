import { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext();

/**
 * lang:
 *  - UI language: 'zh' or 'en' (controls labels)
 *  - Book language keys from Notion are expected to be: 'cn', 'bilingual', 'en'
 */

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("zh");

  // optional: persist UI language in localStorage so navigation doesn't reset it
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("weacond_lang") : null;
    if (saved === "zh" || saved === "en") setLang(saved);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("weacond_lang", lang);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
