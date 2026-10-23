import { catalogs } from '../catalog';

type Tree = { [key: string]: string | Tree };

/** Every leaf as "path.to.key" → text. */
function leaves(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((all, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? { ...all, [path]: value } : { ...all, ...leaves(value, path) };
  }, {});
}

const placeholders = (text: string) => [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1]).sort();

const spanish = leaves(catalogs.es as unknown as Tree);

describe.each(['en', 'de', 'pt'] as const)('the %s catalog', (language) => {
  const other = leaves(catalogs[language] as unknown as Tree);

  it('has every phrase the Spanish one has, and no others', () => {
    expect(Object.keys(other).sort()).toEqual(Object.keys(spanish).sort());
  });

  it('fills every phrase with text', () => {
    for (const [key, text] of Object.entries(other)) {
      expect({ key, empty: text.trim() === '' }).toEqual({ key, empty: false });
    }
  });

  it('uses the same {{placeholders}} as the Spanish phrase, so no value is dropped', () => {
    for (const [key, text] of Object.entries(other)) {
      // A plural may drop {{count}} from its singular ("1 producto"); every other placeholder must stay.
      const wanted = placeholders(spanish[key]).filter((name) => !(name === 'count' && /_one$/.test(key)));
      const got = placeholders(text).filter((name) => !(name === 'count' && /_one$/.test(key)));
      expect({ key, got }).toEqual({ key, got: wanted });
    }
  });
});

describe('plural phrases', () => {
  it('come in pairs in every language', () => {
    for (const language of ['es', 'en', 'de', 'pt'] as const) {
      const keys = Object.keys(leaves(catalogs[language] as unknown as Tree));
      for (const key of keys.filter((name) => name.endsWith('_one'))) {
        expect(keys).toContain(key.replace(/_one$/, '_other'));
      }
    }
  });
});
