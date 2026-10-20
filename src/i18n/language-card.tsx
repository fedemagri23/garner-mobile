import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Text } from '@/components/text';
import { t } from '@/i18n';
import { colors, radii, space } from '@/theme/tokens';

import { useLanguage } from './language-provider';
import { LANGUAGE_NAMES, LANGUAGES, type LanguageChoice } from './languages';

const CHOICES: LanguageChoice[] = ['system', ...LANGUAGES];

/** The language picker: one of the app's languages, or whatever the phone is set to. */
export function LanguageChoices() {
  const { choice, choose } = useLanguage();

  return (
    <View style={styles.chips} accessibilityRole="radiogroup">
      {CHOICES.map((option) => (
        <Chip
          key={option}
          label={option === 'system' ? t('shell.language.system') : LANGUAGE_NAMES[option]}
          selected={choice === option}
          onPress={() => void choose(option)}
        />
      ))}
    </View>
  );
}

/** The picker as a card, for the preferences screen. */
export function LanguageCard() {
  return (
    <View style={styles.card}>
      <Text variant="bodyStrong">{t('shell.language.title')}</Text>
      <Text variant="caption" tone="muted">
        {t('shell.language.note')}
      </Text>
      <LanguageChoices />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
