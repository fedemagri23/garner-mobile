import { t } from '@/i18n';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { keepPhoto } from './photo-store';

/** What the backend takes: 5 MB (garner-app MAX_EVIDENCE_BYTES). */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export type PhotoResult = { photo: { uri: string; width: number; height: number } } | { error: string } | null;

/**
 * Takes a photo of the shelf label, or picks one from the gallery. Null when
 * the shopper backs out. The result is already somewhere it will stay, since
 * it may wait for a connection.
 */
export async function pickPhoto(source: 'camera' | 'library'): Promise<PhotoResult> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return { error: t('contributions.photo.needCamera') };
    }
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    // A label is legible well below full quality, and 5 MB is the most the server takes.
    quality: 0.6,
    allowsEditing: false,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  const asset = result.canceled ? null : result.assets[0];
  if (!asset) {
    return null;
  }
  if (asset.fileSize !== undefined && asset.fileSize > MAX_PHOTO_BYTES) {
    return { error: t('contributions.photo.tooBig') };
  }

  return { photo: { uri: keepPhoto(asset.uri), width: asset.width, height: asset.height } };
}

/** Whether the camera can be offered here: on the web there is only the gallery. */
export const canUseCamera = Platform.OS !== 'web';

/** The photo as the upload wants it: a multipart form with one file. */
export async function photoFormData(uri: string): Promise<FormData> {
  const form = new FormData();

  if (Platform.OS === 'web') {
    // A blob: or data: URL means nothing to the server; send what it points at.
    const blob = await (await fetch(uri)).blob();
    form.append('photo', blob, 'etiqueta.jpg');
  } else {
    // React Native reads the file itself from a { uri, name, type } part.
    form.append('photo', { uri, name: 'etiqueta.jpg', type: 'image/jpeg' } as unknown as Blob);
  }

  return form;
}
