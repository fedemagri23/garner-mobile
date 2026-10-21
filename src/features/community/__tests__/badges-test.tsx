import { render, screen } from '@testing-library/react-native';

import { OriginBadge } from '../badges';
import { ProgressCard } from '../progress-card';

describe('OriginBadge', () => {
  it('marks a community entry as not yet checked', async () => {
    await render(<OriginBadge origin="COMMUNITY" />);
    expect(screen.getByText('Sin verificar')).toBeTruthy();
  });

  it('says nothing about the team’s own entries in a list', async () => {
    await render(<OriginBadge origin="VERIFIED" />);
    expect(screen.queryByText('Verificado')).toBeNull();
  });

  it('shows the tick on a screen about that one entry', async () => {
    await render(<OriginBadge origin="VERIFIED" showVerified />);
    expect(screen.getByText('Verificado')).toBeTruthy();
  });
});

describe('ProgressCard', () => {
  it('says how many products are still to price', async () => {
    await render(<ProgressCard priced={3} needed={10} />);
    expect(screen.getByText('Faltan 7 productos con precio para que la vean todos.')).toBeTruthy();
    expect(screen.getByText('3 de 10')).toBeTruthy();
  });

  it('uses the singular for the last one', async () => {
    await render(<ProgressCard priced={9} needed={10} />);
    expect(screen.getByText('Falta 1 producto con precio para que la vean todos.')).toBeTruthy();
  });
});
