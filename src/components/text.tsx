import { StyleSheet, Text as NativeText, type TextProps } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'label';

interface Props extends TextProps {
  variant?: Variant;
  tone?: 'ink' | 'muted' | 'accent' | 'signal' | 'danger' | 'onAccent';
}

/** All text in the app goes through here, so type stays on the scale. */
export function Text({ variant = 'body', tone = 'ink', style, ...rest }: Props) {
  return <NativeText {...rest} style={[styles[variant], { color: colors[tone] }, style]} />;
}

const styles = StyleSheet.create({
  display: { fontFamily: fonts.display, fontSize: 36, lineHeight: 38, letterSpacing: -0.8 },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 33, letterSpacing: -0.5 },
  heading: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 18 },
});
