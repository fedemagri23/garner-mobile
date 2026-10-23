import { switchLanguage } from '@/i18n';

import { categoryName } from '../category-name';

const dairy = { name: 'Lácteos', translations: { en: 'Dairy', de: 'Milchprodukte' } };
const milk = { name: 'Leche', translations: {} };

afterEach(() => switchLanguage('es'));

it('names a category in the app’s language, falling back to Spanish', async () => {
  expect(categoryName(dairy)).toBe('Lácteos');
  await switchLanguage('de');
  expect(categoryName(dairy)).toBe('Milchprodukte');
  expect(categoryName(milk)).toBe('Leche');
  await switchLanguage('en');
  expect(categoryName(dairy)).toBe('Dairy');
});
