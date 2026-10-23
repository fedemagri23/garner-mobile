import type { common as es } from '../es/common';
import type { Catalog } from '../types';

export const common: Catalog<typeof es> = {
  close: 'Fechar',
  scanBarcode: 'Escanear código de barras',
  searchProducts: 'Buscar produtos',
  back: 'Voltar',
  stepper: { less: 'Menos: {{label}}', more: 'Mais: {{label}}', value: '{{label}}: {{display}}' },
  errors: {
    wrongCredentials: 'E-mail ou senha incorretos.',
    tooManyAttempts: 'Muitas tentativas. Espere um pouco e tente de novo.',
    serverProblem: 'Tivemos um problema. Tente de novo daqui a pouco.',
    offline: 'Não conseguimos conectar. Verifique sua conexão.',
    generic: 'Algo deu errado. Tente de novo.',
  },
  time: {
    today: 'hoje',
    yesterday: 'ontem',
    date: {
      short: '{{day}} de {{month}}',
      months: 'jan,fev,mar,abr,mai,jun,jul,ago,set,out,nov,dez',
      weekdays: 'domingo,segunda-feira,terça-feira,quarta-feira,quinta-feira,sexta-feira,sábado',
    },
    now: 'agora',
    minutesAgo: 'há {{count}} min',
    hoursAgo: 'há {{count}} h',
  },
  products_one: '{{count}} produto',
  products_other: '{{count}} produtos',
  confidence: {
    VERY_RECENT: 'Visto nas últimas 24 h',
    RECENTLY_VERIFIED: 'Verificado esta semana',
    LIKELY_CURRENT: 'Provavelmente atual',
    POSSIBLY_OUTDATED: 'Pode estar desatualizado',
  },
};
