import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { errorMessage } from '@/lib/error-message';
import { useSession } from '@/session/session-provider';
import { colors, space } from '@/theme/tokens';

export default function SignUpScreen() {
  const { signUp } = useSession();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signUp({ displayName: displayName.trim(), email: email.trim(), password });
    } catch (failure) {
      setError(
        errorMessage(failure, {
          409: 'Ya existe una cuenta con ese email.',
          400: 'Revisá los datos: un email válido y una contraseña de al menos 10 caracteres.',
        }),
      );
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={styles.content}>
        <Text variant="title" accessibilityRole="header">
          Creá tu cuenta
        </Text>
        <View style={styles.form}>
          <TextField
            label="Nombre"
            value={displayName}
            onChangeText={setDisplayName}
            autoComplete="name"
            textContentType="name"
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextField
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={submit}
          />
          <Text variant="caption" tone="muted">
            Al menos 10 caracteres.
          </Text>
          {error ? (
            <Text tone="danger" accessibilityLiveRegion="polite" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <Button
            label="Crear cuenta"
            onPress={submit}
            loading={submitting}
            disabled={!displayName || !email || !password}
          />
        </View>
        <View style={styles.footer}>
          <Text tone="muted">¿Ya tenés cuenta?</Text>
          <Link href="/sign-in" style={styles.link}>
            <Text variant="bodyStrong" tone="accent">
              Ingresar
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
