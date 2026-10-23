import type { components } from '@/api/types';
import { currentLanguage } from '@/i18n';

type Category = Pick<components['schemas']['CategoryResponse'], 'name' | 'translations'>;

/** A category's name in the app's language, or the Spanish one where nobody translated it. */
export function categoryName(category: Category): string {
  const language = currentLanguage();
  return (language === 'es' ? undefined : category.translations[language]) ?? category.name;
}
