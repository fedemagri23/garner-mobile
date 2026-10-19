/**
 * Walks the app the way a person would, in a real browser against the real
 * backend: every checkpoint's manual check (docs/checkpoints.md), automated.
 *
 * Needs, already running:
 *   - the backend on :3000, seeded, with CORS_ORIGINS=http://localhost:8081
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
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });

const errors = [];
page.on('pageerror', (error) => errors.push(`page error: ${error.message}`));
page.on('console', (message) => {
  // The checks provoke refusals on purpose (wrong password, taken email,
  // short password); the browser logs each 4xx. Anything else is a failure.
  const expectedRefusal = /status of 4\d\d/.test(message.text());
  if (message.type() === 'error' && !expectedRefusal) {
    errors.push(message.text());
  }
});

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
for (const [tab, wanted] of [
  ['Buscar', 'Buscá productos'],
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

await browser.close();

if (errors.length > 0) {
  console.log(`\nErrors in the page:\n${errors.join('\n')}`);
}
process.exit(failed || errors.length > 0 ? 1 : 0);
