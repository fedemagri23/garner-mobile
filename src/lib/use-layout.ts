import { useWindowDimensions } from 'react-native';

import { breakpoints } from '@/theme/tokens';

export type SizeClass = 'compact' | 'medium' | 'expanded';

/** The size class of a window this wide. */
export const sizeClassOf = (width: number): SizeClass =>
  width >= breakpoints.expanded ? 'expanded' : width >= breakpoints.medium ? 'medium' : 'compact';

/** The window's size class, updating live as it resizes, rotates or unfolds. */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const sizeClass = sizeClassOf(width);

  return { width, height, sizeClass, isCompact: sizeClass === 'compact' };
}
