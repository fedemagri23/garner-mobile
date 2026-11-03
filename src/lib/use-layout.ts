import { useWindowDimensions } from 'react-native';

import { breakpoints } from '@/theme/tokens';

export type SizeClass = 'compact' | 'medium' | 'expanded';

/** The size class of a window this wide. */
export const sizeClassOf = (width: number): SizeClass =>
  width >= breakpoints.expanded ? 'expanded' : width >= breakpoints.medium ? 'medium' : 'compact';

/** How high a map at the top of a screen is: short phones keep room for what is under it. */
export const mapHeightFor = (windowHeight: number) => Math.min(320, Math.max(160, Math.round(windowHeight * 0.3)));

/** The window's size class, updating live as it resizes, rotates or unfolds. */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const sizeClass = sizeClassOf(width);

  return { width, height, sizeClass, isCompact: sizeClass === 'compact' };
}
