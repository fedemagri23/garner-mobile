import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { t } from '@/i18n';
import { errorMessage } from '@/lib/error-message';
import { colors, radii, space } from '@/theme/tokens';

import { FLAG_REASONS, useFlag, type FlagReason } from './use-community';

/** "Reportar": why a product or shop is wrong, then a thank-you. */
export function FlagSheet({
  target,
  id,
  name,
  visible,
  onClose,
}: {
  target: 'product' | 'store';
  id: string;
  name: string;
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet
      title={t(target === 'product' ? 'community.flag.productTitle' : 'community.flag.storeTitle')}
      subtitle={name}
      visible={visible}
      onClose={onClose}>
      {/* Mounted only while open, so it starts afresh each time. */}
      {visible ? <FlagForm target={target} id={id} onDone={onClose} /> : null}
    </Sheet>
  );
}

/**
 * The reasons and the send button, for a sheet of its own or inside another
 * one (a second modal over a first is unreliable on iOS).
 */
export function FlagForm({ target, id, onDone }: { target: 'product' | 'store'; id: string; onDone: () => void }) {
  const flag = useFlag(target, id);
  const [reason, setReason] = useState<FlagReason | null>(null);

  if (flag.isSuccess) {
    return (
      <>
        <Text accessibilityLiveRegion="polite">{t('community.flag.thanks')}</Text>
        <Button label={t('common.close')} onPress={onDone} />
      </>
    );
  }

  return (
    <>
      <Text tone="muted" variant="caption">
        {t('community.flag.intro')}
      </Text>
      <View style={styles.reasons} accessibilityRole="radiogroup">
        {FLAG_REASONS.map((option) => {
          const selected = option === reason;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setReason(option)}
              style={[styles.reason, selected && styles.selected]}>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selected ? colors.accent : colors.muted}
              />
              <Text>{t(`community.flag.reasons.${option}`)}</Text>
            </Pressable>
          );
        })}
      </View>
      {flag.isError ? (
        <Text tone="danger">{errorMessage(flag.error, { 429: t('community.flag.dailyLimit') })}</Text>
      ) : null}
      <Button
        label={t('community.flag.send')}
        disabled={!reason}
        loading={flag.isPending}
        onPress={() => reason && flag.mutate(reason)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  reasons: { gap: space.xs },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 48,
    paddingHorizontal: space.md,
    borderRadius: radii.md,
  },
  selected: { backgroundColor: colors.accentSoft },
});
