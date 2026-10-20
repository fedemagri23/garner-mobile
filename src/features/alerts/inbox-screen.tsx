import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { StateMessage } from '@/components/state-message';
import { Text } from '@/components/text';
import { errorMessage } from '@/lib/error-message';
import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { composeMessage, groupByDay, whenText, type Notification } from './messages';
import { useAlerts, useMarkRead, useMessages, usePreferences, useSavePreferences } from './use-alerts';

/** Avisos: what the shopper's alerts have found, newest first, unread marked. */
export default function InboxScreen() {
  const messages = useMessages();
  const alerts = useAlerts();
  const markRead = useMarkRead();
  const [refreshing, setRefreshing] = useState(false);

  const all = messages.data?.pages.flatMap((page) => page.data) ?? [];
  const sections = groupByDay(all).map(({ section, items }) => ({ title: section, data: items }));
  const unread = messages.data?.pages[0]?.unreadCount ?? 0;

  const open = (message: Notification) => {
    if (message.readAt === null) {
      markRead.mutate(message.id);
    }
    if (message.productId) {
      router.push(`/inbox/product/${message.productId}`);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await messages.refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <SectionList
        sections={sections}
        keyExtractor={(message) => message.id}
        renderItem={({ item }) => <Message message={item} onPress={() => open(item)} />}
        renderSectionHeader={({ section }) => (
          <Text style={styles.section} tone="muted" accessibilityRole="header">
            {section.title}
          </Text>
        )}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        onEndReached={() => {
          if (messages.hasNextPage && !messages.isFetchingNextPage) messages.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.titleText}>
                <Text variant="title" accessibilityRole="header">
                  Avisos
                </Text>
                {unread > 0 ? (
                  <Text variant="caption" tone="accent" style={styles.strong}>
                    {unread === 1 ? '1 sin leer' : `${unread} sin leer`}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Preferencias de avisos"
                onPress={() => router.push('/inbox/preferences')}
                style={styles.round}>
                <Ionicons name="options-outline" size={20} color={colors.ink} />
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Mis alertas, ${alerts.data?.length ?? 0}`}
              onPress={() => router.push('/inbox/alerts')}
              style={({ pressed }) => [styles.alertsLink, pressed && styles.pressed]}>
              <Ionicons name="notifications-outline" size={20} color={colors.accent} />
              <Text style={styles.alertsText} tone="accent">
                Mis alertas{alerts.data ? ` (${alerts.data.length})` : ''}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.accent} />
            </Pressable>
            <EmailCard />
          </View>
        }
        ListEmptyComponent={
          messages.isPending ? (
            <StateMessage loading />
          ) : messages.isError ? (
            <StateMessage tone="danger" message={errorMessage(messages.error)} />
          ) : (
            <StateMessage message="Todavía no hay avisos. Abrí un producto y tocá “Avisame si baja”: te escribimos acá cuando pase." />
          )
        }
      />
    </SafeAreaView>
  );
}

/** "¿También por email?": offered once, until the shopper chooses. */
function EmailCard() {
  const preferences = usePreferences();
  const save = useSavePreferences();
  const data = preferences.data;

  // Only where the server can send mail, and the shopper has not decided.
  if (!data || !data.emailAvailable || data.emailEnabled || data.emailOptedOutAt !== null) {
    return null;
  }

  return (
    <View style={styles.email}>
      <Ionicons name="mail-outline" size={22} color={colors.accent} />
      <Text style={styles.emailText}>¿También por email? Te avisamos aunque no abras la app.</Text>
      <Button
        label="Activar"
        loading={save.isPending}
        onPress={() => save.mutate({ emailEnabled: true })}
        style={styles.emailButton}
      />
    </View>
  );
}

function Message({ message, onPress }: { message: Notification; onPress: () => void }) {
  const { title, body } = composeMessage(message);
  const unread = message.readAt === null;
  const when = whenText(message.createdAt);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'Sin leer. ' : ''}${title}. ${body} ${when}`}
      onPress={onPress}
      style={({ pressed }) => [styles.message, pressed && styles.pressed]}>
      <View style={[styles.icon, unread ? styles.iconUnread : styles.iconRead]}>
        <Ionicons name="arrow-down" size={20} color={unread ? colors.signal : colors.muted} />
      </View>
      <View style={styles.messageText}>
        <View style={styles.messageTitleRow}>
          <Text style={[styles.messageTitle, unread && styles.strong]}>{title}</Text>
          {unread ? <View style={styles.dot} /> : null}
        </View>
        <Text style={styles.body}>{body}</Text>
        <Text variant="caption" tone="muted">
          {when}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  content: { padding: space.xl, gap: space.sm },
  header: { gap: space.lg, paddingBottom: space.sm, paddingTop: space.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  titleText: { gap: 2, flex: 1 },
  round: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertsLink: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  alertsText: { flex: 1, fontFamily: fonts.bodySemi },
  pressed: { backgroundColor: colors.surfaceMuted },
  email: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: 14,
    paddingHorizontal: space.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.accentSoft,
  },
  emailText: { flex: 1, fontSize: 14, lineHeight: 19 },
  emailButton: { minHeight: 40, paddingHorizontal: 14 },
  section: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    paddingTop: space.md,
    paddingBottom: space.xs,
  },
  message: {
    flexDirection: 'row',
    gap: space.md,
    padding: 14,
    paddingHorizontal: space.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    marginBottom: space.sm + 2,
  },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconUnread: { backgroundColor: colors.signalSoft },
  iconRead: { backgroundColor: colors.surfaceMuted },
  messageText: { flex: 1, gap: 3 },
  messageTitleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  messageTitle: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15 },
  strong: { fontFamily: fonts.bodyBold },
  body: { fontSize: 14, lineHeight: 19, color: colors.inkSoft },
  dot: { width: 8, height: 8, marginTop: 6, borderRadius: 4, backgroundColor: colors.accent },
});
