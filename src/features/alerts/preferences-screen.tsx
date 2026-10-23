import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StateMessage } from '@/components/state-message';
import { Stepper } from '@/components/stepper';
import { Text } from '@/components/text';
import { t } from '@/i18n';
import { errorMessage } from '@/lib/error-message';
import { colors, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { LanguageCard } from '@/i18n/language-card';
import { PushCard } from '@/features/push/push-card';

import { localToUtcHour, utcToLocalHour } from './messages';
import { usePreferences, useSavePreferences, type Preferences } from './use-alerts';

const DEFAULT_QUIET = { from: 22, to: 7 };
const pad = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

/** How and when the shopper wants to be reached. Every change is saved as it is made. */
export default function PreferencesScreen() {
  const preferences = usePreferences();

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/inbox'))}
          style={styles.round}>
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <Text variant="title" accessibilityRole="header">
          {t('alerts.preferences.title')}
        </Text>
        {preferences.data ? (
          <Form preferences={preferences.data} />
        ) : preferences.isError ? (
          <StateMessage tone="danger" message={errorMessage(preferences.error)} />
        ) : (
          <StateMessage loading />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Form({ preferences }: { preferences: Preferences }) {
  const save = useSavePreferences();
  const quiet = preferences.quietHoursStartUtc !== null && preferences.quietHoursEndUtc !== null;
  const [from, setFrom] = useState(quiet ? utcToLocalHour(preferences.quietHoursStartUtc!) : DEFAULT_QUIET.from);
  const [to, setTo] = useState(quiet ? utcToLocalHour(preferences.quietHoursEndUtc!) : DEFAULT_QUIET.to);

  const saveQuiet = (start: number, end: number) =>
    save.mutate({ quietHoursStartUtc: localToUtcHour(start), quietHoursEndUtc: localToUtcHour(end) });

  return (
    <View style={styles.form}>
      <Card>
        <Option
          label={t('alerts.preferences.priceAlerts')}
          note={t('alerts.preferences.priceAlertsNote')}
          value={preferences.priceAlertsEnabled}
          onChange={(priceAlertsEnabled) => save.mutate({ priceAlertsEnabled })}
        />
      </Card>

      <PushCard />

      <Card>
        <Option
          label={t('alerts.preferences.email')}
          note={
            preferences.emailAvailable
              ? t('alerts.preferences.emailNote')
              : t('alerts.preferences.emailUnavailable')
          }
          value={preferences.emailEnabled}
          disabled={!preferences.emailAvailable}
          onChange={(emailEnabled) => save.mutate({ emailEnabled })}
        />
      </Card>

      <Card>
        <Option
          label={t('alerts.preferences.quiet')}
          note={t('alerts.preferences.quietNote')}
          value={quiet}
          onChange={(on) =>
            on ? saveQuiet(from, to) : save.mutate({ quietHoursStartUtc: null, quietHoursEndUtc: null })
          }
        />
        {quiet ? (
          <View style={styles.steppers}>
            <Stepper
              label={t('alerts.preferences.from')}
              value={from}
              display={pad(from)}
              min={0}
              max={23}
              onChange={(hour) => {
                setFrom(hour);
                saveQuiet(hour, to);
              }}
            />
            <Stepper
              label={t('alerts.preferences.to')}
              value={to}
              display={pad(to)}
              min={0}
              max={23}
              onChange={(hour) => {
                setTo(hour);
                saveQuiet(from, hour);
              }}
            />
            <Text variant="caption" tone="muted">
              {t('alerts.preferences.localTime')}
            </Text>
          </View>
        ) : null}
      </Card>

      <Card>
        <Stepper
          label={t('alerts.preferences.spacing')}
          value={Math.round(preferences.minMinutesBetweenAlerts / 60)}
          display={t('alerts.preferences.spacingValue', { count: Math.round(preferences.minMinutesBetweenAlerts / 60) })}
          min={1}
          max={24}
          onChange={(hours) => save.mutate({ minMinutesBetweenAlerts: hours * 60 })}
        />
        <Text variant="caption" tone="muted">
          {t('alerts.preferences.spacingNote')}
        </Text>
      </Card>

      <LanguageCard />
      <View style={styles.about}>
        <Text variant="label">{t('shell.about.title')}</Text>
        <Text variant="caption" tone="muted">
          {t('shell.about.openFoodFacts')}
        </Text>
      </View>

      {save.isError ? <Text tone="danger">{errorMessage(save.error)}</Text> : null}
    </View>
  );
}

function Option({
  label,
  note,
  value,
  disabled,
  onChange,
}: {
  label: string;
  note: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.option}>
      <View style={styles.optionText}>
        <Text variant="bodyStrong">{label}</Text>
        <Text variant="caption" tone="muted">
          {note}
        </Text>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: colors.accent, false: colors.lineStrong }}
      />
    </View>
  );
}

const Card = ({ children }: { children: React.ReactNode }) => <View style={styles.card}>{children}</View>;

const styles = StyleSheet.create({
  about: { gap: space.xs, paddingHorizontal: space.xs },
  root: { flex: 1, backgroundColor: colors.ground },
  content: { padding: space.xl, gap: space.lg },
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
  form: { gap: space.md },
  card: {
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
  },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  optionText: { flex: 1, gap: 2 },
  steppers: { gap: space.sm },
});
