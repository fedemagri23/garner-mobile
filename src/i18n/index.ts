import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { catalogs, type SpanishCatalog } from './catalog';
import { DEFAULT_LANGUAGE, type Language } from './languages';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    // Keys are checked against the Spanish catalog: a typo is a type error.
    resources: { translation: SpanishCatalog };
  }
}

const i18n = createInstance();

// Started with Spanish at import, so code that runs outside React — and every
// test — can already write words. The provider switches it to the shopper's.
void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: catalogs.es },
    en: { translation: catalogs.en },
    de: { translation: catalogs.de },
    pt: { translation: catalogs.pt },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
});

/** Writes a phrase in the language the app is showing. */
export const t = i18n.t.bind(i18n);

export const currentLanguage = (): Language => i18n.language as Language;

export const switchLanguage = (language: Language) => i18n.changeLanguage(language);
