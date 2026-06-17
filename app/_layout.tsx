import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Platform,
  Alert,
} from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import 'react-native-reanimated';

import { useColorScheme, ThemeProvider } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { LanguageProvider, useLanguage } from '@/hooks/LanguageContext';
import LanguageSelectScreen from '@/app/language-select';

export const unstable_settings = {
  initialRouteName: 'index',
};

// Pure client-side internet check utility supporting native and web
const checkInternet = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return navigator.onLine;
  }
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3500); // Fail fast
    
    const response = await fetch('https://clients3.google.com/generate_204', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
      signal: controller.signal,
    });
    
    clearTimeout(id);
    return response.status === 204 || response.ok;
  } catch (e) {
    return false;
  }
};

function AppContent() {
  const colorScheme = useColorScheme();
  const [isConnected, setIsConnected] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const { hasSelectedLanguage } = useLanguage();

  const performCheck = async () => {
    const online = await checkInternet();
    setIsConnected(online);
  };

  useEffect(() => {
    // Run check on start
    performCheck();

    // Check periodically (every 5 seconds)
    const interval = setInterval(() => {
      performCheck();
    }, 5000);

    // Recheck on return from background
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        performCheck();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  const handleRetry = async () => {
    setIsChecking(true);
    const online = await checkInternet();
    setIsConnected(online);
    setIsChecking(false);
    if (!online) {
      Alert.alert('Still Offline', 'Could not establish connection. Please check your data settings.');
    }
  };

  // Show first-launch language selector
  if (!hasSelectedLanguage) {
    return <LanguageSelectScreen />;
  }
  
  // Custom navigation theme with background color matched to theme
  const activeNavigationTheme = {
    ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colorScheme === 'dark' ? '#171717' : '#FFFFFF',
    },
  };

  const bgColor = colorScheme === 'dark' ? '#171717' : '#FFFFFF';

  const screenOpts = {
    headerShown: false,
    animation: 'default' as const,
    contentStyle: { backgroundColor: bgColor },
    cardStyle: { backgroundColor: bgColor },
  };

  if (!isConnected) {
    const theme = Colors[colorScheme ?? 'light'];
    const tintColor = colorScheme === 'dark' ? '#818CF8' : '#6366F1';

    return (
      <SafeAreaView style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <View style={styles.errorContent}>
          <View style={[styles.iconContainer, { backgroundColor: colorScheme === 'dark' ? 'rgba(99,102,241,0.12)' : '#EEF2FF' }]}>
            <WifiOff size={48} color={tintColor} />
          </View>
          <Text style={[styles.errorTitle, { color: theme.text }]}>No Internet Connection</Text>
          <Text style={[styles.errorDescription, { color: colorScheme === 'dark' ? '#94A3B8' : '#64748B' }]}>
            Document Reader requires an active internet connection to run. Please connect to Wi-Fi or mobile data and try again.
          </Text>
          
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: tintColor }]} 
            onPress={handleRetry}
            disabled={isChecking}
            activeOpacity={0.8}
          >
            {isChecking ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.retryButtonText}>Retry Connection</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <NavigationThemeProvider value={activeNavigationTheme}>
      <Stack screenOptions={screenOpts}>
        <Stack.Screen name="index" />
        <Stack.Screen name="category/[id]" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="settings-detail" />
        <Stack.Screen name="language-select" />
        <Stack.Screen name="tools/notepad" />
        <Stack.Screen name="tools/fancy-fonts" />
        <Stack.Screen name="tools/link-shortener" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true, title: 'Settings', animation: 'slide_from_bottom' as const }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 32,
  },
  retryButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
