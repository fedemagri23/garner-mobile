import type { Category } from '@/features/community/category-tree';
import { categoryName } from '@/lib/category-name';

/** A run of a list's lines under one department, in the order a shop is walked. */
export interface AisleGroup<T> {
  key: string;
  /** The department's name; null for lines whose category the app does not know. */
  title: string | null;
  items: T[];
}

/**
 * A list's lines grouped by department, departments and aisles in the
 * taxonomy's order (the way a supermarket is laid out), names alphabetical
 * within an aisle. Lines with a category the app does not know come last.
 */
export function groupByAisle<T extends { product: { name: string; categoryId: string } }>(
  items: T[],
  categories: Category[],
): AisleGroup<T>[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const place = (item: T) => {
    const category = byId.get(item.product.categoryId);
    const department = category?.parentId ? byId.get(category.parentId) : category;
    return {
      department,
      rank: department ? [department.position, category && category.parentId ? category.position : -1] : [Infinity, 0],
    };
  };

  const sorted = [...items].sort((a, b) => {
    const [pa, pb] = [place(a).rank, place(b).rank];
    return pa[0] - pb[0] || pa[1] - pb[1] || a.product.name.localeCompare(b.product.name);
  });

  const groups: AisleGroup<T>[] = [];
  for (const item of sorted) {
    const { department } = place(item);
    const key = department?.id ?? 'other';
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, title: department ? categoryName(department) : null, items: [item] });
  }
  return groups;
}
