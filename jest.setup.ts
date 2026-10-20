/**
 * AsyncStorage is a native module, and there is none under Jest. Its own
 * in-memory mock stands in for it in every test, so anything that reaches the
 * outbox's storage — the session provider, for one — loads.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
