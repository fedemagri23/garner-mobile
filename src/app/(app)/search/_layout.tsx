import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

export default function SearchStack() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }} />;
}
