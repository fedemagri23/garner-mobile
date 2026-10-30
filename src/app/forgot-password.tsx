import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { ApiError, noContent } from '@/api/client';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { t } from '@/i18n';
import { errorMessage } from '@/lib/error-message';
import { useSession } from '@/session/session-provider';
import { space } from '@/theme/tokens';

type Step = 'email' | 'code' | 'done';

/**
 * "¿Olvidaste tu contraseña?": the email gets a six-digit code; the code and
 * a new password set it. The server never says whether the email has an
 * account, and neither does this screen.
 */
export default function ForgotPasswordScreen() {
  const { publicApi } = useSession();
  const params = useLocalSearchParams<{ email?: string }>();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setError(null);
    setBusy(true);
    try {
      await noContent(publicApi.POST('/v1/auth/password-reset', { body: { email: email.trim() } }));
      setStep('code');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setError(null);
    setBusy(true);
    try {
      await noContent(
        publicApi.POST('/v1/auth/password-reset/confirm', {
          body: { email: email.trim(), code: code.trim(), newPassword: password },
        }),
      );
      setStep('done');
    } catch (failure) {
      setError(
        failure instanceof ApiError && failure.status === 400 && !failure.message.includes('newPassword')
          ? t('shell.auth.reset.invalid')
          : errorMessage(failure, { 400: t('shell.auth.signUp.minLength') }),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={styles.content}>
        <Text variant="title" accessibilityRole="header">
          {t('shell.auth.reset.title')}
        </Text>

        {step === 'email' ? (
          <View style={styles.form}>
            <Text tone="muted">{t('shell.auth.reset.intro')}</Text>
            <TextField
              label={t('shell.auth.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              onSubmitEditing={send}
            />
            <Button label={t('shell.auth.reset.send')} onPress={send} loading={busy} disabled={!email.trim()} />
          </View>
        ) : step === 'code' ? (
          <View style={styles.form}>
            <Text tone="muted" accessibilityLiveRegion="polite">
              {t('shell.auth.reset.sentTo', { email: email.trim() })}
            </Text>
            <TextField
              label={t('shell.auth.reset.code')}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
            />
            <TextField
              label={t('shell.auth.reset.newPassword')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              onSubmitEditing={reset}
            />
            <Text variant="caption" tone="muted">
              {t('shell.auth.signUp.minLength')}
            </Text>
            <Button
              label={t('shell.auth.reset.submit')}
              onPress={reset}
              loading={busy}
              disabled={code.trim().length !== 6 || password.length < 10}
            />
            <Button
              label={t('shell.auth.reset.resend')}
              variant="secondary"
              onPress={() => {
                setCode('');
                void send();
              }}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <Text accessibilityLiveRegion="polite">{t('shell.auth.reset.done')}</Text>
            <Button label={t('shell.auth.reset.toSignIn')} onPress={() => router.back()} />
          </View>
        )}

        {error ? (
          <Text tone="danger" accessibilityLiveRegion="polite" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        {step !== 'done' ? (
          <Button label={t('common.back')} variant="secondary" onPress={() => router.back()} />
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: space.xxxl, gap: space.xl },
  form: { gap: space.lg },
});
