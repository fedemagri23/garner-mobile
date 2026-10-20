import AsyncStorage from '@react-native-async-storage/async-storage';

import { isLanguage, type LanguageChoice } from './languages';

const KEY = 'garner.language';

/** The language the shopper picked, or 'system' when they never did. */
export async function loadLanguageChoice(): Promise<LanguageChoice> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    return isLanguage(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export async function saveLanguageChoice(choice: LanguageChoice): Promise<void> {
  try {
    if (choice === 'system') {
      await AsyncStorage.removeItem(KEY);
    } else {
      await AsyncStorage.setItem(KEY, choice);
    }
  } catch {
    // The choice then lasts until the app closes, which is better than failing.
  }
}
