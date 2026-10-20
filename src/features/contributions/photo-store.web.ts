/**
 * The web build has no file system; the picker's blob URL lives as long as
 * the page, which is all the development build needs.
 */
export const keepPhoto = (uri: string): string => uri;
export const photoStillThere = (): boolean => true;
export const discardPhoto = (): void => undefined;
