import { useState } from 'react';

import { Screen } from '@/components/screen';
import { StateMessage } from '@/components/state-message';
import type { Trip } from '@/features/trip/stops';
import { StartTrip } from '@/features/trip/start-trip';
import { TripSummary } from '@/features/trip/trip-summary';
import { TripView } from '@/features/trip/trip-view';
import { useCurrentTrip } from '@/features/trip/use-trip';
import { errorMessage } from '@/lib/error-message';

/** Compra: the trip under way, how the last one went, or a way to start one. */
export default function ShopScreen() {
  const current = useCurrentTrip();
  const [finished, setFinished] = useState<Trip | null>(null);

  if (finished) {
    return <TripSummary trip={finished} onDone={() => setFinished(null)} />;
  }
  if (current.isPending) {
    return (
      <Screen>
        <StateMessage loading />
      </Screen>
    );
  }
  if (current.isError) {
    return (
      <Screen>
        <StateMessage tone="danger" message={errorMessage(current.error)} />
      </Screen>
    );
  }
  if (!current.data) {
    return <StartTrip />;
  }
  return <TripView key={current.data.id} trip={current.data} onCompleted={setFinished} />;
}
