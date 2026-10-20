import { Directory, File, Paths } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';

/**
 * Where a shelf-label photo lives until it is uploaded. The picker hands back
 * a file in the cache, which the system may clear; a price reported without a
 * signal can wait days for one, so the photo is copied somewhere that stays.
 */
const folder = () => new Directory(Paths.document, 'report-photos');

export function keepPhoto(uri: string): string {
  const directory = folder();
  if (!directory.exists) {
    directory.create({ intermediates: true });
  }
  const copy = new File(directory, `${randomUUID()}.jpg`);
  new File(uri).copy(copy);
  return copy.uri;
}

export function photoStillThere(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

export function discardPhoto(uri: string): void {
  try {
    new File(uri).delete();
  } catch {
    // Already gone, or not ours to remove.
  }
}
