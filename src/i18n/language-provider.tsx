import { getLocales } from 'expo-localization';
import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { currentLanguage, switchLanguage } from './index';
import { resolveLanguage, type Language, type LanguageChoice } from './languages';
import { loadLanguageChoice, saveLanguageChoice } from './storage';

interface LanguageValue {
  /** What is showing now. */
  language: Language;
  /** What the shopper picked: a language, or 'system' to follow the phone. */
  choice: LanguageChoice;
  choose(choice: LanguageChoice): Promise<void>;
}

const LanguageContext = createContext<LanguageValue | null>(null);

const phoneLanguage = () => resolveLanguage(getLocales().map((locale) => locale.languageTag));

/**
 * Decides the language — the shopper's pick, else the phone's — and keeps it.
 * Text is written by `t()` from anywhere, not only components, so changing
 * language remounts everything below this provider rather than relying on each
 * component to subscribe: no screen can be left half in the old language.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<LanguageChoice>('system');
  const [language, setLanguage] = useState<Language>(currentLanguage());
  const [ready, setReady] = useState(false);

  const apply = useCallback(async (next: LanguageChoice) => {
    const resolved = next === 'system' ? phoneLanguage() : next;
    await switchLanguage(resolved);
    setChoice(next);
    setLanguage(resolved);
  }, []);

  useEffect(() => {
    loadLanguageChoice()
      .then(apply)
      .finally(() => setReady(true));
  }, [apply]);

  const choose = useCallback(
    async (next: LanguageChoice) => {
      await saveLanguageChoice(next);
      await apply(next);
    },
    [apply],
  );

  const value = useMemo(() => ({ language, choice, choose }), [language, choice, choose]);

  // Until the choice is read the screens would flash in the wrong language.
  if (!ready) {
    return null;
  }

  return (
    <LanguageContext.Provider value={value}>
      <Fragment key={language}>{children}</Fragment>
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageValue {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error('useLanguage must be used inside a LanguageProvider');
  }
  return value;
}
