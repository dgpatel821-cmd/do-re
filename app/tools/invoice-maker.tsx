import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, FileText } from 'lucide-react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.dgpatel.tictactoewebapp&pcampaignid=web_share';

export default function ToolScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const tintColor = '#F43F5E'; // Rose color for Invoice Maker

  const handleOpenLink = () => {
    Linking.openURL(PLAY_STORE_URL).catch((err) =>
      console.error('Failed to open link', err)
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Invoice Maker</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(244, 63, 94, 0.12)' }]}>
              <FileText size={36} color={tintColor} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Invoice Maker</Text>
            <Text style={styles.subtitle}>
              Create and manage professional invoices easily.
            </Text>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: tintColor }]}
              onPress={handleOpenLink}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>Create Invoice</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  card: {
    width: '100%',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  actionButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  actionButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
