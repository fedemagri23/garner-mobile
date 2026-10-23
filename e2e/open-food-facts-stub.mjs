/**
 * Stands in for Open Food Facts during the web walk-through, so it needs no
 * internet: start the backend with OPEN_FOOD_FACTS_URL=http://localhost:3999.
 *
 * Any code starting with "20" (in-store codes, never real products) is a
 * chocolate alfajor whose name carries digits of the code — so every run's
 * product is new and never a duplicate of an earlier run's. Anything else is
 * not found.
 */
import { createServer } from 'node:http';

export const STUB_PORT = 3999;

export function startOpenFoodFactsStub() {
  const server = createServer((req, res) => {
    const code = /\/api\/v2\/product\/(\d+)\.json/.exec(req.url ?? '')?.[1] ?? '';
    res.setHeader('content-type', 'application/json');
    if (code.startsWith('20')) {
      res.end(
        JSON.stringify({
          status: 1,
          product: {
            product_name: `Alfajor Triple de Chocolate ${code.slice(2, 8)}`,
            brands: 'Havanna',
            quantity: '70 g',
            categories_tags: ['en:snacks', 'en:sweet-snacks'],
          },
        }),
      );
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ status: 0 }));
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(STUB_PORT, '127.0.0.1', () => resolve(server));
  });
}

/** A valid EAN-13 from its first twelve digits. */
export const ean13 = (first12) => {
  const sum = [...first12].reduce((total, digit, i) => total + Number(digit) * (i % 2 === 0 ? 1 : 3), 0);
  return `${first12}${(10 - (sum % 10)) % 10}`;
};
