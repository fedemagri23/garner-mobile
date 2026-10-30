import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { t } from '@/i18n';
import { LanguageChoices } from '@/i18n/language-card';
import { errorMessage } from '@/lib/error-message';
import { useSession } from '@/session/session-provider';
import { colors, radii, space } from '@/theme/tokens';

export default function SignInScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (failure) {
      setError(errorMessage(failure));
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.mark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Text variant="title" tone="onAccent">
              G
            </Text>
          </View>
          <Text variant="display" accessibilityRole="header">
            {t('shell.auth.signIn.headline')}
          </Text>
          <Text tone="muted">
            {t('shell.auth.signIn.intro')}
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            label={t('shell.auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextField
            label={t('shell.auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={submit}
          />
          {error ? (
            <Text tone="danger" accessibilityLiveRegion="polite" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <Button
            label={t('shell.auth.signIn.submit')}
            onPress={submit}
            loading={submitting}
            disabled={!email || !password}
          />
          <Link
            href={{ pathname: '/forgot-password', params: email.trim() ? { email: email.trim() } : {} }}
            style={styles.forgot}>
            <Text variant="label" tone="accent">
              {t('shell.auth.reset.forgot')}
            </Text>
          </Link>
        </View>

        <View style={styles.footer}>
          <Text tone="muted">{t('shell.auth.signIn.firstTime')}</Text>
          <Link href="/sign-up" style={styles.link}>
            <Text variant="bodyStrong" tone="accent">
              {t('shell.auth.signIn.createAccount')}
            </Text>
          </Link>
        </View>
        <LanguageChoices />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.ground },
  content: { paddingTop: space.xxxl * 2, gap: space.xxxl },
  hero: { gap: space.lg },
  mark: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: { gap: space.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.sm },
  link: { paddingVertical: space.md },
  forgot: { alignSelf: 'center', paddingVertical: space.md },
});
