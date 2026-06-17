import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, Info, HelpCircle, ChevronRight, ExternalLink, Paintbrush } from 'lucide-react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];

  const settingsOptions = [
    {
      title: 'App Theme',
      icon: Paintbrush,
      iconColor: '#8B5CF6',
      bgColor: isDark ? '#2E2F5E' : '#F5F3FF',
      type: 'theme',
    },
    {
      title: 'Privacy Policy',
      icon: Shield,
      iconColor: '#10B981',
      bgColor: isDark ? '#064E3B' : '#ECFDF5',
      type: 'privacy',
    },
    {
      title: 'About Us',
      icon: Info,
      iconColor: '#3B82F6',
      bgColor: isDark ? '#1E3A8A' : '#EFF6FF',
      type: 'about',
    },
    {
      title: 'How to Use',
      icon: HelpCircle,
      iconColor: '#F59E0B',
      bgColor: isDark ? '#78350F' : '#FFFBEB',
      type: 'guide',
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {settingsOptions.map((option, index) => {
            const Icon = option.icon;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/settings-detail', params: { type: option.type } })}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: option.bgColor }]}>
                      <Icon size={20} color={option.iconColor} />
                    </View>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{option.title}</Text>
                  </View>
                  <ChevronRight size={18} color="#94A3B8" />
                </View>
              </TouchableOpacity>
            );
          })}

          {/* More Apps Card */}
          <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
            activeOpacity={0.7}
            onPress={() => Linking.openURL('https://play.google.com/store/apps/dev?id=7432863622452873946')}
          >
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <View style={[styles.iconWrapper, { backgroundColor: isDark ? '#2E2F5E' : '#F5F3FF' }]}>
                  <ExternalLink size={20} color="#8B5CF6" />
                </View>
                <Text style={[styles.cardTitle, { color: theme.text }]}>More Apps</Text>
              </View>
              <ExternalLink size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
});
