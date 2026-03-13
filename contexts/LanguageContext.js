import { createContext, useContext, useState } from "react";

const LanguageContext = createContext();

/**
 * langValues:
 *  - ui language: 'zh' or 'en' (for site UI)
 *  - book language keys (data from Notion) expected: 'cn', 'bilingual', 'en'
 */

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("zh"); // UI language: 'zh' or 'en'
  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
