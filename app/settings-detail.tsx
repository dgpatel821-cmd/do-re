import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Shield, Info, HelpCircle, Check, Sun, Paintbrush, Moon } from 'lucide-react-native';
import { useAppTheme, useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

export default function SettingsDetailScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  
  const { themePreference, setThemePreference } = useAppTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];

  // Determine Title based on setting type
  const getHeaderTitle = () => {
    switch (type) {
      case 'theme':
        return 'App Theme';
      case 'privacy':
        return 'Privacy Policy';
      case 'about':
        return 'About Us';
      case 'guide':
        return 'How to Use';
      default:
        return 'Details';
    }
  };

  const renderContent = () => {
    switch (type) {
      case 'theme':
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Choose Theme</Text>
            <Text style={[styles.description, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Select your preferred appearance for Document Reader. System option will automatically sync with your device settings.
            </Text>
            
            <View style={styles.themeOptionsContainer}>
              {([
                { id: 'system', label: 'System Default', icon: HelpCircle, iconBg: isDark ? '#2E2F5E' : '#F5F3FF', iconColor: '#8B5CF6' },
                { id: 'light', label: 'Light Mode', icon: Sun, iconBg: '#FFFBEB', iconColor: '#F59E0B' },
                { id: 'dark', label: 'Dark Mode', icon: Moon, iconBg: '#EEF2FF', iconColor: '#6366F1' },
              ] as const).map((pref) => {
                const isActive = themePreference === pref.id;
                const IconComponent = pref.icon;
                
                return (
                  <TouchableOpacity
                    key={pref.id}
                    style={[
                      styles.themeCard,
                      {
                        backgroundColor: theme.card,
                        borderColor: isActive ? '#6366F1' : theme.border,
                      },
                      isActive && styles.themeCardActive
                    ]}
                    onPress={() => {
                      setThemePreference(pref.id);
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.themeCardLeft}>
                      <View style={[styles.iconWrapper, { backgroundColor: pref.iconBg }]}>
                        <IconComponent size={20} color={pref.iconColor} />
                      </View>
                      <Text style={[styles.themeCardLabel, { color: theme.text }]}>{pref.label}</Text>
                    </View>
                    {isActive ? (
                      <View style={styles.checkActive}>
                        <Check size={14} color="#FFFFFF" />
                      </View>
                    ) : (
                      <View style={[styles.checkInactive, { borderColor: theme.border }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 'privacy':
        return (
          <View style={styles.section}>
            <Text style={[styles.paragraph, { color: isDark ? '#E2E8F0' : '#475569' }]}>
              At <Text style={[styles.bold, { color: theme.text }]}>Document Reader</Text>, we value your privacy. We do not collect, store, or share any of your personal data, files, images, or financial calculations.
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#E2E8F0' : '#475569' }]}>
              All processing (such as image compression, image format conversion, PDF generation, password encryption, decryption, size compression, tax calculations, and secure keys generation) is performed entirely locally on your device. Your data never leaves your phone.
            </Text>


            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            
            <Text style={[styles.subTitle, { color: theme.text }]}>Required Permissions</Text>
            
            <View style={styles.permissionItem}>
              <Text style={[styles.permissionTitle, { color: theme.text }]}>📸 Media Library / Storage</Text>
              <Text style={[styles.permissionText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Used to select photos for compression or PDF conversion, and to save the final generated output directly into your gallery.
              </Text>
            </View>
            
            <View style={styles.permissionItem}>
              <Text style={[styles.permissionTitle, { color: theme.text }]}>📂 Document Access</Text>
              <Text style={[styles.permissionText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Required to select PDF files from your storage when performing conversions.
              </Text>
            </View>
          </View>
        );

      case 'about':
        return (
          <View style={styles.section}>
            <Text style={[styles.paragraph, { color: isDark ? '#E2E8F0' : '#475569' }]}>
              <Text style={[styles.bold, { color: theme.text }]}>Document Reader: PDF, DOC, IMG</Text> is a premium all-in-one utility toolkit designed to make your daily tasks simpler, faster, and more secure.
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#E2E8F0' : '#475569' }]}>
              Built with a focus on speed, native responsiveness, and modern aesthetics, it provides clean productivity tools right at your fingertips.
            </Text>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Version</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>1.0.0 (Release)</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Developer</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>United Pearl</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Support Email</Text>
              <Text 
                style={[styles.infoValue, { color: '#3B82F6', textDecorationLine: 'underline' }]} 
                onPress={() => Linking.openURL('mailto:gadhiyadarshit12@gmail.com')}
              >
                gadhiyadarshit12@gmail.com
              </Text>
            </View>
          </View>
        );

      case 'guide':
        return (
          <View style={styles.section}>
            <View style={styles.guideItem}>
              <Text style={[styles.guideTitle, { color: theme.text }]}>📂 PDF Tools</Text>
              <Text style={[styles.guideText, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                Convert multiple gallery images into a single high-quality PDF, extract pages from PDFs back into separate images, or scan live photos directly into documents.
              </Text>
            </View>

            <View style={styles.guideItem}>
              <Text style={[styles.guideTitle, { color: theme.text }]}>🔒 PDF Lock & Unlock</Text>
              <Text style={[styles.guideText, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                Secure your sensitive files with strong password encryption, or decrypt locked documents quickly when credentials are no longer needed.
              </Text>
            </View>

            <View style={styles.guideItem}>
              <Text style={[styles.guideTitle, { color: theme.text }]}>🗜️ PDF Compress</Text>
              <Text style={[styles.guideText, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                Reduce PDF file size by choosing between Safe optimization (lossless metadata cleanup) or Maximum compression (lossy downsampling for up to 85% size reduction).
              </Text>
            </View>

            <View style={styles.guideItem}>
              <Text style={[styles.guideTitle, { color: theme.text }]}>🖼️ Image Compressor & Converter</Text>
              <Text style={[styles.guideText, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                Reduce image sizes by setting a target size slider, or convert images between JPEG, PNG, and WEBP formats seamlessly while setting custom compression ratios.
              </Text>
            </View>

            <View style={styles.guideItem}>
              <Text style={[styles.guideTitle, { color: theme.text }]}>📊 Finance Tools</Text>
              <Text style={[styles.guideText, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                Use the SIP or EMI calculator to calculate returns. Set loan amount, interest rates, and tenure to dynamically get your detailed monthly payments and total interest.
              </Text>
            </View>

            <View style={styles.guideItem}>
              <Text style={[styles.guideTitle, { color: theme.text }]}>💼 Business Tools</Text>
              <Text style={[styles.guideText, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                Generate barcodes on the fly, calculate split tax components using the GST calculator, or prepare complete professional business invoices easily.
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{getHeaderTitle()}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {renderContent()}
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
    padding: 24,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '700',
  },
  divider: {
    height: 1.5,
    marginVertical: 12,
  },
  themeOptionsContainer: {
    gap: 12,
  },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  themeCardActive: {
    borderWidth: 1.5,
  },
  themeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  themeCardLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkActive: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkInactive: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  permissionItem: {
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  permissionText: {
    fontSize: 13,
    lineHeight: 18,
    paddingLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  guideItem: {
    marginBottom: 20,
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  guideText: {
    fontSize: 13,
    lineHeight: 18,
    paddingLeft: 4,
  },
});
