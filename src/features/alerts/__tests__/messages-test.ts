import {
  composeMessage,
  describeAlert,
  groupByDay,
  localToUtcHour,
  utcToLocalHour,
  whenText,
  type Alert,
  type Notification,
} from '../messages';

const message = (overrides: Partial<Notification> = {}): Notification =>
  ({
    id: 'n1',
    category: 'PRICE_ALERT',
    title: 'Leche is now 1320.00',
    body: 'English',
    productName: 'Leche entera 1 L',
    storeName: 'Día Almagro',
    supermarketName: 'Día',
    reason: 'BELOW_THRESHOLD',
    priceCents: 139000,
    previousPriceCents: 150000,
    currency: 'ARS',
    createdAt: '2026-10-21T10:00:00',
    readAt: null,
    ...overrides,
  }) as Notification;

describe('composeMessage', () => {
  it('says a threshold alert in pesos', () => {
    expect(composeMessage(message())).toEqual({
      title: 'Leche entera 1 L bajó a $ 1.390',
      body: 'En Día Almagro, por debajo del precio que pediste.',
    });
  });

  it('says a drop with its percentage and the old price, in euros', () => {
    expect(
      composeMessage(message({ reason: 'PRICE_DROP', priceCents: 115, previousPriceCents: 129, currency: 'EUR', storeName: 'Hofer' })),
    ).toEqual({
      title: 'Leche entera 1 L: −10%',
      body: 'Hofer lo tiene a € 1,15, antes € 1,29.',
    });
  });

  it('says cheaper nearby', () => {
    expect(composeMessage(message({ reason: 'CHEAPER_NEARBY' })).title).toBe('Leche entera 1 L más barato cerca');
  });

  it('copes with a first price, and a rise', () => {
    expect(composeMessage(message({ reason: 'PRICE_DROP', previousPriceCents: null })).title).toBe(
      'Leche entera 1 L bajó de precio',
    );
    expect(composeMessage(message({ reason: 'PRICE_DROP', previousPriceCents: 100000 })).body).toBe(
      'Día Almagro lo tiene a $ 1.390.',
    );
  });

  it('falls back to the server\'s words when there are no facts', () => {
    expect(composeMessage(message({ reason: null, priceCents: null, currency: null }))).toEqual({
      title: 'Leche is now 1320.00',
      body: 'English',
    });
  });
});

describe('describeAlert', () => {
  const alert = (overrides: Partial<Alert>): Alert =>
    ({ type: 'BELOW_THRESHOLD', thresholdCents: 140000, dropPercent: null, radiusKm: 5, currency: 'ARS', storeName: null, ...overrides }) as Alert;

  it('says what each kind watches', () => {
    expect(describeAlert(alert({}))).toBe('Cuando baje de $ 1.400 · cerca tuyo (5 km)');
    expect(describeAlert(alert({ type: 'PRICE_DROP', dropPercent: 5, storeName: 'Coto Centro' }))).toBe(
      'Cuando baje 5% o más · Coto Centro',
    );
    expect(describeAlert(alert({ type: 'CHEAPER_NEARBY' }))).toBe(
      'Cuando un súper cerca tuyo sea el más barato (5 km)',
    );
  });
});

describe('groupByDay', () => {
  const now = new Date('2026-10-21T15:00:00');

  it('puts messages in today, this week and before, leaving empty sections out', () => {
    const groups = groupByDay(
      [
        message({ id: 'a', createdAt: '2026-10-21T09:00:00' }),
        message({ id: 'b', createdAt: '2026-10-18T09:00:00' }),
        message({ id: 'c', createdAt: '2026-09-01T09:00:00' }),
      ],
      now,
    );

    expect(groups.map((g) => [g.section, g.items.map((i) => i.id)])).toEqual([
      ['today', ['a']],
      ['week', ['b']],
      ['earlier', ['c']],
    ]);
    expect(groupByDay([message({ createdAt: '2026-10-21T01:00:00' })], now).map((g) => g.section)).toEqual(['today']);
  });
});

describe('whenText', () => {
  const now = new Date('2026-10-21T15:00:00');

  it('says how long ago, then the day', () => {
    expect(whenText('2026-10-21T14:59:30', now)).toBe('ahora');
    expect(whenText('2026-10-21T14:35:00', now)).toBe('hace 25 min');
    expect(whenText('2026-10-21T10:00:00', now)).toBe('hace 5 h');
    expect(whenText('2026-10-20T20:00:00', now)).toBe('ayer');
    expect(whenText('2026-10-19T12:00:00', now)).toBe('lunes');
    expect(whenText('2026-10-01T12:00:00', now)).toBe('1 oct');
  });
});

describe('quiet hours across zones', () => {
  it('converts the local hour to UTC and back', () => {
    // Vienna in summer: UTC+2, so the offset JavaScript reports is −120.
    expect(localToUtcHour(22, -120)).toBe(20);
    expect(localToUtcHour(1, -120)).toBe(23);
    expect(utcToLocalHour(20, -120)).toBe(22);
    // Buenos Aires: UTC−3, offset +180.
    expect(localToUtcHour(22, 180)).toBe(1);
    expect(utcToLocalHour(1, 180)).toBe(22);
  });
});
