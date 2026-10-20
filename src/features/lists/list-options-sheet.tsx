import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { errorMessage } from '@/lib/error-message';
import { colors, space } from '@/theme/tokens';

import { useDeleteList, useDuplicateList, useRenameList, type ListDetail } from './use-lists';

type Mode = 'menu' | 'rename' | 'delete';

/** "Más opciones" on a list: rename it, copy it, or delete it after asking. */
export function ListOptionsSheet({
  list,
  visible,
  onClose,
}: {
  list: ListDetail;
  visible: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>('menu');
  const [name, setName] = useState(list.name);
  const rename = useRenameList(list.id);
  const duplicate = useDuplicateList(list.id);
  const remove = useDeleteList(list.id);

  const close = () => {
    setMode('menu');
    rename.reset();
    duplicate.reset();
    remove.reset();
    onClose();
  };

  const failure = rename.error ?? duplicate.error ?? remove.error;

  const saveName = async () => {
    await rename.mutateAsync(name.trim());
    close();
  };

  const copy = async () => {
    const created = await duplicate.mutateAsync(`${list.name} (copia)`);
    close();
    router.push(`/lists/${created.id}`);
  };

  const destroy = async () => {
    await remove.mutateAsync();
    close();
    router.back();
  };

  return (
    <Sheet title={list.name} visible={visible} onClose={close}>
      {mode === 'menu' ? (
        <View style={styles.actions}>
          <Button
            label="Cambiar el nombre"
            variant="secondary"
            onPress={() => {
              setName(list.name);
              setMode('rename');
            }}
          />
          <Button
            label="Duplicar la lista"
            variant="secondary"
            loading={duplicate.isPending}
            onPress={() => copy().catch(() => undefined)}
          />
          <Button label="Eliminar la lista" variant="secondary" onPress={() => setMode('delete')} />
        </View>
      ) : mode === 'rename' ? (
        <View style={styles.actions}>
          <TextField
            label="Nombre"
            value={name}
            onChangeText={setName}
            maxLength={120}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => name.trim() && saveName().catch(() => undefined)}
          />
          <Button
            label="Guardar"
            disabled={!name.trim() || name.trim() === list.name}
            loading={rename.isPending}
            onPress={() => saveName().catch(() => undefined)}
          />
        </View>
      ) : (
        <View style={styles.actions}>
          <Text>
            ¿Eliminar “{list.name}” y sus {list.totals.itemCount} productos? No se puede deshacer.
            Las compras que ya empezaste con ella se conservan.
          </Text>
          <Button
            label="Sí, eliminar"
            loading={remove.isPending}
            onPress={() => destroy().catch(() => undefined)}
            style={styles.danger}
          />
          <Button label="Cancelar" variant="secondary" onPress={() => setMode('menu')} />
        </View>
      )}
      {failure ? <Text tone="danger">{errorMessage(failure)}</Text> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  actions: { gap: space.md },
  danger: { backgroundColor: colors.danger },
});
