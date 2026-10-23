/** The languages the app is written in. Spanish is the original and the fallback. */
export const LANGUAGES = ['es', 'en', 'de', 'pt'] as const;
export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'es';

/** What a shopper can pick: one language, or whatever the phone is set to. */
export type LanguageChoice = Language | 'system';

/** Each language's own name, so a shopper can find theirs whatever the app is showing. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  es: 'Español',
  en: 'English',
  de: 'Deutsch',
  pt: 'Português',
};

export const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);

/**
 * The first of the phone's preferred languages the app is written in, else
 * Spanish. `["fr", "de-AT"]` is German: the phone's order is the shopper's,
 * and a language we lack is skipped rather than ending the search.
 */
export function resolveLanguage(preferred: readonly (string | null | undefined)[]): Language {
  for (const tag of preferred) {
    const code = tag?.toLowerCase().split(/[-_]/)[0];
    if (isLanguage(code)) {
      return code;
    }
  }
  return DEFAULT_LANGUAGE;
}
