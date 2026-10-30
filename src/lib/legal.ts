import * as WebBrowser from 'expo-web-browser';

import { apiBaseUrl } from '@/config';
import { currentLanguage } from '@/i18n';

export type LegalDocument = 'terms' | 'privacy' | 'credits';

/** The terms, privacy policy or credits, served by the backend, in the app's language. */
export const legalUrl = (document: LegalDocument) =>
  `${apiBaseUrl()}/v1/legal/${document}?lang=${currentLanguage()}`;

/** Opens one in the phone's browser (a new tab on the web). */
export const openLegal = (document: LegalDocument) => WebBrowser.openBrowserAsync(legalUrl(document));
