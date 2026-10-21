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
 *
 * The lists it creates it deletes again, so the shopper keeps the seed's.
 * The walk-through makes more requests a minute than the API allows one
 * client by default (120), and the app (rightly) answers "Demasiados
 * intentos". Run the backend for it with a higher limit, without touching
 * .env:  RATE_LIMIT_MAX=1000 pnpm run start:dev
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

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';

const NEW_ACCOUNT = { email: `web-${Date.now()}@garner.test`, password: 'correct-horse-battery' };
const LABEL_PHOTO = new URL('./fixtures/label.jpg', import.meta.url).pathname;

/** Signs in to the API directly, for checks and clean-up behind the app's back. */
async function apiToken({ email, password }) {
  const login = await fetch(`${API_URL}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return (await login.json()).accessToken;
}

/** The prices an account has contributed, as the server lists them. */
async function serverContributions({ email, password }) {
  const login = await fetch(`${API_URL}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const { accessToken } = await login.json();
  const page = await (
    await fetch(`${API_URL}/v1/price-observations/mine?pageSize=50`, { headers: { authorization: `Bearer ${accessToken}` } })
  ).json();
  return page.data;
}

/** What the server itself says, to check that what the app showed is what it kept. */
async function serverTrips(status) {
  const login = await fetch(`${API_URL}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'shopper@garner.test', password: 'correct-horse-battery' }),
  });
  const { accessToken } = await login.json();
  const headers = { authorization: `Bearer ${accessToken}` };
  const list = await (await fetch(`${API_URL}/v1/shopping-sessions?status=${status}`, { headers })).json();
  return Promise.all(
    list.data.map(async (trip) => (await fetch(`${API_URL}/v1/shopping-sessions/${trip.id}`, { headers })).json()),
  );
}

const errors = [];

/** A phone-sized tab standing at `position`, with its errors collected. */
async function openPage(position) {
  const tab = await browser.newPage();
  await tab.setViewport({ width: 390, height: 844 });
  await tab.setGeolocation(position);
  // The phone is set to Spanish (Argentina); the app follows it unless the shopper picks otherwise.
  await tab.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'languages', { get: () => ['es-AR', 'es'] });
    Object.defineProperty(navigator, 'language', { get: () => 'es-AR' });
  });
  tab.on('pageerror', (error) => errors.push(`page error: ${error.message}`));
  tab.on('console', (message) => {
    // The checks provoke refusals on purpose (wrong password, taken email,
    // short password); the browser logs each 4xx. Anything else is a failure.
    // The offline steps cut the connection on purpose; Chrome logs each blocked request.
    const expectedRefusal = /status of 4\d\d|ERR_INTERNET_DISCONNECTED/.test(message.text());
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

// Only what a person could tap: on the web, stacks and inactive tabs keep
// their screens laid out underneath, and sheets slide in and out. A target
// counts once it is on top at its own centre and has stopped moving — and,
// while a modal is open (or still closing, when it traps focus), only if it
// is inside that modal.
const settledOnTop = (n) => {
  // The first line's box: text that wraps has a bounding box whose centre can
  // be empty space, which no finger would be aimed at.
  const modals = [...document.querySelectorAll('[aria-modal="true"]')];
  if (modals.length > 0 && !modals.some((modal) => modal.contains(n))) return false;
  const box = n.getClientRects()[0] ?? n.getBoundingClientRect();
  // Below the fold: scroll to it, as a person would, and look again.
  if (box.width > 0 && (box.bottom > window.innerHeight || box.top < 0)) {
    n.scrollIntoView({ block: 'center' });
    return false;
  }
  const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
  if (!(box.width > 0 && hit !== null && n.contains(hit))) {
    // Covered — by a header over scrolled content, say: scroll it to the
    // middle, as a person would, and look again. (Hidden screens scroll too,
    // harmlessly; they never come out on top.)
    if (box.width > 0) n.scrollIntoView({ block: 'center' });
    return false;
  }
  const where = `${box.x},${box.y},${box.width}`;
  const settled = n.dataset.e2eWhere === where;
  n.dataset.e2eWhere = where;
  return settled;
};

/** Waits for the first element matching `selector` and `match` that a finger could tap. */
const tappable = (selector, match, arg) =>
  page
    .waitForFunction(
      (selector, matchSource, arg, settledSource) => {
        const match = new Function(`return ${matchSource}`)();
        const settledOnTop = new Function(`return ${settledSource}`)();
        return [...document.querySelectorAll(selector)].find((n) => match(n, arg) && settledOnTop(n)) ?? null;
      },
      { timeout: 15_000, polling: 100 },
      selector,
      match.toString(),
      arg,
      settledOnTop.toString(),
    )
    .then((handle) => handle.asElement());

const press = async (label) => {
  const target = await tappable(
    '[role=button],[role=tab],[role=switch],[role=checkbox],[role=radio],a,button',
    (n, label) =>
      n.getAttribute('aria-label') === label ||
      n.innerText.trim() === label ||
      n.innerText.trim().endsWith(`\n${label}`),
    label,
  );
  await target.click();
};

/** Text a person can actually see: in a leaf element that is on top. */
const shown = (wanted) =>
  tappable(
    'div,span,h1,h2,h3,h4,h5,h6',
    // textContent, not innerText: the text as written, before CSS uppercases it.
    (n, wanted) => n.children.length === 0 && n.textContent.trim() === wanted,
    wanted,
  );

// Rows whose accessible name is long are found by what they show.
const pressContaining = async (shown) => {
  const target = await tappable('[role=button]', (n, shown) => n.innerText.includes(shown), shown);
  await target.click();
};

const typeInto = async (label, value) => {
  const input = await tappable('input', (n, label) => n.getAttribute('aria-label') === label, label);
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
  const token = await apiToken({ email: 'shopper@garner.test', password: 'correct-horse-battery' });
  const all = await (await fetch(`${API_URL}/v1/products?pageSize=1`, { headers: { authorization: `Bearer ${token}` } })).json();
  await press('Buscar');
  await text(`${all.meta.totalItems} productos`);
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

// --- Checkpoint 3: barcodes and "add to list" -----------------------------
// Headless Chrome has no camera, so codes are typed, as on a laptop.

await step('the scanner opens from Inicio, with a field to type the code', async () => {
  await press('Inicio');
  await press('Escanear código de barras');
  await text('Escaneá el código');
});
await step('a code not in the catalog says so, and lets you scan again', async () => {
  await typeInto('Código de barras', '4006381333931');
  await press('Buscar');
  await text('Todavía no tenemos este producto en el catálogo.');
  await text('Código 4006381333931');
  await shown('Agregarlo al catálogo');
  await press('Escanear otro');
  await gone('Código 4006381333931');
});
await step('a mistyped code is called out', async () => {
  await typeInto('Código de barras', '7791234000028');
  await press('Buscar');
  await text('Ese código no parece un código de barras válido.');
  await press('Escanear otro');
});
await step('a known code lands on the product', async () => {
  await typeInto('Código de barras', '7791234000029');
  await press('Buscar');
  await text('Arroz Largo Fino 1kg');
  await text('Cerca tuyo');
  await page.screenshot({ path: `${SHOTS}checkpoint-3-scanned.png` });
});
await step('"A la lista" adds one more to a list that already has it', async () => {
  await press('Agregar a la lista');
  await text('Agregar a una lista');
  await text('Compra semanal');
  await text('ya tiene');
  await pressContaining('Compra semanal');
  await text('en Compra semanal.');
  await page.screenshot({ path: `${SHOTS}checkpoint-3-added.png` });
  await press('Listo');
  await gone('Agregar a una lista');
  await press('Volver');
});

// --- Checkpoint 4: the Listas tab ------------------------------------------

await step('Listas shows the shopper\'s lists with their estimate', async () => {
  await press('Listas');
  await text('Tus listas');
  await text('Compra semanal');
  await text('estimado');
});
await step('a list opens with its items and total', async () => {
  await pressContaining('Compra semanal');
  await text('Total estimado');
  await text('Leche Entera La Serenísima 1L');
  await text('4 productos');
  await page.screenshot({ path: `${SHOTS}checkpoint-4-list.png` });
});
await step('a product is added from the list, priced at the cheapest nearby', async () => {
  await typeInto('Agregar producto', 'galletitas');
  await press('Agregar Galletitas Surtidas Arcor 400g');
  await shown('Agregado: Galletitas Surtidas Arcor 400g.');
  await text('5 productos');
  await shown('$ 1.490');
});
await step('quantities go up and down, and down from one removes the item', async () => {
  await press('Uno más de Galletitas Surtidas Arcor 400g');
  await shown('$ 2.980');
  await press('Uno menos de Galletitas Surtidas Arcor 400g');
  await shown('$ 1.490');
  await press('Quitar Galletitas Surtidas Arcor 400g');
  await text('4 productos');
});
await step('a list can be renamed', async () => {
  await press('Más opciones');
  await press('Cambiar el nombre');
  await typeInto('Nombre', 'Compra del mes');
  await press('Guardar');
  await text('Compra del mes');
  await press('Más opciones');
  await press('Cambiar el nombre');
  await typeInto('Nombre', 'Compra semanal');
  await press('Guardar');
  await gone('Compra del mes');
});
await step('a list can be duplicated, and the copy deleted after asking', async () => {
  await press('Más opciones');
  await press('Duplicar la lista');
  await text('Compra semanal (copia)');
  await press('Más opciones');
  await press('Eliminar la lista');
  await text('No se puede deshacer.');
  await press('Sí, eliminar');
  await press('Volver');
  await text('Tus listas');
  await gone('Compra semanal (copia)');
});
await step('a new list is created in the local currency', async () => {
  await press('Nueva lista');
  await typeInto('Nombre', 'Asado del sábado');
  await press('Crear lista');
  await text('Asado del sábado');
  await text('La lista está vacía.');
  await typeInto('Agregar producto', 'agua');
  await press('Agregar Agua Mineral 2L');
  await shown('Agregado: Agua Mineral 2L.');
  await shown('$ 890');
  await page.screenshot({ path: `${SHOTS}checkpoint-4-new-list.png` });
  // Leave the shopper's lists as the seed made them.
  await press('Más opciones');
  await press('Eliminar la lista');
  await press('Sí, eliminar');
  await text('Tus listas');
  await gone('Asado del sábado');
});

// --- Checkpoint 5: where to buy -------------------------------------------

await step('a list asks where to buy it, and gets the three alternatives', async () => {
  await press('Listas');
  await pressContaining('Compra semanal');
  await press('¿Dónde conviene comprar?');
  await shown('Ahorrás');
  await shown('Equilibrado');
  await shown('Total');
  await page.screenshot({ path: `${SHOTS}checkpoint-5-plan.png` });
});
await step('each alternative shows its stops, and a stop what to buy there', async () => {
  // Día is cheapest but past the default 5 km of extra travel, so the
  // cheapest plan within limits is Carrefour, and the note says why.
  await press('Más barato');
  await shown('Carrefour Almagro');
  await pressContaining('Carrefour Almagro');
  await shown('Av. Rivadavia 3900');
  await text('más de lo que elegiste');
  await press('Más simple');
  await shown('Recorrido');
});
await step('preferences change the plan, and are put back', async () => {
  await press('Preferencias');
  await shown('Súper como máximo');
  await press('Más: Súper como máximo');
  await press('Guardar y calcular');
  await shown('Ahorrás');
  await press('Preferencias');
  await press('Menos: Súper como máximo');
  await press('Guardar y calcular');
  await shown('Ahorrás');
});
await step('a euro list near the Obelisco finds nothing to buy in euros', async () => {
  await press('Volver');
  await press('Volver');
  await pressContaining('Compra en Viena');
  await press('¿Dónde conviene comprar?');
  await shown('Ningún súper cerca tuyo tiene precios en euros para esta lista.');
  await press('Volver');
  await press('Volver');
});
await step('Inicio shows the list\'s savings from its plan', async () => {
  await press('Inicio');
  await shown('de ahorro');
  await shown('Ver el plan');
  await page.screenshot({ path: `${SHOTS}checkpoint-5-home.png` });
  await press('Ver el plan');
  await shown('Ahorrás');
  await press('Volver');
});

// --- Checkpoint 6: shopping ------------------------------------------------
// Only the trip without stores is finished: finishing one with stores turns
// its prices into reports, which would move the demo prices.

await step('Compra starts a trip from a list', async () => {
  await press('Compra');
  await shown('Compra');
  await press('Empezar la compra de Compra semanal');
  await shown('0 / 4');
  await shown('Esperado $ 1.400 c/u');
  await page.screenshot({ path: `${SHOTS}checkpoint-6-trip.png` });
});
await step('the price paid is typed, and the item ticked off', async () => {
  await typeInto('Precio pagado por unidad', '1.350');
  await press('Listo');
  await shown('1 / 4');
  await shown('Pagado $ 1.350 c/u');
  await shown('$ 2.700');
});
await step('an item can be ticked and unticked from the list', async () => {
  await press('Marcar Pan Lactal 500g');
  await shown('2 / 4');
  await press('Desmarcar Pan Lactal 500g');
  await shown('1 / 4');
});
await step('a trip can be paused and continued', async () => {
  await press('Opciones de la compra');
  await press('Pausar');
  await shown('Compra en pausa');
  await press('Seguir');
  await gone('Compra en pausa');
});
await step('finishing shows what was spent', async () => {
  await press('Terminar la compra');
  await shown('Compraste 1 de 4 productos. Tu lista no cambia: lo que falta sigue ahí para la próxima.');
  await press('Terminar');
  await shown('Compra terminada');
  await shown('$ 2.700');
  await page.screenshot({ path: `${SHOTS}checkpoint-6-summary.png` });
  await press('Listo');
  await shown('Compra');
});
await step('a trip can follow a plan stop by stop, at the plan\'s stores and prices', async () => {
  // With 40 minutes to spare, the cheapest plan buys the rice at Coto and the
  // rest at Carrefour: two stops.
  await press('Listas');
  await pressContaining('Compra semanal');
  await press('¿Dónde conviene comprar?');
  await press('Preferencias');
  for (let i = 0; i < 4; i++) await press('Más: Tiempo extra');
  await press('Guardar y calcular');
  await shown('Ahorrás');
  await press('Más barato');
  await press('Empezar la compra: Más barato');
  await shown('Parada 1 de 2');
  await shown('Coto Centro');
  await shown('Arroz Largo Fino 1kg × 2');
  await page.screenshot({ path: `${SHOTS}checkpoint-6-plan-trip.png` });
  await press('Siguiente parada');
  await shown('Parada 2 de 2');
  await shown('Carrefour Almagro');
  await shown('0 / 3');
  await press('Anterior');
  await shown('Parada 1 de 2');
});
await step('a trip can be abandoned after asking', async () => {
  await press('Opciones de la compra');
  await press('Abandonar');
  await press('Sí, abandonar');
  await text('Marcá lo que vas poniendo');
  // Put the shopper's preference back.
  await press('Listas');
  await press('Preferencias');
  for (let i = 0; i < 4; i++) await press('Menos: Tiempo extra');
  await press('Guardar y calcular');
  await shown('Ahorrás');
  await press('Volver');
  await press('Volver');
});

// --- Checkpoint 7: shopping without a connection --------------------------

await step('offline: ticks and prices wait on the phone, and say so', async () => {
  await press('Compra');
  await press('Empezar la compra de Compra semanal');
  await shown('0 / 4');
  await page.setOfflineMode(true);
  await press('Marcar Pan Lactal 500g');
  await shown('1 / 4');
  await text('Sin conexión');
  await shown('1 cambio espera para enviarse');
  await typeInto('Precio pagado por unidad', '1.350');
  await press('Listo');
  await shown('2 / 4');
  await shown('Pagado $ 1.350 c/u · por enviar');
  await shown('2 cambios esperan para enviarse');
  await page.screenshot({ path: `${SHOTS}checkpoint-7-offline.png` });
});
await step('back online, what waited is sent, and the server has it', async () => {
  await page.setOfflineMode(false);
  await shown('Todo enviado');
  await gone('esperan para enviarse');
  const [trip] = await serverTrips('ACTIVE');
  const bought = trip.items.filter((item) => item.isPurchased);
  if (bought.length !== 2 || !bought.some((item) => item.actualUnitPriceCents === 135000)) {
    throw new Error(`server has ${bought.length} bought lines, prices ${bought.map((i) => i.actualUnitPriceCents)}`);
  }
  await page.screenshot({ path: `${SHOTS}checkpoint-7-synced.png` });
});
await step('a trip can be finished offline, and is sent when the connection returns', async () => {
  await page.setOfflineMode(true);
  await press('Terminar la compra');
  await press('Terminar');
  await shown('Compra terminada');
  // Pan at its expected 1.200 (ticked, no price typed) plus the milk at 2.700.
  await shown('$ 3.900');
  await text('Tu compra se envía cuando vuelva la conexión');
  await page.screenshot({ path: `${SHOTS}checkpoint-7-finished-offline.png` });
  await page.setOfflineMode(false);
  await gone('Tu compra se envía cuando vuelva la conexión');
  const done = await serverTrips('COMPLETED');
  if (!done.some((trip) => trip.totals.purchasedItemCount === 2)) {
    throw new Error('the server never completed the trip');
  }
  if ((await serverTrips('ACTIVE')).length > 0) throw new Error('a trip is still open on the server');
  await press('Listo');
});

// --- Checkpoint 9: alerts and messages -------------------------------------
// The seed gave the shopper 3 alerts and 4 messages (3 unread). What these
// steps change they put back.

await step('Avisos shows the messages in Spanish, with how many are unread', async () => {
  await press('Avisos');
  await shown('3 sin leer');
  await shown('Leche Entera La Serenísima 1L bajó a $ 1.320');
  await shown('Agua Mineral 2L: −7%');
  await shown('Aceite de Girasol 900ml más barato cerca');
  // Vienna's message is written in euros, whatever the shopper's own place.
  await shown('Hofer Landstraße lo tiene a € 1,15, antes € 1,29.');
  await page.screenshot({ path: `${SHOTS}checkpoint-9-inbox.png` });
});
await step('opening a message shows its product and marks it read', async () => {
  await pressContaining('Agua Mineral 2L: −7%');
  await shown('Cerca tuyo');
  await press('Volver');
  await shown('2 sin leer');
});
await step('Mis alertas lists what is watched, and one can be paused and resumed', async () => {
  await press('Mis alertas, 3');
  await shown('Cuando baje de $ 1.400 · cerca tuyo (5 km)');
  await shown('Cuando baje 5% o más · Coto Centro');
  await shown('Cuando un súper cerca tuyo sea el más barato (5 km)');
  await press('Pausar la alerta de Leche Entera La Serenísima 1L');
  await shown('En pausa');
  await press('Activar la alerta de Leche Entera La Serenísima 1L');
  await gone('En pausa');
  await page.screenshot({ path: `${SHOTS}checkpoint-9-alerts.png` });
});
await step('an alert is made from a product, near the shopper, in their currency', async () => {
  await press('Volver');
  await press('Buscar');
  await pressContaining('Leche Entera La Serenísima 1L');
  await press('Avisame si baja');
  await press('Baja de un precio');
  await typeInto('Precio límite', '1.300');
  await press('Crear alerta');
  await shown('Listo: te avisamos en Avisos.');
  await press('Ver mis alertas');
  await shown('Cuando baje de $ 1.300 · cerca tuyo (5 km)');
  await page.screenshot({ path: `${SHOTS}checkpoint-9-new-alert.png` });
});
await step('an alert can be deleted after asking', async () => {
  // The newest is first in the list.
  await press('Borrar la alerta de Leche Entera La Serenísima 1L');
  await shown('¿Borrar esta alerta?');
  await press('Sí, borrar');
  await gone('Cuando baje de $ 1.300 · cerca tuyo (5 km)');
  await press('Volver');
});
await step('preferences: quiet hours can be set and are put back', async () => {
  await press('Preferencias de avisos');
  await shown('Avisos de precio');
  await press('No molestar de noche');
  await shown('Desde');
  await shown('22:00');
  await press('Más: Desde');
  await shown('23:00');
  await page.screenshot({ path: `${SHOTS}checkpoint-9-preferences.png` });
  const prefs = async () => {
    const login = await fetch(`${API_URL}/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'shopper@garner.test', password: 'correct-horse-battery' }),
    });
    const { accessToken } = await login.json();
    return (await fetch(`${API_URL}/v1/notification-preferences`, { headers: { authorization: `Bearer ${accessToken}` } })).json();
  };
  const saved = await prefs();
  if (saved.quietHoursStartUtc === null) throw new Error('quiet hours were not saved');
  await press('No molestar de noche');
  await gone('Desde');
  if ((await prefs()).quietHoursStartUtc !== null) throw new Error('quiet hours were not cleared');
  await press('Volver');
  // The alert was made from a product in Buscar: leave that tab at its start.
  await press('Buscar');
  await press('Volver');
});

