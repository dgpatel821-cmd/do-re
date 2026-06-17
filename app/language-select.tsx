import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LANGUAGES } from '@/utils/translations';
import { useLanguage } from '@/hooks/LanguageContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface Props {
  onDone?: () => void; // called after select when shown as first-launch screen
}

export default function LanguageSelectScreen({ onDone }: Props) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const { languageCode, setLanguage } = useLanguage();

  const [selected, setSelected] = useState(languageCode);
  const [query, setQuery] = useState('');

  const filtered = LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(query.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(query.toLowerCase())
  );

  const handleDone = async () => {
    await setLanguage(selected);
    if (onDone) {
      onDone();
    } else {
      router.back();
    }
  };

  const tintColor = '#10B981';
  const cardBg = isDark ? '#1C1C1C' : '#FFFFFF';
  const borderColor = isDark ? '#2D2D2D' : '#E5E7EB';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0A0A0A' : '#F0FDF4' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: tintColor }]}>✕</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Select Language</Text>
        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: tintColor }]}
          onPress={handleDone}
          activeOpacity={0.8}
        >
          <Check size={20} color="#FFF" strokeWidth={3} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: cardBg, borderColor }]}>
        <Search size={18} color={isDark ? '#6B7280' : '#9CA3AF'} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search language..."
          placeholderTextColor={isDark ? '#4B5563' : '#9CA3AF'}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={{ color: '#6B7280', fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Language List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isActive = selected === item.code;
          return (
            <TouchableOpacity
              style={[
                styles.langCard,
                {
                  backgroundColor: isActive ? tintColor : cardBg,
                  borderColor: isActive ? tintColor : borderColor,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => setSelected(item.code)}
            >
              <View style={styles.langTexts}>
                <Text
                  style={[
                    styles.langName,
                    { color: isActive ? '#FFFFFF' : theme.text },
                  ]}
                >
                  {item.name}
                </Text>
                <Text
                  style={[
                    styles.langNative,
                    { color: isActive ? 'rgba(255,255,255,0.8)' : isDark ? '#6B7280' : '#9CA3AF' },
                  ]}
                >
                  {item.nativeName}
                </Text>
              </View>
              {isActive && (
                <View style={styles.checkIcon}>
                  <Check size={18} color="#FFF" strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 20, fontWeight: '700' },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  doneBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  langTexts: { gap: 3 },
  langName: { fontSize: 16, fontWeight: '700' },
  langNative: { fontSize: 13, fontWeight: '500' },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
