/**
 * Walks every screen at every window width and fails on what breaks a layout:
 * sideways scrolling, something that sticks out of the window, a target too
 * small to tap, or a word split across lines. Screenshots of each screen at
 * each width go to e2e/screenshots/sizes/ (git-ignored), to look at.
 *
 * Needs what the web walk-through needs: the backend on :3000, freshly seeded,
 * with CORS_ORIGINS=http://localhost:8081 and RATE_LIMIT_MAX=1000, and the web
 * build on :8081. Stands by the Stephansplatz, so the euro data shows.
 *
 *   npm run e2e:sizes                 every width in Spanish; narrow ones in German
 *   SWEEP_WIDTHS=320,390 npm run e2e:sizes
 */
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8081';
const SHOTS = new URL('./screenshots/sizes/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const WIDTHS = (process.env.SWEEP_WIDTHS ?? '280,320,360,390,430,600,768,1024,1440,2560').split(',').map(Number);
/** German has the longest words, so it is what breaks narrow screens. */
const GERMAN_WIDTHS = WIDTHS.filter((width) => width <= 430);
const heightFor = (width) => (width < 600 ? Math.round(width * 2.05) : width < 1024 ? 1024 : Math.round(width * 0.6));
/** Smaller than this is too small even with hit slop (chips are 36, and slop to 44). */
const MIN_TARGET = 36;

const LABELS = {
  es: {
    home: 'Inicio', search: 'Buscar', lists: 'Listas', shop: 'Compra', inbox: 'Avisos', back: 'Volver', close: 'Cerrar',
    account: 'Cuenta', mine: 'Mis aportes', dairy: 'Lácteos y huevos', departments: 'Departamentos',
    searchBox: 'Buscar productos', milk: 'Leche Entera La Serenísima 1L', report: 'Informar precio',
    addStore: '¿No está tu súper? Agregalo', list: 'Compra en Viena', more: 'Más opciones', plan: 'Dónde comprar',
    alerts: 'Mis alertas', prefs: 'Preferencias de avisos', scan: 'Escanear código de barras',
    notFound: 'No lo encuentro — agregarlo', category: 'Elegí una categoría',
  },
  de: {
    home: 'Start', search: 'Suchen', lists: 'Listen', shop: 'Einkauf', inbox: 'Hinweise', back: 'Zurück', close: 'Schließen',
    account: 'Konto', mine: 'Meine Beiträge', dairy: 'Milchprodukte und Eier', departments: 'Abteilungen',
    searchBox: 'Produkte suchen', milk: 'Leche Entera La Serenísima 1L', report: 'Preis melden',
    addStore: 'Dein Geschäft fehlt? Hinzufügen', list: 'Compra en Viena', more: 'Weitere Optionen', plan: 'Wo kaufen',
    alerts: 'Meine Preisalarme', prefs: 'Einstellungen für Hinweise', scan: 'Barcode scannen',
    notFound: 'Nicht gefunden — hinzufügen', category: 'Kategorie wählen',
  },
};

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox'],
});
await browser.defaultBrowserContext().overridePermissions(BASE_URL, ['geolocation']);
const page = await browser.newPage();
await page.setGeolocation({ latitude: 48.2085, longitude: 16.3721 });
await page.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, 'languages', { get: () => ['es-AR', 'es'] });
  Object.defineProperty(navigator, 'language', { get: () => 'es-AR' });
});

const errors = [];
page.on('pageerror', (error) => errors.push(`page error: ${error.message}`));

/**
 * The first thing matching that a finger could tap: on top at its own centre,
 * and no longer moving. Stacks and inactive tabs keep their screens laid out
 * underneath, and sheets slide in and out.
 */
const tappable = (selector, kind, wanted) =>
  page
    .waitForFunction(
      (selector, kind, wanted) => {
        const matches = (n) => {
          const name = n.getAttribute('aria-label') ?? '';
          const shown = n.innerText?.trim() ?? '';
          if (kind === 'containing') return shown.includes(wanted);
          // "Mis aportes, 3" is still "Mis aportes"; a tab's text starts with its icon.
          return name === wanted || name.startsWith(`${wanted},`) || shown === wanted || shown.endsWith(`\n${wanted}`);
        };
        const modals = [...document.querySelectorAll('[aria-modal="true"]')];
        const settled = (n) => {
          if (modals.length > 0 && !modals.some((modal) => modal.contains(n))) return false;
          const box = n.getClientRects()[0] ?? n.getBoundingClientRect();
          if (box.width === 0) return false;
          if (box.bottom > window.innerHeight || box.top < 0) {
            n.scrollIntoView({ block: 'center' });
            return false;
          }
          const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
          if (hit === null || !n.contains(hit)) {
            n.scrollIntoView({ block: 'center' });
            return false;
          }
          const where = `${box.x},${box.y},${box.width}`;
          const still = n.dataset.sweepWhere === where;
          n.dataset.sweepWhere = where;
          return still;
        };
        return [...document.querySelectorAll(selector)].find((n) => matches(n) && settled(n)) ?? null;
      },
      { timeout: 10_000, polling: 100 },
      selector,
      kind,
      wanted,
    )
    .catch(() => {
      throw new Error(`nothing on top to press: "${wanted}"`);
    })
    .then((handle) => handle.asElement());

