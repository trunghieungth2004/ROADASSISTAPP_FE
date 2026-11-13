import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { strings, type Lang, type Strings } from "../i18n";
import { setStatusLang } from "../api/meta";

type LanguageState = {
  lang: Lang;
  t: Strings;
  toggle: () => void;
};

const LanguageContext = createContext<LanguageState | null>(null);

const LANG_KEY = "roadassist.lang";

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "en" || saved === "vi") return saved;
  } catch {
    // ignore storage failures
  }
  return navigator.language.toLowerCase().startsWith("vi") ? "vi" : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  useEffect(() => {
    setStatusLang(lang);
  }, [lang]);
  const value = useMemo<LanguageState>(
    () => ({
      lang,
      t: strings[lang],
      toggle: () =>
        setLang((prev) => {
          const next = prev === "en" ? "vi" : "en";
          try {
            localStorage.setItem(LANG_KEY, next);
          } catch {
            // ignore storage failures
          }
          return next;
        }),
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
