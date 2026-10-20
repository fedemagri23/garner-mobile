import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Sheet } from '@/components/sheet';
import { StateMessage } from '@/components/state-message';
import { Stepper } from '@/components/stepper';
import { Text } from '@/components/text';
import { errorMessage } from '@/lib/error-message';
import { space } from '@/theme/tokens';

import { MODES, usePlanPreferences, useSavePlanPreferences, type Mode, type Preferences } from './use-plan';

/**
 * How far the shopper will go to save: the plan never recommends breaking
 * these, and says what a cheaper plan would have broken.
 */
export function PreferencesSheet({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: (mode: Mode) => void;
}) {
  const preferences = usePlanPreferences();

  return (
    <Sheet title="Preferencias" subtitle="Para todas tus listas" visible={visible} onClose={onClose}>
      {preferences.data ? (
        <Form initial={preferences.data} onClose={onClose} onSaved={onSaved} />
      ) : preferences.isError ? (
        <StateMessage tone="danger" message={errorMessage(preferences.error)} />
      ) : (
        <StateMessage loading />
      )}
    </Sheet>
  );
}

function Form({
  initial,
  onClose,
  onSaved,
}: {
  initial: Preferences;
  onClose: () => void;
  onSaved: (mode: Mode) => void;
}) {
  const [mode, setMode] = useState(initial.mode);
  const [maxStores, setMaxStores] = useState(initial.maxStores);
  const [extraKm, setExtraKm] = useState(initial.maxAdditionalDistanceKm);
  const [extraMinutes, setExtraMinutes] = useState(initial.maxAdditionalMinutes);
  const save = useSavePlanPreferences();

  const submit = async () => {
    await save.mutateAsync({
      mode,
      maxStores,
      maxAdditionalDistanceKm: extraKm,
      maxAdditionalMinutes: extraMinutes,
    });
    onSaved(mode);
    onClose();
  };

  return (
    <View style={styles.form}>
      <View style={styles.group}>
        <Text variant="label">Qué te mostramos primero</Text>
        <View style={styles.chips}>
          {MODES.map((entry) => (
            <Chip
              key={entry.mode}
              label={entry.label}
              selected={mode === entry.mode}
              onPress={() => setMode(entry.mode)}
            />
          ))}
        </View>
      </View>
      <Stepper
        label="Súper como máximo"
        value={maxStores}
        display={String(maxStores)}
        min={1}
        max={4}
        onChange={setMaxStores}
      />
      <Stepper
        label="Recorrido extra"
        value={extraKm}
        display={`${extraKm} km`}
        min={0}
        max={50}
        onChange={setExtraKm}
      />
      <Stepper
        label="Tiempo extra"
        value={extraMinutes}
        display={`${extraMinutes} min`}
        min={0}
        max={240}
        step={5}
        onChange={setExtraMinutes}
      />
      <Text variant="caption" tone="muted">
        El extra se cuenta contra comprar todo en el súper más conveniente.
      </Text>
      {save.isError ? <Text tone="danger">{errorMessage(save.error)}</Text> : null}
      <Button label="Guardar y calcular" loading={save.isPending} onPress={() => submit().catch(() => undefined)} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  group: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