for (const [tab, wanted] of [
  ['Buscar', 'Bebidas'],
  ['Listas', 'Tus listas'],
  ['Compra', 'Marcá lo que vas poniendo'],
  ['Avisos', 'Mis alertas'],
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
  await typeInto('Email', NEW_ACCOUNT.email);
  await typeInto('Contraseña', 'corta');
  await press('Crear cuenta');
  await text('una contraseña de al menos 10 caracteres');
});
await step('a new account can sign up and lands signed in', async () => {
  await typeInto('Contraseña', 'correct-horse-battery');
  await press('Crear cuenta');
  await text('Hola, Prueba Web');
});
await step('a new account makes its first list from "A la lista"', async () => {
  await pressContaining('Agua Mineral 2L');
  await press('Agregar a la lista');
  await text('Todavía no tenés listas.');
  await press('Crear “Mi lista” y agregar');
  await text('Agregado a Mi lista.');
  await text('1 producto · ya tiene 1');
  await press('Listo');
});

// --- Checkpoint 8: reporting a price ---------------------------------------
// Done as the throwaway account, so the shopper's own history stays clean.

await step('a price is reported from a product, with a photo of the label', async () => {
  await press('Informar precio');
  await shown('¿En qué súper estás?');
  await shown('Coto Centro');
  await typeInto('Precio en góndola', '960');
  // Nothing may stick out past the screen: a text field that will not shrink
  // pushes the page sideways (MBUG-017).
  const sticksOut = await page.evaluate(() =>
    [...document.querySelectorAll('input')].some((n) => {
      const box = n.getBoundingClientRect();
      return box.width > 0 && box.right > document.documentElement.clientWidth + 1;
    }),
  );
  if (sticksOut) throw new Error('a text field is wider than the screen');
  const [chooser] = await Promise.all([page.waitForFileChooser(), press('Elegir una foto')]);
  await chooser.accept([LABEL_PHOTO]);
  await press('Quitar la foto');
  const [again] = await Promise.all([page.waitForFileChooser(), press('Elegir una foto')]);
  await again.accept([LABEL_PHOTO]);
  await shown('Pesa más');
  await page.screenshot({ path: `${SHOTS}checkpoint-8-report.png` });
  await press('Enviar precio');
  await shown('¡Gracias!');
  await shown('Tu precio ya llegó. Ayuda a que otros paguen menos.');
  const [mine] = await serverContributions(NEW_ACCOUNT);
  if (!mine || mine.priceCents !== 96000 || !mine.hasPhotoEvidence || mine.storeName !== 'Coto Centro') {
    throw new Error(`the server has ${JSON.stringify(mine)}`);
  }
});
await step('Mis aportes lists it with where it stands', async () => {
  await press('Ver mis aportes');
  await shown('Mis aportes');
  await shown('Agua Mineral 2L');
  await text('Con foto');
  await page.screenshot({ path: `${SHOTS}checkpoint-8-contributions.png` });
  await press('Volver');
});
await step('a price reported offline waits, with its photo, and is sent on reconnecting', async () => {
  await press('Buscar');
  await pressContaining('Pan Lactal 500g');
  await press('Informar precio');
  await shown('¿En qué súper estás?');
  await shown('Coto Centro');
  await typeInto('Precio en góndola', '1.250');
  const [chooser] = await Promise.all([page.waitForFileChooser(), press('Elegir una foto')]);
  await chooser.accept([LABEL_PHOTO]);
  await shown('Pesa más');
  await page.setOfflineMode(true);
  await press('Enviar precio');
  await shown('¡Gracias!');
  await text('Tu precio se envía cuando vuelva la conexión');
  await page.screenshot({ path: `${SHOTS}checkpoint-8-offline.png` });
  await press('Ver mis aportes');
  await shown('Por enviar · con foto');
  await page.setOfflineMode(false);
  await gone('Por enviar · con foto');
  const mine = await serverContributions(NEW_ACCOUNT);
  const bread = mine.find((row) => row.productName === 'Pan Lactal 500g');
  if (!bread || bread.priceCents !== 125000 || !bread.hasPhotoEvidence) {
    throw new Error(`the server has ${JSON.stringify(mine.map((r) => [r.productName, r.priceCents, r.hasPhotoEvidence]))}`);
  }
  await press('Volver');
});
await step('Inicio counts the prices reported', async () => {
  await press('Inicio');
  await shown('2 precios informados o de tus compras');
});

