/**
 * AsyncStorage is a native module, and there is none under Jest. Its own
 * in-memory mock stands in for it in every test, so anything that reaches the
 * outbox's storage — the session provider, for one — loads.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/**
 * Icon sets load their font file when they render; under Jest there is no
 * font to load (jest-expo 58 no longer stubs it). A plain stand-in, named by
 * its icon, keeps screens rendering in tests.
 */
const iconStandIn = () => {
  const { Text } = jest.requireActual('react-native');
  const Icon = ({ name }: { name: string }) => jest.requireActual('react').createElement(Text, null, name);
  return Object.assign(Icon, { glyphMap: {} });
};
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: iconStandIn() }));
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => ({ __esModule: true, default: iconStandIn() }));
