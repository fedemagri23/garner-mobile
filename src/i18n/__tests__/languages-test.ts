import { resolveLanguage } from '../languages';

describe('resolveLanguage', () => {
  it('takes the first language the app speaks, in the phone\'s order', () => {
    expect(resolveLanguage(['de-AT', 'en-GB'])).toBe('de');
    expect(resolveLanguage(['fr-FR', 'en-US'])).toBe('en');
    expect(resolveLanguage(['es_AR'])).toBe('es');
  });

  it('falls back to Spanish when it speaks none of them', () => {
    expect(resolveLanguage(['fr', 'ja'])).toBe('es');
    expect(resolveLanguage([])).toBe('es');
    expect(resolveLanguage([null, undefined, ''])).toBe('es');
  });

  it('ignores case', () => {
    expect(resolveLanguage(['EN-us'])).toBe('en');
  });
});
