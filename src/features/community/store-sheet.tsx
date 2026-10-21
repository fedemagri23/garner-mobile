import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { StateMessage } from '@/components/state-message';
import { Text } from '@/components/text';
import { t } from '@/i18n';
import { errorMessage } from '@/lib/error-message';
import { space } from '@/theme/tokens';

import { OriginBadge, PrivateBadge } from './badges';
import { FlagForm } from './flag-sheet';
import { ProgressCard } from './progress-card';
import { useStore, useViewerSay } from './use-community';

/**
 * A shop at a glance: its chain and address, whether the team checked it, how
 * far a private one is from being public, and — for a community shop someone
 * else added — "Reportar".
 */
export function StoreSheet({ storeId, onClose }: { storeId: string | null; onClose: () => void }) {
  const store = useStore(storeId);
  const say = useViewerSay('store', storeId ?? '', storeId !== null);
  const [flagging, setFlagging] = useState(false);
  const data = store.data;
  const close = () => {
    setFlagging(false);
    onClose();
  };

  return (
    <Sheet
      title={flagging ? t('community.flag.storeTitle') : (data?.name ?? t('community.store.title'))}
      subtitle={flagging ? data?.name : undefined}
      visible={storeId !== null}
      onClose={close}>
      {flagging && data ? (
        <FlagForm target="store" id={data.id} onDone={close} />
      ) : store.isPending ? (
        <StateMessage loading />
      ) : store.isError ? (
        <StateMessage tone="danger" message={errorMessage(store.error, { 404: t('community.store.gone') })} />
      ) : (
        <>
          <View style={styles.badges}>
            <OriginBadge origin={data!.origin} showVerified />
            {data!.visibility === 'PRIVATE' ? <PrivateBadge /> : null}
          </View>
          <Text variant="caption" tone="muted">
            {t('community.store.chainLabel', { chain: data!.supermarketName })}
          </Text>
          <Text>{[data!.addressLine, data!.city].filter(Boolean).join(', ')}</Text>
          {data!.publication ? (
            <ProgressCard priced={data!.publication.pricedProducts} needed={data!.publication.productsNeeded} />
          ) : null}
          {say.data?.addedByYou ? (
            <Text variant="caption" tone="muted">
              {t('community.store.yours')}
            </Text>
          ) : data!.origin === 'COMMUNITY' && say.data ? (
            <Button
              label={say.data.flagged ? t('community.store.reported') : t('community.store.report')}
              variant="secondary"
              disabled={say.data.flagged}
              onPress={() => setFlagging(true)}
            />
          ) : null}
          <Button label={t('common.close')} variant="secondary" onPress={close} />
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', gap: space.sm },
});
