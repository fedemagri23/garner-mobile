import type { components } from '@/api/types';
import { categoryName } from '@/lib/category-name';

export type Category = components['schemas']['CategoryResponse'];

export interface Department {
  category: Category;
  aisles: Category[];
}

/** Departments in their order, each with its aisles in theirs. */
export function departmentsOf(categories: Category[]): Department[] {
  const byPosition = (a: Category, b: Category) => a.position - b.position;
  return categories
    .filter((category) => category.parentId === null)
    .sort(byPosition)
    .map((category) => ({
      category,
      aisles: categories.filter((aisle) => aisle.parentId === category.id).sort(byPosition),
    }));
}

/** Words compared as people mean them: no accents, no case. */
export const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * Categories matching what was typed: by their name in the app's language,
 * their Spanish name, or any search word in any language ("gaseosa", "soda",
 * "Limo"). Aisles first, since they say more.
 */
export function searchCategories(categories: Category[], text: string): Category[] {
  const wanted = fold(text);
  if (wanted.length < 2) return [];
  const words = (category: Category) => [
    categoryName(category),
    category.name,
    ...Object.values(category.synonyms).flat(),
  ];
  return categories
    .filter((category) => words(category).some((word) => fold(word ?? '').includes(wanted)))
    .sort((a, b) => Number(a.parentId === null) - Number(b.parentId === null))
    .slice(0, 12);
}

/** "Lácteos y huevos › Yogures", in the app's language. */
export function categoryPath(category: Category, categories: Category[]): string {
  const parent = categories.find((candidate) => candidate.id === category.parentId);
  return parent ? `${categoryName(parent)} › ${categoryName(category)}` : categoryName(category);
}