// --- Checkpoint 13: what shoppers add to the catalog -----------------------
// Still the throwaway account. Names carry the run, since a product or chain
// is shared by everyone and a second run would otherwise be a duplicate.

const RUN = String(Date.now()).slice(-6);
const NEW_PRODUCT = `Alfajor Santafesino ${RUN}`;
const OFFLINE_PRODUCT = `Pastafrola de Membrillo ${RUN}`;
const NEW_CHAIN = `Almacén Prueba ${RUN}`;

await step('a search with no match offers to add it, and shows what is already there first', async () => {
  // Buscar still has the bread open from the offline report.
  await press('Buscar');
  await shown('Pan Lactal 500g');
  await press('Volver');
  await typeInto('Buscar productos', NEW_PRODUCT);
  await text(`No encontramos productos para “${NEW_PRODUCT}”.`);
  await press('No lo encuentro — agregarlo');
  await shown('Agregar producto');
  await typeInto('Nombre', 'Alfajor');
  await shown('¿Es alguno de estos?');
  await shown('Alfajor Artesanal de Maicena');
});
await step('a product is added with a brand that is not listed, and opens marked "Sin verificar"', async () => {
  await typeInto('Nombre', NEW_PRODUCT);
  await press('Agregar producto');
  await text('Elegí una opción.');
  await typeInto('Marca', `Doña Prueba ${RUN}`);
  await text(`Usar “Doña Prueba ${RUN}” como marca nueva`);
  await press('Almacén');
  await typeInto('Tamaño', '70');
  await press('g');
  await press('Agregar producto');
  await shown('¡Agregado!');
  await press('Ver el producto');
  await shown(NEW_PRODUCT);
  await shown('Sin verificar');
  await text('Lo agregaste vos.');
  await page.screenshot({ path: `${SHOTS}checkpoint-13-product.png` });
});
await step('a neighbour\'s product can be confirmed, taken back and reported', async () => {
  await press('Volver');
  await typeInto('Buscar productos', 'alfajor artesanal');
  await pressContaining('Alfajor Artesanal de Maicena');
  await text('Lo agregó alguien de la comunidad.');
  await text('Todavía nadie lo confirmó.');
  await press('Existe y está bien');
  await text('1 persona confirmó que existe.');
  await press('Quitar mi confirmación');
  await text('Todavía nadie lo confirmó.');
  await press('Reportar');
  await shown('Reportar producto');
  await press('Los datos están mal');
  await press('Enviar reporte');
  await text('Gracias. Si otros también lo reportan, el equipo lo revisa.');
  await press('Cerrar');
  await shown('Lo reportaste');
  await press('Volver');
});
await step('a shop is added from Informar precio, seen only by its creator until priced', async () => {
  await typeInto('Buscar productos', 'pan lactal');
  await pressContaining('Pan Lactal 500g');
  await press('Informar precio');
  await press('¿No está tu súper? Agregalo');
  await shown('Agregar tienda');
  await press('Otra');
  await typeInto('Nombre de la cadena', NEW_CHAIN);
  await typeInto('Nombre de la tienda', `${NEW_CHAIN} Obelisco`);
  await typeInto('Dirección', 'Av. Corrientes 1000');
  await typeInto('Ciudad', 'Buenos Aires');
  await press('AR');
  await press('Agregar tienda');
  await shown('¡Tienda agregada!');
  await text('Faltan 10 productos con precio para que la vean todos.');
  await page.screenshot({ path: `${SHOTS}checkpoint-13-shop.png` });
  await press('Listo');
  await shown('¿En qué súper estás?');
  await text(`${NEW_CHAIN} Obelisco`);
  await text('faltan 10 productos');
  await press('Cerrar');
});
await step('a product added offline waits on the phone and is added on reconnecting', async () => {
  await press('Volver');
  await typeInto('Buscar productos', OFFLINE_PRODUCT);
  await text(`No encontramos productos para “${OFFLINE_PRODUCT}”.`);
  await page.setOfflineMode(true);
  await press('No lo encuentro — agregarlo');
  await shown('Agregar producto');
  await press('Almacén');
  await press('Agregar producto');
  await shown('Guardado en el teléfono');
  await press('Listo');
  await press('Inicio');
  await pressContaining('Mis aportes');
  await shown('Lo que agregaste');
  await shown('Por enviar');
  await page.setOfflineMode(false);
  await gone('Por enviar');
});
await step('Mis aportes lists what was added, with where each stands', async () => {
  await shown(OFFLINE_PRODUCT);
  await shown(NEW_PRODUCT);
  await text('La ven todos · Sin verificar');
  await shown(`${NEW_CHAIN} Obelisco`);
  await text('Solo vos la ves · faltan 10 productos');
  await page.screenshot({ path: `${SHOTS}checkpoint-13-mine.png` });
  await pressContaining(`${NEW_CHAIN} Obelisco`);
  await text('Cadena: ' + NEW_CHAIN);
  await text('La agregaste vos.');
  await press('Cerrar');
  await press('Volver');
});
await step('what the run added is hidden again by a moderator, so the catalog stays as seeded', async () => {
  const mine = await (
    await fetch(`${API_URL}/v1/community/mine`, { headers: { authorization: `Bearer ${await apiToken(NEW_ACCOUNT)}` } })
  ).json();
  const moderator = await apiToken({ email: 'moderator@garner.test', password: 'correct-horse-battery' });
  const hide = (target, id) =>
    fetch(`${API_URL}/v1/moderation/${target}/${id}/hide`, { method: 'POST', headers: { authorization: `Bearer ${moderator}` } });
  const answers = await Promise.all([
    ...mine.products.map((product) => hide('products', product.id)),
    ...mine.stores.map((store) => hide('stores', store.id)),
  ]);
  if (answers.length !== 3 || answers.some((answer) => answer.status !== 204)) {
    throw new Error(`hid ${answers.map((answer) => answer.status)}`);
  }
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
  await press('Volver');
});
await step('a new list in Vienna is in euros', async () => {
  await press('Listas');
  await press('Nueva lista');
  await shown('La de los súper cerca tuyo. No se puede cambiar después.');
  await typeInto('Nombre', 'Einkauf');
  await press('Crear lista');
  await typeInto('Agregar producto', 'leche');
  await press('Agregar Leche Entera La Serenísima 1L');
  await shown('Agregado: Leche Entera La Serenísima 1L.');
  await shown('€ 1,15');
  await page.screenshot({ path: `${SHOTS}vienna-list.png` });
  await press('Más opciones');
  await press('Eliminar la lista');
  await press('Sí, eliminar');
  await gone('Einkauf');
});
await step('in Vienna, the euro list is planned at the Vienna stores', async () => {
  await pressContaining('Compra en Viena');
  await press('¿Dónde conviene comprar?');
  await shown('Ahorrás');
  await press('Más barato');
  await pressContaining('Hofer Landstraße');
  await shown('Landstraßer Hauptstraße 70');
  await page.screenshot({ path: `${SHOTS}vienna-plan.png` });
});