const PRESSABLE = '[role=button],[role=tab],[role=switch],[role=checkbox],[role=radio],[role=link],a,button';
const settle = () => new Promise((resolve) => setTimeout(resolve, 300));
const press = async (label) => {
  await (await tappable(PRESSABLE, 'label', label)).click();
  await settle();
};
const pressContaining = async (text) => {
  await (await tappable('[role=button]', 'containing', text)).click();
  await settle();
};
/** Closes the sheet or dialog on top, as Esc or the Android back button would. */
const dismiss = async () => {
  await page.keyboard.press('Escape');
  await new Promise((resolve) => setTimeout(resolve, 400));
};
const type = async (label, value) => {
  const input = await tappable('input', 'label', label);
  await input.click({ clickCount: 3 });
  await input.type(value);
  await new Promise((resolve) => setTimeout(resolve, 600));
};

/** What is wrong with the layout on screen right now. */
const problems = () =>
  page.evaluate((minTarget) => {
    const found = [];
    const width = window.innerWidth;
    if (document.documentElement.scrollWidth > width + 1) {
      found.push(`the page scrolls sideways (${document.documentElement.scrollWidth} in ${width})`);
    }
    const scrollsSideways = (n) => {
      for (let el = n.parentElement; el; el = el.parentElement) {
        const style = getComputedStyle(el);
        if (['auto', 'scroll'].includes(style.overflowX) && el.scrollWidth > el.clientWidth + 1) return true;
      }
      return false;
    };
    const describe = (n) => (n.getAttribute('aria-label') ?? n.innerText ?? n.tagName).trim().slice(0, 40);
    const modals = [...document.querySelectorAll('[aria-modal="true"]')];
    for (const n of document.querySelectorAll('[role=button],[role=tab],[role=radio],[role=checkbox],[role=switch],[role=link],a,input')) {
      const box = n.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (modals.length > 0 && !modals.some((modal) => modal.contains(n))) continue;
      if (box.top >= window.innerHeight || box.bottom <= 0) continue;
      // Only what is on the visible screen, not one laid out underneath it.
      const x = Math.min(Math.max(box.x + box.width / 2, 0), width - 1);
      const y = Math.min(Math.max(box.y + box.height / 2, 0), window.innerHeight - 1);
      const hit = document.elementFromPoint(x, y);
      if (!hit || !(n.contains(hit) || hit.contains(n))) continue;
      if ((box.right > width + 1 || box.left < -1) && !scrollsSideways(n)) {
        found.push(`sticks out of the window: "${describe(n)}" (${Math.round(box.left)}–${Math.round(box.right)})`);
      }
      // The map's own credits and pin are the library's, and the map itself can be tapped.
      if ((box.height < minTarget || box.width < minTarget) && !n.closest('.maplibregl-map')) {
        found.push(`too small to tap: "${describe(n)}" (${Math.round(box.width)}×${Math.round(box.height)})`);
      }
    }
    // A word split across two lines ("heut / e?"): the text's box is too narrow.
    // At a hyphen is where words may break.
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (['STYLE', 'SCRIPT'].includes(node.parentElement?.tagName)) continue;
      for (const match of node.textContent.matchAll(/[^\s-]{2,}/g)) {
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        const lines = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)));
        if (lines.size < 2) continue;
        const [first] = range.getClientRects();
        const hit = document.elementFromPoint(first.x + first.width / 2, first.y + first.height / 2);
        if (first.top >= 0 && first.bottom <= window.innerHeight && hit && node.parentElement.contains(hit)) {
          found.push(`splits a word: "${match[0].slice(0, 30)}"`);
        }
      }
    }
    return [...new Set(found)];
  }, MIN_TARGET);

const failures = [];
const check = async (language, width, name) => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  await page.screenshot({ path: `${SHOTS}${language}-${width}-${name}.png` });
  for (const problem of await problems()) failures.push(`${language} ${width} ${name}: ${problem}`);
};

