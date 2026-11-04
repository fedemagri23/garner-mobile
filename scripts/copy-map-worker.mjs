/**
 * MapLibre does its work in a web worker, loaded by URL, which a bundle cannot
 * provide. So the file is served as it comes, at the version installed. Runs
 * after every install; the copy is not committed.
 */
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync(new URL('../public/', import.meta.url), { recursive: true });
copyFileSync(
  new URL('../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url),
  new URL('../public/maplibre-gl-worker.mjs', import.meta.url),
);
