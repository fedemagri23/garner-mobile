import { switchLanguage } from '@/i18n';

import { categoryPath, departmentsOf, searchCategories, type Category } from '../category-tree';

const category = (id: string, name: string, parentId: string | null, position: number, extra: Partial<Category> = {}): Category => ({
  id,
  name,
  slug: id,
  parentId,
  position,
  icon: parentId ? null : 'cheese',
  translations: {},
  synonyms: {},
  ...extra,
});

const dairy = category('lacteos', 'Lácteos y huevos', null, 2, { translations: { de: 'Milchprodukte und Eier' } });
const drinks = category('bebidas', 'Bebidas', null, 1);
const yogurt = category('yogures', 'Yogures', 'lacteos', 2);
const milk = category('leche', 'Leche', 'lacteos', 0);
const soda = category('gaseosas', 'Gaseosas', 'bebidas', 0, { synonyms: { es: ['refresco'], de: ['Limo'] } });
const all = [yogurt, dairy, soda, milk, drinks];

afterEach(() => switchLanguage('es'));

it('orders departments and their aisles by position', () => {
  expect(departmentsOf(all).map(({ category: c, aisles }) => [c.id, aisles.map((a) => a.id)])).toEqual([
    ['bebidas', ['gaseosas']],
    ['lacteos', ['leche', 'yogures']],
  ]);
});

describe('searchCategories', () => {
  it('finds by name without accents or case, aisles first', () => {
    expect(searchCategories(all, 'lacteos').map((c) => c.id)).toEqual(['lacteos']);
    expect(searchCategories(all, 'yog').map((c) => c.id)).toEqual(['yogures']);
  });

  it('finds by a search word in any language', () => {
    expect(searchCategories(all, 'limo').map((c) => c.id)).toEqual(['gaseosas']);
    expect(searchCategories(all, 'refresco').map((c) => c.id)).toEqual(['gaseosas']);
  });

  it('finds by the name in the app’s language, and waits for two letters', async () => {
    await switchLanguage('de');
    expect(searchCategories(all, 'milchprodukte').map((c) => c.id)).toEqual(['lacteos']);
    expect(searchCategories(all, 'm')).toEqual([]);
  });
});

it('writes a category with its department', async () => {
  expect(categoryPath(yogurt, all)).toBe('Lácteos y huevos › Yogures');
  await switchLanguage('de');
  expect(categoryPath(dairy, all)).toBe('Milchprodukte und Eier');
});
