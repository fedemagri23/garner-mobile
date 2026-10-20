import { router } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { useLocalCurrency } from '@/features/location/use-local-currency';
import { t } from '@/i18n';
import { errorMessage } from '@/lib/error-message';

import { CurrencyPicker } from './currency-picker';
import { useCreateList } from './use-lists';

/**
 * Name a new list and pick its currency — fixed once the list exists, since
 * its prices come from stores in one country. The currency starts as the one
 * of the stores nearest the shopper.
 */
export function NewListSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { currency: local, looking } = useLocalCurrency();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<string | null>(null);
  const create = useCreateList();

  // Follow the local currency until the shopper picks one themselves.
  const chosen = currency ?? local;
  const trimmed = name.trim();
  const ready = !!trimmed && chosen !== null;

  const close = () => {
    setName('');
    setCurrency(null);
    create.reset();
    onClose();
  };

  const submit = async () => {
    if (!ready) {
      return;
    }
    const list = await create.mutateAsync({ name: trimmed, currency: chosen });
    close();
    router.push(`/lists/${list.id}`);
  };

  return (
    <Sheet title={t('lists.create.title')} visible={visible} onClose={close}>
      <TextField
        label={t('lists.create.name')}
        value={name}
        onChangeText={setName}
        placeholder={t('lists.create.placeholder')}
        maxLength={120}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => submit().catch(() => undefined)}
      />
      <CurrencyPicker value={chosen} local={local} looking={looking} onChange={setCurrency} />
      {create.isError ? <Text tone="danger">{errorMessage(create.error)}</Text> : null}
      <Button
        label={t('lists.create.submit')}
        disabled={!ready}
        loading={create.isPending}
        onPress={() => submit().catch(() => undefined)}
      />
    </Sheet>
  );
}