// --- Checkpoint 11: the app in three languages ----------------------------

const reachLanguages = async (alerts, preferences) => {
  await press(alerts);
  await press(preferences);
};

await step('English: the whole app changes, prices are written the English way, and it survives a reload', async () => {
  await reachLanguages('Avisos', 'Preferencias de avisos');
  await shown('Idioma');
  await press('English');
  await text('Preferences');
  await press('Home');
  await text('Hi, Fede');
  await text('What are we buying today?');
  await text('€0.69');
  await page.screenshot({ path: `${SHOTS}language-en-home.png` });
  // The web build keeps no session across a reload, so the sign-in screen is
  // the proof: it is still in English, which was only remembered.
  await page.reload({ waitUntil: 'networkidle0' });
  await text('Pay less for the same shop.');
  await typeInto('Email', 'shopper@garner.test');
  await typeInto('Password', 'correct-horse-battery');
  await press('Sign in');
  await text('Hi, Fede');
});
await step('German: dates, plurals and prices follow', async () => {
  await reachLanguages('Alerts', 'Alert preferences');
  await shown('Language');
  await press('Deutsch');
  await text('Einstellungen');
  await press('Start');
  await text('Hallo, Fede');
  await text('Was kaufen wir heute?');
  await text('0,69\u00a0€');
  await page.screenshot({ path: `${SHOTS}language-de-home.png` });
});
await step('Español comes back, and a signed-out phone can pick a language too', async () => {
  // The Hinweise tab remembers it was on its preferences screen.
  await press('Hinweise');
  await shown('Sprache');
  await press('Español');
  await text('Preferencias');
  await press('Inicio');
  await text('Hola, Fede');
  await press('Cerrar sesión');
  await text('Pagá menos por la misma compra.');
  await press('English');
  await text('Pay less for the same shop.');
  await press('Español');
  await text('Pagá menos por la misma compra.');
});

await browser.close();

if (errors.length > 0) {
  console.log(`\nErrors in the page:\n${errors.join('\n')}`);
}
process.exit(failed || errors.length > 0 ? 1 : 0);
