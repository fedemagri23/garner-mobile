import { render, screen } from '@testing-library/react-native';

import { CurrencyPicker } from '../currency-picker';

describe('CurrencyPicker', () => {
  it('preselects the local currency and says where it comes from', async () => {
    await render(<CurrencyPicker value="EUR" local="EUR" looking={false} onChange={() => undefined} />);

    expect(screen.getByRole('button', { name: 'Euros (EUR)', selected: true })).toBeTruthy();
    expect(screen.getByText(/La de los súper cerca tuyo/)).toBeTruthy();
  });

  it('selects nothing when the local currency is unknown, and asks', async () => {
    await render(<CurrencyPicker value={null} local={null} looking={false} onChange={() => undefined} />);

    expect(screen.queryByRole('button', { selected: true })).toBeNull();
    expect(screen.getByText(/Elegí la moneda/)).toBeTruthy();
  });

  it('says it is still looking', async () => {
    await render(<CurrencyPicker value={null} local={null} looking onChange={() => undefined} />);

    expect(screen.getByText(/Buscando la moneda/)).toBeTruthy();
  });
});
