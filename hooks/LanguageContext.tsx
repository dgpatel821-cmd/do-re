import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRANSLATIONS } from '@/utils/translations';

const LANGUAGE_KEY = '@app_language';
const LANGUAGE_SELECTED_KEY = '@app_language_selected';

interface LanguageContextType {
  languageCode: string;
  hasSelectedLanguage: boolean;
  setLanguage: (code: string) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  languageCode: 'en',
  hasSelectedLanguage: false,
  setLanguage: async () => {},
  t: (key: string) => key,
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [languageCode, setLanguageCode] = useState('en');
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [savedLang, savedSelected] = await Promise.all([
        AsyncStorage.getItem(LANGUAGE_KEY),
        AsyncStorage.getItem(LANGUAGE_SELECTED_KEY),
      ]);
      if (savedLang) setLanguageCode(savedLang);
      if (savedSelected === 'true') setHasSelectedLanguage(true);
      setLoaded(true);
    })();
  }, []);

  const setLanguage = async (code: string) => {
    setLanguageCode(code);
    setHasSelectedLanguage(true);
    await AsyncStorage.setItem(LANGUAGE_KEY, code);
    await AsyncStorage.setItem(LANGUAGE_SELECTED_KEY, 'true');
  };

  const t = (key: string): string => {
    const dict = TRANSLATIONS[languageCode] ?? TRANSLATIONS['en'];
    return dict[key] ?? TRANSLATIONS['en'][key] ?? key;
  };

  if (!loaded) return null;

  return (
    <LanguageContext.Provider value={{ languageCode, hasSelectedLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
