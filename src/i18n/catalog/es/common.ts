export const common = {
  close: 'Cerrar',
  scanBarcode: 'Escanear código de barras',
  searchProducts: 'Buscar productos',
  back: 'Volver',
  stepper: { less: 'Menos: {{label}}', more: 'Más: {{label}}', value: '{{label}}: {{display}}' },
  errors: {
    wrongCredentials: 'Email o contraseña incorrectos.',
    tooManyAttempts: 'Demasiados intentos. Esperá un momento y probá de nuevo.',
    serverProblem: 'Tuvimos un problema. Probá de nuevo en un rato.',
    offline: 'No pudimos conectarnos. Revisá tu conexión.',
    generic: 'Algo salió mal. Probá de nuevo.',
  },
  time: {
    today: 'hoy',
    yesterday: 'ayer',
    date: {
      short: '{{day}} {{month}}',
      months: 'ene,feb,mar,abr,may,jun,jul,ago,sep,oct,nov,dic',
      weekdays: 'domingo,lunes,martes,miércoles,jueves,viernes,sábado',
    },
    now: 'ahora',
    minutesAgo: 'hace {{count}} min',
    hoursAgo: 'hace {{count}} h',
  },
  products_one: '{{count}} producto',
  products_other: '{{count}} productos',
  confidence: {
    VERY_RECENT: 'Visto en las últimas 24 h',
    RECENTLY_VERIFIED: 'Verificado esta semana',
    LIKELY_CURRENT: 'Probablemente vigente',
    POSSIBLY_OUTDATED: 'Puede estar desactualizado',
  },
};
