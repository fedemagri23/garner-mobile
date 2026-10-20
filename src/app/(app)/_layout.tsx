import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useUnreadCount } from '@/features/alerts/use-alerts';
import { useNotificationTaps } from '@/features/push/use-notification-taps';
import { colors } from '@/theme/tokens';

/**
 * The five sections from the mockups. Native tabs: the platform's own tab
 * bar (Liquid Glass on iOS 26, Material on Android), which also caps the
 * count at five. Each tab holds its own stack for the screens it pushes.
 */
export default function AppTabs() {
  const unread = useUnreadCount().data ?? 0;
  useNotificationTaps();

  return (
    <NativeTabs
      tintColor={colors.accent}
      backgroundColor={colors.surface}
      labelStyle={{ selected: { color: colors.accent } }}>
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Label>Buscar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="lists">
        <NativeTabs.Trigger.Label>Listas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet" md="list" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="shop">
        <NativeTabs.Trigger.Label>Compra</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="cart" md="shopping_cart" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inbox">
        <NativeTabs.Trigger.Label>Avisos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={unread === 0}>{unread > 9 ? '9+' : String(unread)}</NativeTabs.Trigger.Badge>
        <NativeTabs.Trigger.Icon sf="bell" md="notifications" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
