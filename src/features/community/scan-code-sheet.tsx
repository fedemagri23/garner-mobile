import { useRef } from 'react';
import { Modal } from 'react-native';

import { BarcodeScanner } from '@/features/catalog/barcode-scanner';
import { t } from '@/i18n';

import { cleanBarcode } from './validate';

/**
 * The scanner, for filling in a form rather than searching: the first code
 * read (or typed) goes back to whoever opened it, and it closes. A modal of
 * its own, so the form underneath keeps everything typed so far.
 */
export function ScanCodeSheet({
  visible,
  onCode,
  onClose,
}: {
  visible: boolean;
  onCode: (code: string) => void;
  onClose: () => void;
}) {
  // The camera reports the same code many times a second: take the first.
  const taken = useRef(false);

  const take = (raw: string) => {
    const code = cleanBarcode(raw);
    if (!code || taken.current) return;
    taken.current = true;
    onCode(code);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onShow={() => {
        taken.current = false;
      }}
      onRequestClose={onClose}>
      <BarcodeScanner
        title={t('community.scanSheet.title')}
        aim={t('community.scanSheet.aim')}
        submitLabel={t('community.scanSheet.use')}
        onCode={take}
        onClose={onClose}
      />
    </Modal>
  );
}
