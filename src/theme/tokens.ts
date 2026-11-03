/**
 * Design tokens, taken from the mockups ("market fresh"): a light sage
 * ground, deep green for savings and the primary action, amber for price
 * drops and anything waiting. Every colour pair used for text passes WCAG AA
 * (4.5:1) on the surfaces it sits on.
 *
 * Light only for now; a dark palette is a later phase.
 */

export const colors = {
  ground: '#F3F5F0',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF1EC',
  ink: '#17211B',
  inkSoft: '#3F4A43',
  muted: '#5B665F',
  line: '#DDE3DA',
  lineStrong: '#C9D2C6',

  accent: '#1E6B45',
  accentPressed: '#14502F',
  accentSoft: '#E3EFE6',
  onAccent: '#FFFFFF',

  /** Price drops and anything pending. */
  signal: '#9A4A0B',
  signalSoft: '#FBEBD9',

  danger: '#A12A1F',
  dangerSoft: '#FBE4E1',

  /** The user's own position on a map. */
  you: '#1F5FA8',
} as const;

export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemi: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
} as const;

/** 4-point scale. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/** Never smaller than this for anything tappable. */
export const MIN_TOUCH = 44;

/**
 * How wide the window is decides the layout, never the device: a phone-sized
 * browser window gets the phone layout, an iPad in Split View may too.
 */
export const breakpoints = {
  /** Tablets, unfolded foldables, small windows. */
  medium: 600,
  /** Large tablets and computers. */
  expanded: 1024,
} as const;

/** The widest a column of reading or a form gets, however large the screen. */
export const CONTENT_MAX_WIDTH = 720;

/** Spread into a page's content style: fills a phone, centres on anything wider. */
export const pageColumn = {
  width: '100%',
  maxWidth: CONTENT_MAX_WIDTH,
  alignSelf: 'center',
} as const;