/** Every screen, in the order a person might reach them. */
const walk = async (language, width) => {
  const l = LABELS[language];
  const visit = (name) => check(language, width, name);

  await press(l.home);
  await visit('home');
  await press(l.account);
  await visit('account');
  await press(l.back);
  await press(l.mine);
  await visit('contributions');
  await press(l.back);
  await press(l.scan);
  await visit('scan');
  await press(l.close);

  await press(l.search);
  await visit('search');
  await press(l.dairy);
  await visit('department');
  await press(l.departments);
  await type(l.searchBox, 'leche');
  await visit('results');
  await pressContaining(l.milk);
  await visit('product');
  await press(l.report);
  await visit('report');
  await press(l.addStore);
  await visit('add-store');
  await press(l.close);
  await press(l.close);
  await press(l.back);
  await type(l.searchBox, 'zzzzz');
  await press(l.notFound);
  await visit('add-product');
  await press(l.category);
  await visit('category-picker');
  await dismiss();
  await press(l.close);
  await type(l.searchBox, ' ');

  await press(l.lists);
  await visit('lists');
  await pressContaining(l.list);
  await visit('list');
  await press(l.more);
  await visit('list-options');
  await dismiss();
  await press(l.plan);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await visit('plan');
  await press(l.back);
  await press(l.back);

  await press(l.shop);
  await visit('shop');

  await press(l.inbox);
  await visit('inbox');
  await press(l.alerts);
  await visit('alerts');
  await press(l.back);
  await press(l.prefs);
  await visit('preferences');
  await press(l.back);
};

let crashed = false;
const sweep = async (language, widths) => {
  for (const width of widths) {
    await page.setViewport({ width, height: heightFor(width) });
    try {
      await walk(language, width);
      console.log(`ok    ${language} ${width}`);
    } catch (error) {
      crashed = true;
      failures.push(`${language} ${width}: the walk stopped: ${error.message.split('\n')[0]}`);
      // The browser itself may be what died: still report what was found.
      await page.screenshot({ path: `${SHOTS}failure-${language}-${width}.png` }).catch(() => undefined);
      console.log(`FAIL  ${language} ${width}`);
      break;
    }
  }
};

/**
 * The development server can fail the first render of a route it has not
 * bundled yet ("Requiring unknown module"), and the next request works.
 */
const openPage = async (url) => {
  for (let attempt = 1; ; attempt += 1) {
    await page.goto(url, { waitUntil: 'networkidle0' });
    const opened = await page.waitForSelector('input', { timeout: 15_000 }).catch(() => null);
    if (opened) return;
    if (attempt === 3) throw new Error(`${url} never showed a form`);
  }
};

// Signed out first: a reload signs out on the web, so these are one page load each.
for (const width of WIDTHS) {
  await page.setViewport({ width, height: heightFor(width) });
  for (const [name, path] of [['sign-in', '/sign-in'], ['sign-up', '/sign-up'], ['forgot-password', '/forgot-password']]) {
    await openPage(`${BASE_URL}${path}`);
    await check('es', width, name);
  }
}

await page.setViewport({ width: 390, height: 844 });
await openPage(BASE_URL);
for (const [label, value] of [['Email', 'shopper@garner.test'], ['Contraseña', 'correct-horse-battery']]) {
  await (await tappable('input', 'label', label)).type(value);
}
await press('Ingresar');
await page.waitForFunction(() => document.body.innerText.includes('Hola, Fede'), { timeout: 30_000 });

// A fresh seed asks for the terms again, which pushes everything else down.
await press('Acepto');
await page.waitForFunction(() => !document.body.innerText.includes('Para seguir usando Garner'), { timeout: 10_000 });

await sweep('es', WIDTHS);
if (!crashed && GERMAN_WIDTHS.length > 0) {
  await page.setViewport({ width: 390, height: 844 });
  await press('Inicio');
  await press('Cuenta');
  await press('Deutsch');
  await press('Zurück');
  await sweep('de', GERMAN_WIDTHS);
}

await browser.close().catch(() => undefined);

const unique = [...new Set(failures)];
if (errors.length > 0) console.log(`\nErrors in the page:\n${[...new Set(errors)].join('\n')}`);
if (unique.length > 0) {
  console.log(`\n${unique.length} layout problems:\n${unique.join('\n')}`);
  process.exit(1);
}
console.log(`\nNo layout problems at ${WIDTHS.join(', ')}.`);
process.exit(errors.length > 0 ? 1 : 0);
