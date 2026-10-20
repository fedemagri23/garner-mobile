import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { StateMessage } from '@/components/state-message';
import { Text } from '@/components/text';
import { errorMessage } from '@/lib/error-message';
import { formatDay } from '@/lib/format';
import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { describeAlert, type Alert } from './messages';
import { useAlerts, useDeleteAlert, useToggleAlert } from './use-alerts';

/** Mis alertas: what the shopper is watching, to pause or stop. */
export default function AlertsScreen() {
  const alerts = useAlerts();

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <FlatList
        data={alerts.data ?? []}
        keyExtractor={(alert) => alert.id}
        renderItem={({ item }) => <AlertRow alert={item} />}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/inbox'))}
              style={styles.round}>
              <Ionicons name="chevron-back" size={20} color={colors.ink} />
            </Pressable>
            <Text variant="title" accessibilityRole="header">
              Mis alertas
            </Text>
            <Text tone="muted">Te avisamos en Avisos cuando un precio cumple lo que pediste. Pausá una para dejar de recibirla sin borrarla.</Text>
          </View>
        }
        ListEmptyComponent={
          alerts.isPending ? (
            <StateMessage loading />
          ) : alerts.isError ? (
            <StateMessage tone="danger" message={errorMessage(alerts.error)} />
          ) : (
            <StateMessage message="No tenés alertas. Abrí un producto y tocá “Avisame si baja”." />
          )
        }
      />
    </SafeAreaView>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  const toggle = useToggleAlert();
  const remove = useDeleteAlert();
  const [asking, setAsking] = useState(false);

  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <View style={styles.rowText}>
          <Text variant="bodyStrong">{alert.productName}</Text>
          <Text variant="caption" tone="muted">
            {describeAlert(alert)}
          </Text>
          <Text variant="caption" tone={alert.isEnabled ? 'accent' : 'muted'} style={styles.strong}>
            {alert.isEnabled ? 'Activa' : 'En pausa'}
            {alert.lastTriggeredAt ? ` · avisó ${formatDay(alert.lastTriggeredAt)}` : ''}
          </Text>
        </View>
        <Switch
          value={alert.isEnabled}
          onValueChange={(isEnabled) => toggle.mutate({ id: alert.id, isEnabled })}
          accessibilityLabel={`${alert.isEnabled ? 'Pausar' : 'Activar'} la alerta de ${alert.productName}`}
          trackColor={{ true: colors.accent, false: colors.lineStrong }}
        />
      </View>
      {asking ? (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>¿Borrar esta alerta?</Text>
          <Button
            label="Sí, borrar"
            loading={remove.isPending}
            onPress={() => remove.mutate(alert.id)}
            style={[styles.small, styles.danger]}
          />
          <Button label="No" variant="secondary" onPress={() => setAsking(false)} style={styles.small} />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Borrar la alerta de ${alert.productName}`}
          onPress={() => setAsking(true)}
          style={styles.trash}>
          <Ionicons name="trash-outline" size={16} color={colors.muted} />
          <Text variant="caption" tone="muted">
            Borrar
          </Text>
        </Pressable>
      )}
      {toggle.isError || remove.isError ? (
        <Text variant="caption" tone="danger">
          {errorMessage(toggle.error ?? remove.error)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  content: { padding: space.xl, gap: space.md - 2 },
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
  row: {
    gap: space.sm,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
  },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowText: { flex: 1, gap: 2 },
  strong: { fontFamily: fonts.bodyBold },
  trash: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: MIN_TOUCH - 8, alignSelf: 'flex-start' },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  confirmText: { flex: 1, fontFamily: fonts.bodySemi },
  small: { minHeight: 40, paddingHorizontal: space.md },
  danger: { backgroundColor: colors.danger },
});
