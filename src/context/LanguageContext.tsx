import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { strings, type Lang, type Strings } from "../i18n";

type LanguageState = {
  lang: Lang;
  t: Strings;
  toggle: () => void;
};

const LanguageContext = createContext<LanguageState | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() =>
    navigator.language.toLowerCase().startsWith("vi") ? "vi" : "en",
  );
  const value = useMemo<LanguageState>(
    () => ({
      lang,
      t: strings[lang],
      toggle: () => setLang((prev) => (prev === "en" ? "vi" : "en")),
    }),
    [lang],
  );
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useStrings() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("LanguageProvider missing");
  }
  return ctx;
}
