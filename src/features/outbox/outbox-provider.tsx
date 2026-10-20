import { useQueryClient } from '@tanstack/react-query';
import { useNetworkState } from 'expo-network';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import type { Api } from '@/api/client';
import { currentTripKey, useRememberTrip } from '@/features/trip/trip-cache';
import { useSession } from '@/session/session-provider';

import { drain, enqueue, type Change, type SendResult } from './changes';
import { loadQueue, saveQueue } from './storage';

/** How often waiting changes are tried again while they wait. */
const RETRY_MS = 5_000;
/** How long "Todo enviado" stays up. */
const SYNCED_MS = 4_000;

interface OutboxValue {
  /** Changes waiting to be sent, oldest first. */
  queue: Change[];
  pending: number;
  /** Whether the server can be reached, as far as the phone and the last request say. */
  online: boolean;
  syncing: boolean;
  /** Everything waiting was just sent. */
  justSynced: boolean;
  /** Changes the server will never take, since the last time this was dismissed. */
  rejected: number;
  dismissRejected: () => void;
  add: (change: Change) => void;
  flush: () => Promise<void>;
}

const OutboxContext = createContext<OutboxValue | null>(null);

/** Sends one change. Never throws: what went wrong is the answer. */
async function send(api: Api, change: Change): Promise<SendResult> {
  try {
    const path = { params: { path: { id: change.tripId } } };
    const answer =
      change.kind === 'item'
        ? await api.PATCH('/v1/shopping-sessions/{id}/items/{itemId}', {
            params: { path: { id: change.tripId, itemId: change.itemId } },
            body: change.progress,
          })
        : change.action === 'pause'
          ? await api.POST('/v1/shopping-sessions/{id}/pause', path)
          : change.action === 'resume'
            ? await api.POST('/v1/shopping-sessions/{id}/resume', path)
            : change.action === 'complete'
              ? await api.POST('/v1/shopping-sessions/{id}/complete', path)
              : await api.POST('/v1/shopping-sessions/{id}/abandon', path);

    const { response, data } = answer;
    if (response.ok) {
      return { result: 'ok', trip: data };
    }
    // The server answered. A busy or limiting one is worth another try; one
    // that refuses (the trip is over, the line is gone) never will accept.
    return response.status === 401 || response.status === 408 || response.status === 429 || response.status >= 500
      ? { result: 'retry' }
      : { result: 'drop' };
  } catch {
    return { result: 'retry', unreachable: true };
  }
}

/**
 * Holds the changes made during a trip until the server has them.
 *
 * Every change goes on the queue first and is written to the phone, then
 * sent; so a dropped connection, a closed app or a dead battery lose nothing.
 * While anything waits it is retried every few seconds, when the phone says
 * it has a network again, and when the app comes back to the foreground.
 */
export function OutboxProvider({ children }: { children: ReactNode }) {
  const { api } = useSession();
  const queryClient = useQueryClient();
  const rememberTrip = useRememberTrip();
  const network = useNetworkState();

  const [queue, setQueue] = useState<Change[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [reachable, setReachable] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [rejected, setRejected] = useState(0);

  // The queue as of now, for code that runs between renders; and how many of
  // its first entries are being sent, which must not be merged into.
  const queueRef = useRef<Change[]>([]);
  const inFlight = useRef(0);
  const flushing = useRef(false);
  const writes = useRef<Promise<void>>(Promise.resolve());

  const commit = useCallback((next: Change[]) => {
    queueRef.current = next;
    setQueue(next);
    // One write at a time, in order, so an older queue never lands last.
    writes.current = writes.current.then(() => saveQueue(next));
  }, []);

  const flush = useCallback(async () => {
    if (flushing.current || queueRef.current.length === 0) {
      return;
    }
    flushing.current = true;
    setSyncing(true);

    const snapshot = queueRef.current;
    inFlight.current = snapshot.length;
    let unreachable = false;

    try {
      const outcome = await drain(snapshot, async (change) => {
        const result = await send(api, change);
        if (result.result === 'retry') {
          unreachable = result.unreachable ?? false;
        } else {
          setReachable(true);
          if (result.result === 'ok' && result.trip) {
            // Show what the server now says at once, under what still waits.
            await rememberTrip(result.trip);
          }
        }
        return result;
      });

      const done = new Set(snapshot.slice(0, snapshot.length - outcome.remaining.length).map((c) => c.id));
      // Changes made while this was sending sit after the snapshot; keep them.
      commit(queueRef.current.filter((change) => !done.has(change.id)));

      if (unreachable) setReachable(false);
      if (outcome.dropped.length > 0) setRejected((count) => count + outcome.dropped.length);
      if (outcome.remaining.length === 0 && outcome.sent > 0) {
        setJustSynced(true);
        // The server's own version of the trip replaces the local guess.
        await queryClient.invalidateQueries({ queryKey: currentTripKey });
      }
    } finally {
      inFlight.current = 0;
      flushing.current = false;
      setSyncing(false);
    }
  }, [api, commit, queryClient, rememberTrip]);

  const add = useCallback(
    (change: Change) => {
      commit(enqueue(queueRef.current, change, inFlight.current));
      void flush();
    },
    [commit, flush],
  );

  // What was left waiting when the app last closed.
  useEffect(() => {
    let cancelled = false;
    loadQueue().then((stored) => {
      if (cancelled) return;
      // Anything added before this finished stays after what was stored.
      commit([...stored, ...queueRef.current]);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [commit]);

  // Send what is waiting: once loaded, on a timer while anything waits, when
  // the network returns, and when the app comes to the front.
  useEffect(() => {
    if (!loaded) return;
    void flush();
    const timer = setInterval(() => void flush(), RETRY_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flush();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [loaded, flush]);

  const connected = network.isConnected;
  useEffect(() => {
    if (connected) void flush();
  }, [connected, flush]);

  useEffect(() => {
    if (!justSynced) return;
    const timer = setTimeout(() => setJustSynced(false), SYNCED_MS);
    return () => clearTimeout(timer);
  }, [justSynced]);

  const value = useMemo<OutboxValue>(
    () => ({
      queue,
      pending: queue.length,
      online: network.isConnected !== false && reachable,
      syncing,
      justSynced,
      rejected,
      dismissRejected: () => setRejected(0),
      add,
      flush,
    }),
    [queue, network.isConnected, reachable, syncing, justSynced, rejected, add, flush],
  );

  return <OutboxContext.Provider value={value}>{children}</OutboxContext.Provider>;
}

export function useOutbox(): OutboxValue {
  const value = useContext(OutboxContext);
  if (!value) {
    throw new Error('useOutbox must be used inside OutboxProvider');
  }
  return value;
}
