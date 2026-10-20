import type { common as es } from '../es/common';
import type { Catalog } from '../types';

export const common: Catalog<typeof es> = {
  close: 'Close',
  scanBarcode: 'Scan barcode',
  searchProducts: 'Search products',
  back: 'Back',
  stepper: { less: 'Less: {{label}}', more: 'More: {{label}}', value: '{{label}}: {{display}}' },
  errors: {
    wrongCredentials: 'Wrong email or password.',
    tooManyAttempts: 'Too many attempts. Wait a moment and try again.',
    serverProblem: 'We had a problem. Try again in a while.',
    offline: "We couldn't connect. Check your connection.",
    generic: 'Something went wrong. Try again.',
  },
  time: {
    today: 'today',
    yesterday: 'yesterday',
    date: {
      short: '{{day}} {{month}}',
      months: 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec',
      weekdays: 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
    },
    now: 'now',
    minutesAgo: '{{count}} min ago',
    hoursAgo: '{{count}} h ago',
  },
  products_one: '{{count}} product',
  products_other: '{{count}} products',
  confidence: {
    VERY_RECENT: 'Seen in the last 24 h',
    RECENTLY_VERIFIED: 'Verified this week',
    LIKELY_CURRENT: 'Probably current',
    POSSIBLY_OUTDATED: 'May be out of date',
  },
};
