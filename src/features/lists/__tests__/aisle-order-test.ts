import type { Category } from '@/features/community/category-tree';

import { groupByAisle } from '../aisle-order';

const category = (id: string, name: string, parentId: string | null, position: number): Category => ({
  id,
  name,
  slug: id,
  parentId,
  position,
  translations: {},
  synonyms: {},
});

const categories = [
  category('almacen', 'Almacén', null, 0),
  category('pastas', 'Pastas secas', 'almacen', 1),
  category('arroz', 'Arroz y legumbres', 'almacen', 0),
  category('lacteos', 'Lácteos y huevos', null, 2),
  category('leche', 'Leche', 'lacteos', 0),
];
const line = (name: string, categoryId: string) => ({ product: { name, categoryId } });

it('groups lines by department in the shop’s order, aisles in order within', () => {
  const groups = groupByAisle(
    [line('Leche Entera', 'leche'), line('Fideos', 'pastas'), line('Arroz', 'arroz'), line('Avena', 'almacen')],
    categories,
  );

  expect(groups.map((group) => [group.title, group.items.map((item) => item.product.name)])).toEqual([
    ['Almacén', ['Avena', 'Arroz', 'Fideos']],
    ['Lácteos y huevos', ['Leche Entera']],
  ]);
});

it('puts lines whose category is unknown last, untitled', () => {
  const groups = groupByAisle([line('Misterio', 'nope'), line('Leche', 'leche')], categories);
  expect(groups.map((group) => group.title)).toEqual(['Lácteos y huevos', null]);
});
