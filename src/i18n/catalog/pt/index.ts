import { alerts } from './alerts';
import { browse } from './browse';
import { common } from './common';
import { community } from './community';
import { contributions } from './contributions';
import { lists } from './lists';
import { plan } from './plan';
import { shell } from './shell';
import { trip } from './trip';
import type { es } from '../es';
import type { Catalog } from '../types';


export const pt: Catalog<typeof es> = {
  common,
  alerts,
  shell,
  browse,
  lists,
  plan,
  contributions,
  community,
  trip,
};
