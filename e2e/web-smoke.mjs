/**
 * Walks the app the way a person would, in a real browser against the real
 * backend: every checkpoint's manual check (docs/checkpoints.md), automated.
 *
 * Needs, already running:
 *   - the backend on :3000, freshly seeded (`pnpm run seed`), with
 *     CORS_ORIGINS=http://localhost:8081
 *   - the app's web build on :8081 (`npm run web`)
 *   - Google Chrome (CHROME_PATH to override /usr/bin/google-chrome)
 *
 *   npm run e2e:web
 *
 * Screenshots of the last screen of each section, and of any failure, go to
 * e2e/screenshots/ (git-ignored).
 */
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8081';
const SHOTS = new URL('./screenshots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox'],
});
const OBELISCO = { latitude: -34.6037, longitude: -58.3816 };
const STEPHANSPLATZ = { latitude: 48.2085, longitude: 16.3721 };

await browser.defaultBrowserContext().overridePermissions(BASE_URL, ['geolocation']);

const errors = [];

/** A phone-sized tab standing at `position`, with its errors collected. */
async function openPage(position) {
  const tab = await browser.newPage();
  await tab.setViewport({ width: 390, height: 844 });
  await tab.setGeolocation(position);
  tab.on('pageerror', (error) => errors.push(`page error: ${error.message}`));
  tab.on('console', (message) => {
    // The checks provoke refusals on purpose (wrong password, taken email,
    // short password); the browser logs each 4xx. Anything else is a failure.
    const expectedRefusal = /status of 4\d\d/.test(message.text());
    if (message.type() === 'error' && !expectedRefusal) {
      errors.push(message.text());
    }
  });
  return tab;
}

// The browser stands where the seed's shopper does, by the Obelisco.
let page = await openPage(OBELISCO);

const text = (wanted) =>
  page.waitForFunction((t) => document.body.innerText.includes(t), { timeout: 15_000 }, wanted);
const gone = (unwanted) =>
  page.waitForFunction((t) => !document.body.innerText.includes(t), { timeout: 15_000 }, unwanted);

// Only what a person could see: on the web a stack keeps earlier screens mounted.
const press = async (label) => {
  const handle = await page.waitForFunction(
    (label) => {
      const visible = (n) => n.offsetParent !== null && n.getClientRects().length > 0;
      return [...document.querySelectorAll('[role=button],[role=tab],a,button')]
        .filter(visible)
        .find(
          (n) =>
            n.getAttribute('aria-label') === label ||
            n.innerText.trim() === label ||
            n.innerText.trim().endsWith(`\n${label}`),
        );
    },
    { timeout: 15_000 },
    label,
  );
  await handle.asElement().click();
};

// Rows whose accessible name is long are found by what they show. Hidden
// tabs stay laid out on the web, so only a row actually on top counts.
const pressContaining = async (shown) => {
  const handle = await page.waitForFunction(
    (shown) => {
      const onTop = (n) => {
        const box = n.getBoundingClientRect();
        const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return box.width > 0 && hit !== null && n.contains(hit);
      };
      return [...document.querySelectorAll('[role=button]')]
        .filter((n) => n.innerText.includes(shown))
        .find(onTop);
    },
    { timeout: 15_000 },
    shown,
  );
  await handle.asElement().click();
};

const typeInto = async (label, value) => {
  const handle = await page.waitForFunction(
    (label) => {
      const visible = (n) => n.offsetParent !== null && n.getClientRects().length > 0;
      return [...document.querySelectorAll('input')]
        .filter(visible)
        .find((n) => n.getAttribute('aria-label') === label);
    },
    { timeout: 15_000 },
    label,
  );
  const input = handle.asElement();
  await input.click({ clickCount: 3 });
  await input.type(value);
};

let failed = false;
const step = async (label, run) => {
  if (failed) return;
  try {
    await run();
    console.log(`ok    ${label}`);
  } catch (error) {
    failed = true;
    console.log(`FAIL  ${label}: ${error.message.split('\n')[0]}`);
    await page.screenshot({ path: `${SHOTS}failure.png` });
  }
};

// --- Checkpoint 1: sign in, sign up, sign out, the five sections ----------

await step('opens on sign-in when signed out', async () => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await text('Pagá menos por la misma compra.');
});
await step('a wrong password shows a message and stays on sign-in', async () => {
  await typeInto('Email', 'shopper@garner.test');
  await typeInto('Contraseña', 'wrong-password');
  await press('Ingresar');
  await text('Email o contraseña incorrectos.');
});
await step('the right password signs in and greets the shopper by name', async () => {
  await typeInto('Contraseña', 'correct-horse-battery');
  await press('Ingresar');
  await text('Hola, Fede');
  await page.screenshot({ path: `${SHOTS}checkpoint-1-home.png` });
});

