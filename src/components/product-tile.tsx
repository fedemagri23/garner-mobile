import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { initials } from '@/lib/format';
import { colors, fonts, radii } from '@/theme/tokens';

import { Text } from './text';

/** A product's photo, or its initials on a soft square when it has none. */
export function ProductTile({
  name,
  imageUrl,
  size = 44,
}: {
  name: string;
  imageUrl: string | null;
  size?: number;
}) {
  const box = { width: size, height: size, borderRadius: size >= 64 ? radii.lg : radii.sm };

  if (imageUrl) {
    return <Image source={imageUrl} style={[styles.tile, box]} contentFit="cover" accessible={false} />;
  }

  return (
    <View style={[styles.tile, box]} accessible={false}>
      <Text style={[styles.initials, { fontSize: size >= 64 ? 24 : 15 }]} tone="accent">
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fonts.display },
});
