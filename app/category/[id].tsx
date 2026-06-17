import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ChevronRight, FileText, Image as ImageIcon, Briefcase, Sparkles, Lock, ArrowLeft, ExternalLink, Link } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

const iconMap: { [key: string]: any } = {
  'PDF Tools': FileText,
  'Image Tools': ImageIcon,
  'Business Tools': Briefcase,
  'Utility Tools': Lock,
  'Social Media Tools': Sparkles,
  'Finance Tools': Briefcase,
  'Link Tools': Link,
};

const toolsData: { [key: string]: { name: string; route: string; description: string }[] } = {
  'PDF Tools': [
    { name: 'Image to PDF', route: '/tools/image-to-pdf', description: 'Convert multiple images to a single PDF' },
    { name: 'PDF to Image', route: '/tools/pdf-to-image', description: 'Convert PDF pages back into high-quality images' },
    { name: 'Camera to PDF', route: '/tools/camera-to-pdf', description: 'Click live photos to generate a PDF directly' },
    { name: 'PDF Merge', route: '/tools/pdf-merge', description: 'Merge multiple PDF files into one' },
    { name: 'PDF Lock', route: '/tools/pdf-lock', description: 'Secure your PDF files with a password' },
    { name: 'PDF Unlock', route: '/tools/pdf-unlock', description: 'Remove password protection from your PDF files' },
    { name: 'PDF Compress', route: '/tools/pdf-compress', description: 'Reduce/Compress PDF file size' },
    { name: 'My Creations', route: '/tools/my-creations', description: 'View and manage all your generated PDFs' },
  ],
  'Image Tools': [
    { name: 'Image Compressor', route: '/tools/image-compressor', description: 'Reduce image file size without losing quality' },
    { name: 'Image to Text', route: '/tools/image-to-text', description: 'Scan and extract editable text from any image or photo' },
    { name: 'Image Converter', route: '/tools/image-converter', description: 'Convert images between PNG, JPG, and WEBP' },
  ],
  'Business Tools': [
    { name: 'GST Calculator', route: '/tools/gst-calculator', description: 'Calculate GST amounts instantly with tax breakdown' },
    { name: 'Barcode Generator', route: '/tools/barcode-generator', description: 'Generate and scan barcodes for business use' },
    { name: 'Invoice Maker', route: '/tools/invoice-maker', description: 'Create and share professional invoices for clients' },
  ],
  'Utility Tools': [
    { name: 'Password Generator', route: '/tools/password-generator', description: 'Create strong and secure passwords' },
    { name: 'QR Generator', route: '/tools/qr-generator', description: 'Generate QR codes for text, URLs, and more' },
  ],
  'Social Media Tools': [
    { name: 'Caption Generator', route: '/tools/caption-gen', description: 'Generate engaging captions for social media' },
    { name: 'Hashtag Generator', route: '/tools/hashtag-gen', description: 'Find trending hashtags for your posts' },
  ],
  'Finance Tools': [
    { name: 'EMI Calculator', route: '/tools/emi-calc', description: 'Calculate monthly loan installments easily' },
    { name: 'SIP Calculator', description: 'Estimate returns on your SIP investments', route: '/tools/sip-calc' },
  ],
  'Link Tools': [
    { name: 'Link Shortener', route: '/tools/link-shortener', description: 'Shorten long URLs instantly' },
  ],
};

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];

  const categoryName = id as string;
  const tools = toolsData[categoryName] || [];
  const Icon = iconMap[categoryName] || FileText;

  const iconColor = isDark ? '#818CF8' : '#6366F1';
  const iconBg = isDark ? '#2E2F5E' : '#F1F5F9';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{categoryName}</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Category Info */}
          <View style={styles.infoSection}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
              <Icon size={32} color={iconColor} />
            </View>
            <Text style={styles.toolsCount}>{tools.length} Tools Available</Text>
          </View>

          {/* Tools List */}
          <View style={styles.toolsSection}>
            {tools.map((tool, index) => {
              const isExternal = tool.name === 'Invoice Maker';
              const externalLink = 'https://www.google.com'; // Placeholder link

              if (isExternal) {
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.toolCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    activeOpacity={0.7}
                    onPress={() => WebBrowser.openBrowserAsync(externalLink)}
                  >
                    <View style={styles.toolInfo}>
                      <Text style={[styles.toolName, { color: theme.text }]}>{tool.name}</Text>
                      <Text style={styles.toolDescription}>{tool.description}</Text>
                    </View>
                    <ExternalLink size={16} color="#6366F1" style={styles.arrowWrapper} />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.toolCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  activeOpacity={0.7}
                  onPress={() => router.push(tool.route as any)}
                >
                  <View style={styles.toolInfo}>
                    <Text style={[styles.toolName, { color: theme.text }]}>{tool.name}</Text>
                    <Text style={styles.toolDescription}>{tool.description}</Text>
                  </View>
                  <View style={styles.arrowWrapper}>
                    <ChevronRight size={18} color={theme.icon} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          
          {tools.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No tools found in this category.</Text>
            </View>
          )}
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
    color: '#0F172A',
  },
  scrollContent: {
    padding: 24,
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  toolsCount: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  toolsSection: {
    gap: 12,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  toolInfo: {
    flex: 1,
  },
  toolName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  arrowWrapper: {
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  externalLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    gap: 6,
  },
  externalLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366F1',
    textDecorationLine: 'underline',
  },
});
