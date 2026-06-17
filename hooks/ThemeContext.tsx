import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themePreference: ThemePreference;
  theme: 'light' | 'dark';
  setThemePreference: (pref: ThemePreference) => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextType>({
  themePreference: 'system',
  theme: 'light',
  setThemePreference: async () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const rnColorScheme = useRNColorScheme();
  const [themePreference, setThemePrefState] = useState<ThemePreference>('system');

  useEffect(() => {
    // Load persisted preference
    AsyncStorage.getItem('@app_theme_preference').then((val) => {
      if (val) {
        setThemePrefState(val as ThemePreference);
      }
    });
  }, []);

  const activeTheme =
    themePreference === 'system'
      ? (rnColorScheme === 'dark' ? 'dark' : 'light')
      : themePreference;

  useEffect(() => {
    const bgColor = activeTheme === 'dark' ? '#171717' : '#FFFFFF';
    SystemUI.setBackgroundColorAsync(bgColor).catch((e) => {
      console.warn('SystemUI setBackgroundColorAsync failed:', e);
    });

  }, [activeTheme]);

  const setThemePreference = async (pref: ThemePreference) => {
    setThemePrefState(pref);
    await AsyncStorage.setItem('@app_theme_preference', pref);
  };

  return (
    <ThemeContext.Provider value={{ themePreference, theme: activeTheme, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
