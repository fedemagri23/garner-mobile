import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { noContent, unwrap } from '@/api/client';
import type { components } from '@/api/types';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { StateMessage } from '@/components/state-message';
import { Text } from '@/components/text';
import { useProductSearch } from '@/features/catalog/use-catalog';
import { t } from '@/i18n';
import { errorMessage } from '@/lib/error-message';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useSession } from '@/session/session-provider';
import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

type ReviewItem = components['schemas']['ReviewItemResponse'];
type Action = 'verify' | 'hide' | 'restore';

const queueKey = ['moderation-queue'] as const;

/**
 * Moderación, for the team: what the community reported or what reports
 * pulled from search, with the decisions on each — verify, hide, restore,
 * and for a duplicate product, merging it into the one that stays.
 */
export function ModerationScreen() {
  const { api } = useSession();
  const queryClient = useQueryClient();
  const queue = useQuery({ queryKey: queueKey, queryFn: () => unwrap(api.GET('/v1/moderation/queue')) });
  const [merging, setMerging] = useState<ReviewItem | null>(null);

  const act = useMutation({
    mutationFn: ({ item, action }: { item: ReviewItem; action: Action }) =>
      noContent(
        api.POST('/v1/moderation/{target}/{id}/{action}', {
          params: { path: { target: item.targetType === 'PRODUCT' ? 'products' : 'stores', id: item.id, action } },
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queueKey }),
  });

  return (
    <Screen scroll={false}>
      <FlatList
        data={queue.data ?? []}
        keyExtractor={(item) => `${item.targetType}-${item.id}`}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              style={styles.round}>
              <Ionicons name="chevron-back" size={20} color={colors.ink} />
            </Pressable>
            <Text variant="title" accessibilityRole="header">
              {t('community.moderation.title')}
            </Text>
            <Text tone="muted">{t('community.moderation.intro')}</Text>
            {act.isError ? <Text tone="danger">{errorMessage(act.error)}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          queue.isPending ? (
            <StateMessage loading />
          ) : queue.isError ? (
            <StateMessage tone="danger" message={errorMessage(queue.error)} />
          ) : (
            <StateMessage message={t('community.moderation.empty')} />
          )
        }
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            busy={act.isPending && act.variables?.item.id === item.id}
            onAction={(action) => act.mutate({ item, action })}
            onMerge={() => setMerging(item)}
          />
        )}
      />
      {merging ? (
        <MergeSheet
          item={merging}
          onClose={() => setMerging(null)}
          onMerged={() => {
            setMerging(null);
            void queryClient.invalidateQueries({ queryKey: queueKey });
          }}
        />
      ) : null}
    </Screen>
  );
}

function ItemCard({
  item,
  busy,
  onAction,
  onMerge,
}: {
  item: ReviewItem;
  busy: boolean;
  onAction: (action: Action) => void;
  onMerge: () => void;
}) {
  const hidden = item.moderationStatus === 'HIDDEN' || item.moderationStatus === 'UNDER_REVIEW';
  return (
    <View style={styles.card}>
      <Text variant="caption" tone="muted">
        {item.targetType === 'PRODUCT' ? t('community.moderation.product') : t('community.moderation.store')} ·{' '}
        {t(`community.moderation.status.${item.moderationStatus as 'ACTIVE'}`)}
      </Text>
      <Text variant="bodyStrong">{item.name}</Text>
      <Text variant="caption" tone="signal">
        {t('community.moderation.flags', { count: item.flagCount })} ·{' '}
        {t('community.moderation.confirmations', { count: item.confirmationCount })}
      </Text>
      <View style={styles.actions}>
        <Button label={t('community.moderation.verify')} variant="secondary" disabled={busy} onPress={() => onAction('verify')} style={styles.action} />
        {hidden ? (
          <Button label={t('community.moderation.restore')} variant="secondary" disabled={busy} onPress={() => onAction('restore')} style={styles.action} />
        ) : (
          <Button label={t('community.moderation.hide')} variant="secondary" disabled={busy} onPress={() => onAction('hide')} style={styles.action} />
        )}
      </View>
      {item.targetType === 'PRODUCT' ? (
        <Button label={t('community.moderation.merge')} variant="secondary" disabled={busy} onPress={onMerge} />
      ) : null}
    </View>
  );
}

/** Choosing the product a duplicate folds into, then confirming. */
function MergeSheet({ item, onClose, onMerged }: { item: ReviewItem; onClose: () => void; onMerged: () => void }) {
  const { api } = useSession();
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query.trim());
  const results = useProductSearch(search, null, [], search.length >= 2);
  const candidates = (results.data?.pages[0]?.data ?? []).filter((product) => product.id !== item.id).slice(0, 6);
  const [kept, setKept] = useState<{ id: string; name: string } | null>(null);
  const merge = useMutation({
    mutationFn: (intoId: string) =>
      noContent(api.POST('/v1/moderation/products/{id}/merge', { params: { path: { id: item.id } }, body: { intoId } })),
    onSuccess: onMerged,
  });

  return (
    <Sheet title={t('community.moderation.mergeTitle', { name: item.name })} visible onClose={onClose}>
      <Text variant="caption" tone="muted">
        {t('community.moderation.mergeIntro')}
      </Text>
      <TextInput
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          setKept(null);
        }}
        accessibilityLabel={t('community.moderation.mergeSearch')}
        placeholder={t('community.moderation.mergeSearch')}
        placeholderTextColor={colors.muted}
        style={styles.search}
      />
      {candidates.map((product) => (
        <Pressable
          key={product.id}
          accessibilityRole="radio"
          accessibilityState={{ selected: kept?.id === product.id }}
          accessibilityLabel={product.name}
          onPress={() => setKept({ id: product.id, name: product.name })}
          style={[styles.candidate, kept?.id === product.id && styles.candidateSelected]}>
          <Text>{product.name}</Text>
        </Pressable>
      ))}
      {merge.isError ? <Text tone="danger">{errorMessage(merge.error)}</Text> : null}
      {kept ? (
        <Button
          label={t('community.moderation.mergeConfirm', { name: kept.name })}
          loading={merge.isPending}
          onPress={() => merge.mutate(kept.id)}
        />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.xl, gap: space.md },
  header: { gap: space.md, paddingBottom: space.sm },
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
  card: {
    gap: space.sm,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
  },
  actions: { flexDirection: 'row', gap: space.sm },
  action: { flex: 1 },
  search: {
    height: 48,
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.ink,
  },
  candidate: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: space.md, borderRadius: radii.md },
  candidateSelected: { backgroundColor: colors.accentSoft },
});
