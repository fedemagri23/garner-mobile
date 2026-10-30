import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError, noContent, unwrap } from '@/api/client';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { StateMessage } from '@/components/state-message';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { t } from '@/i18n';
import { LanguageCard } from '@/i18n/language-card';
import { errorMessage } from '@/lib/error-message';
import { useSession } from '@/session/session-provider';
import { colors, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { LegalLinks } from './legal';
import { meQueryKey, useMe } from './use-me';

/**
 * Cuenta: the name others see, the email, the language, the password, signing
 * out everywhere, and deleting the account — which asks for the password and
 * cannot be undone.
 */
export function AccountScreen() {
  const me = useMe();

  return (
    <Screen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        style={styles.round}>
        <Ionicons name="chevron-back" size={20} color={colors.ink} />
      </Pressable>
      <Text variant="title" accessibilityRole="header">
        {t('shell.account.title')}
      </Text>
      {me.data ? (
        <>
          <NameCard name={me.data.displayName} email={me.data.email} />
          <LanguageCard />
          <PasswordCard />
          <SignOutEverywhere />
          <DeleteAccount />
          <View style={styles.card}>
            <Text variant="heading">{t('shell.legal.title')}</Text>
            <LegalLinks />
          </View>
        </>
      ) : me.isError ? (
        <StateMessage tone="danger" message={errorMessage(me.error)} />
      ) : (
        <StateMessage loading />
      )}
    </Screen>
  );
}

function NameCard({ name, email }: { name: string; email: string }) {
  const { api } = useSession();
  const queryClient = useQueryClient();
  const [value, setValue] = useState(name);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | string>('idle');

  const save = async () => {
    setState('saving');
    try {
      const user = await unwrap(api.PATCH('/v1/users/me', { body: { displayName: value.trim() } }));
      queryClient.setQueryData(meQueryKey, user);
      setState('saved');
    } catch (error) {
      setState(errorMessage(error));
    }
  };

  return (
    <View style={styles.card}>
      <TextField label={t('shell.account.name')} value={value} onChangeText={setValue} autoCapitalize="words" />
      <Button
        label={t('shell.account.save')}
        variant="secondary"
        loading={state === 'saving'}
        disabled={!value.trim() || value.trim() === name}
        onPress={save}
      />
      {state === 'saved' ? (
        <Text variant="caption" tone="accent">
          {t('shell.account.saved')}
        </Text>
      ) : state !== 'idle' && state !== 'saving' ? (
        <Text variant="caption" tone="danger">
          {state}
        </Text>
      ) : null}
      <Text variant="label">{t('shell.account.email')}</Text>
      <Text tone="muted">{email}</Text>
    </View>
  );
}

function PasswordCard() {
  const { api, adoptSession } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [message, setMessage] = useState<{ tone: 'accent' | 'danger'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const change = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const pair = await unwrap(api.POST('/v1/auth/password', { body: { currentPassword: current, newPassword: next } }));
      await adoptSession(pair);
      setCurrent('');
      setNext('');
      setMessage({ tone: 'accent', text: t('shell.account.changed') });
    } catch (error) {
      setMessage({
        tone: 'danger',
        text: error instanceof ApiError && error.status === 403 ? t('shell.account.wrongCurrent') : errorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text variant="heading">{t('shell.account.passwordTitle')}</Text>
      <TextField label={t('shell.account.current')} value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" />
      <TextField label={t('shell.account.next')} value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" />
      <Text variant="caption" tone="muted">
        {t('shell.auth.signUp.minLength')}
      </Text>
      <Button
        label={t('shell.account.change')}
        variant="secondary"
        loading={busy}
        disabled={!current || next.length < 10}
        onPress={change}
      />
      {message ? (
        <Text variant="caption" tone={message.tone} accessibilityLiveRegion="polite">
          {message.text}
        </Text>
      ) : null}
    </View>
  );
}

function SignOutEverywhere() {
  const { api, signOut } = useSession();
  const [busy, setBusy] = useState(false);

  return (
    <View style={styles.card}>
      <Button
        label={t('shell.account.everywhere')}
        variant="secondary"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          await noContent(api.POST('/v1/auth/logout-all')).catch(() => undefined);
          await signOut();
        }}
      />
      <Text variant="caption" tone="muted">
        {t('shell.account.everywhereNote')}
      </Text>
    </View>
  );
}

function DeleteAccount() {
  const { api, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await noContent(api.DELETE('/v1/users/me', { body: { password } }));
      await signOut();
    } catch (failure) {
      setError(failure instanceof ApiError && failure.status === 403 ? t('shell.account.wrongPassword') : errorMessage(failure));
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, styles.danger]}>
      {open ? (
        <>
          <Text variant="heading">{t('shell.account.delete')}</Text>
          <Text>{t('shell.account.deleteNote')}</Text>
          <TextField
            label={t('shell.account.deletePassword')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
          />
          {error ? (
            <Text tone="danger" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <Button label={t('shell.account.deleteConfirm')} loading={busy} disabled={!password} onPress={remove} style={styles.deleteButton} />
          <Button label={t('shell.account.cancel')} variant="secondary" onPress={() => setOpen(false)} />
        </>
      ) : (
        <Button label={t('shell.account.delete')} variant="secondary" onPress={() => setOpen(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
  },
  danger: { borderColor: colors.danger },
  deleteButton: { backgroundColor: colors.danger },
});
