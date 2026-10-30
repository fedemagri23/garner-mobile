import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { AcceptTerms } from '@/features/account/legal';
import { TextField } from '@/components/text-field';
import { t } from '@/i18n';
import { errorMessage } from '@/lib/error-message';
import { useSession } from '@/session/session-provider';
import { colors, space } from '@/theme/tokens';

export default function SignUpScreen() {
  const { signUp } = useSession();
  const [displayName, setDisplayName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signUp({ displayName: displayName.trim(), email: email.trim(), password, acceptTerms: true });
    } catch (failure) {
      setError(
        errorMessage(failure, {
          409: t('shell.auth.signUp.emailTaken'),
          400: t('shell.auth.signUp.invalid'),
        }),
      );
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={styles.content}>
        <Text variant="title" accessibilityRole="header">
          {t('shell.auth.signUp.title')}
        </Text>
        <View style={styles.form}>
          <TextField
            label={t('shell.auth.signUp.name')}
            value={displayName}
            onChangeText={setDisplayName}
            autoComplete="name"
            textContentType="name"
          />
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
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={submit}
          />
          <Text variant="caption" tone="muted">
            {t('shell.auth.signUp.minLength')}
          </Text>
          <AcceptTerms value={accepted} onChange={setAccepted} />
          {error ? (
            <Text tone="danger" accessibilityLiveRegion="polite" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <Button
            label={t('shell.auth.signUp.submit')}
            onPress={submit}
            loading={submitting}
            disabled={!displayName || !email || !password || !accepted}
          />
        </View>
        <View style={styles.footer}>
          <Text tone="muted">{t('shell.auth.signUp.haveAccount')}</Text>
          <Link href="/sign-in" style={styles.link}>
            <Text variant="bodyStrong" tone="accent">
              {t('shell.auth.signUp.signIn')}
            </Text>
          </Link>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.ground },
  content: { paddingTop: space.xxxl * 2, gap: space.xxl },
  form: { gap: space.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.sm },
  link: { paddingVertical: space.md },
});