// --- Checkpoint 2: price drops, search, a product's prices ----------------

await step('Inicio shows what dropped nearby, from the phone position', async () => {
  await text('Tu ubicación');
  await text('Bajaron cerca tuyo');
  await text('Leche Entera La Serenísima 1L');
  await text('−12%');
  await page.screenshot({ path: `${SHOTS}checkpoint-2-home.png` });
});
await step('the location chip switches to the saved place', async () => {
  await press('Ubicación: Tu ubicación. Cambiar');
  await text('Centro');
  await press('Ubicación: Centro. Cambiar');
  await text('Tu ubicación');
});
await step('a dropped product opens with its prices nearby, cheapest first', async () => {
  await pressContaining('Leche Entera La Serenísima 1L');
  await text('Cerca tuyo');
  await text('Día Caballito');
  await text('el más barato');
  await text('+ $ 70');
  await text('Últimos 30 días');
  await page.screenshot({ path: `${SHOTS}checkpoint-2-product.png` });
});
await step('back returns to Inicio', async () => {
  await press('Volver');
  await text('Bajaron cerca tuyo');
});
await step('search finds a product as you type', async () => {
  await press('Buscar');
  await text('6 productos');
  await typeInto('Buscar productos', 'arroz');
  await text('1 producto');
  await text('Arroz Largo Fino 1kg');
});
await step('a search with no match says so', async () => {
  await typeInto('Buscar productos', 'caviar');
  await text('No encontramos productos para “caviar”.');
});
await step('a category chip narrows the list, subcategories included', async () => {
  await typeInto('Buscar productos', ' ');
  await press('Lácteos');
  await text('1 producto');
  await text('Leche Entera La Serenísima 1L');
  await press('Bebidas');
  await text('Agua Mineral 2L');
});
await step('a search result opens the product', async () => {
  await pressContaining('Agua Mineral 2L');
  await text('Coto Centro');
  await text('el más barato');
  await page.screenshot({ path: `${SHOTS}checkpoint-2-search-product.png` });
  await press('Volver');
  await press('Todo');
});

for (const [tab, wanted] of [
  ['Buscar', 'Bebidas'],
  ['Listas', 'Tus listas'],
  ['Compra', 'El modo compra'],
  ['Avisos', 'Las alertas de precio'],
]) {
  await step(`the ${tab} tab opens`, async () => {
    await press(tab);
    await text(wanted);
  });
}
await step('back on Inicio, still signed in', async () => {
  await press('Inicio');
  await text('Hola, Fede');
});
await step('signing out returns to sign-in', async () => {
  await press('Cerrar sesión');
  await text('Pagá menos por la misma compra.');
  await gone('Hola, Fede');
});
await step('signing up with a taken email says so, in Spanish', async () => {
  await press('Crear cuenta');
  await text('Creá tu cuenta');
  await typeInto('Nombre', 'Prueba Web');
  await typeInto('Email', 'shopper@garner.test');
  await typeInto('Contraseña', 'correct-horse-battery');
  await press('Crear cuenta');
  await text('Ya existe una cuenta con ese email.');
});
await step('a password that is too short is explained', async () => {
  await typeInto('Email', `web-${Date.now()}@garner.test`);
  await typeInto('Contraseña', 'corta');
  await press('Crear cuenta');
  await text('una contraseña de al menos 10 caracteres');
});
await step('a new account can sign up and lands signed in', async () => {
  await typeInto('Contraseña', 'correct-horse-battery');
  await press('Crear cuenta');
  await text('Hola, Prueba Web');
});

// --- Vienna: the same app, in euros, on Vienna's clocks -------------------

await step('in Vienna, Inicio shows what dropped nearby, in euros', async () => {
  page = await openPage(STEPHANSPLATZ);
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await typeInto('Email', 'shopper@garner.test');
  await typeInto('Contraseña', 'correct-horse-battery');
  await press('Ingresar');
  await text('Tu ubicación');
  await text('Agua Mineral 2L');
  await text('€ 0,69');
  await text('−12%');
  await page.screenshot({ path: `${SHOTS}vienna-home.png` });
});
await step('a product in Vienna compares Vienna stores in euros', async () => {
  await pressContaining('Leche Entera La Serenísima 1L');
  await text('Hofer Landstraße');
  await text('€ 1,15');
  await text('+ € 0,14');
  await text('Últimos 30 días');
  await gone('Coto Centro');
  await page.screenshot({ path: `${SHOTS}vienna-product.png` });
});

await browser.close();

if (errors.length > 0) {
  console.log(`\nErrors in the page:\n${errors.join('\n')}`);
}
process.exit(failed || errors.length > 0 ? 1 : 0);
