import { routeFor } from '../push';

describe('routeFor', () => {
  it('opens the product a notification is about', () => {
    expect(routeFor({ productId: 'milk', notificationId: 'n1' })).toBe('/inbox/product/milk');
  });

  it('falls back to the inbox without a product', () => {
    expect(routeFor(undefined)).toBe('/inbox');
    expect(routeFor({ test: '1' })).toBe('/inbox');
    expect(routeFor({ productId: 7 })).toBe('/inbox');
    expect(routeFor({ productId: '' })).toBe('/inbox');
  });
});
