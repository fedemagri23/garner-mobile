import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { LocationProvider } from '@/features/location/location-provider';
import { colors, fonts } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  };
}

/**
 * The web build's tabs. Native tabs render on the web as a floating bar
 * across the top that covers the screen and cuts the fifth tab off at phone
 * width; this is the bottom bar from the mockups instead. The web target is
 * for development and quick manual checks — the product is the native app.
 */
export default function AppTabsWeb() {
  return (
    <LocationProvider>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, height: 64 },
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.ground },
      }}>
      <Tabs.Screen name="(home)" options={{ title: 'Inicio', tabBarIcon: tabIcon('home-outline') }} />
      <Tabs.Screen name="search" options={{ title: 'Buscar', tabBarIcon: tabIcon('search-outline') }} />
      <Tabs.Screen name="lists" options={{ title: 'Listas', tabBarIcon: tabIcon('list-outline') }} />
      <Tabs.Screen name="shop" options={{ title: 'Compra', tabBarIcon: tabIcon('cart-outline') }} />
      <Tabs.Screen name="inbox" options={{ title: 'Avisos', tabBarIcon: tabIcon('notifications-outline') }} />
    </Tabs>
    </LocationProvider>
  );
}
