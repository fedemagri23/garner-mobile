import type { common as es } from '../es/common';
import type { Catalog } from '../types';

export const common: Catalog<typeof es> = {
  close: 'Schließen',
  scanBarcode: 'Barcode scannen',
  searchProducts: 'Produkte suchen',
  back: 'Zurück',
  stepper: { less: 'Weniger: {{label}}', more: 'Mehr: {{label}}', value: '{{label}}: {{display}}' },
  errors: {
    wrongCredentials: 'E-Mail oder Passwort falsch.',
    tooManyAttempts: 'Zu viele Versuche. Warte einen Moment und versuche es erneut.',
    serverProblem: 'Es ist ein Problem aufgetreten. Versuche es später erneut.',
    offline: 'Keine Verbindung. Prüfe deine Internetverbindung.',
    generic: 'Etwas ist schiefgelaufen. Versuche es erneut.',
  },
  time: {
    today: 'heute',
    yesterday: 'gestern',
    date: {
      short: '{{day}}. {{month}}',
      months: 'Jan.,Feb.,März,Apr.,Mai,Juni,Juli,Aug.,Sept.,Okt.,Nov.,Dez.',
      weekdays: 'Sonntag,Montag,Dienstag,Mittwoch,Donnerstag,Freitag,Samstag',
    },
    now: 'jetzt',
    minutesAgo: 'vor {{count}} Min.',
    hoursAgo: 'vor {{count}} Std.',
  },
  products_one: '{{count}} Produkt',
  products_other: '{{count}} Produkte',
  confidence: {
    VERY_RECENT: 'In den letzten 24 Std. gesehen',
    RECENTLY_VERIFIED: 'Diese Woche bestätigt',
    LIKELY_CURRENT: 'Wahrscheinlich aktuell',
    POSSIBLY_OUTDATED: 'Möglicherweise veraltet',
  },
};
