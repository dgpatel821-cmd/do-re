import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  FlatList,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  FileText,
  Image as ImageIcon,
  Briefcase,
  Sparkles,
  Settings,
  Link as LinkIcon,
  Pen,
  Sliders,
  Type,
  Percent,
  QrCode,
  Key,
  Download,
  User,
  Camera,
  Archive,
  Folder,
  Barcode,
  Hash,
  Lock,
  Unlock,
  Minimize2,
  RefreshCw,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

const { width } = Dimensions.get('window');
const GRID_SPACING = 18;
const ITEM_WIDTH = (width - 40 - (GRID_SPACING * 2)) / 3;

interface ToolItem {
  id: string;
  name: string;
  route: string;
  category: string;
  icon: any;
  color: string;
  desc: string;
}

const ALL_TOOLS: ToolItem[] = [
  // PDF Tools
  { id: 'img-to-pdf', name: 'Image to PDF', route: '/tools/image-to-pdf', category: 'PDF', icon: ImageIcon, color: '#EF4444', desc: 'Photos to PDF' },
  { id: 'pdf-to-img', name: 'PDF to Image', route: '/tools/pdf-to-image', category: 'PDF', icon: FileText, color: '#3B82F6', desc: 'Pages to JPEG' },
  { id: 'cam-to-pdf', name: 'Camera to PDF', route: '/tools/camera-to-pdf', category: 'PDF', icon: Camera, color: '#22C55E', desc: 'Scan to PDF' },
  { id: 'pdf-merge', name: 'PDF Merge', route: '/tools/pdf-merge', category: 'PDF', icon: Archive, color: '#F97316', desc: 'Merge PDFs' },
  { id: 'pdf-lock', name: 'PDF Lock', route: '/tools/pdf-lock', category: 'PDF', icon: Lock, color: '#06B6D4', desc: 'Password protect' },
  { id: 'pdf-unlock', name: 'PDF Unlock', route: '/tools/pdf-unlock', category: 'PDF', icon: Unlock, color: '#10B981', desc: 'Remove password' },
  { id: 'pdf-compress', name: 'PDF Compress', route: '/tools/pdf-compress', category: 'PDF', icon: Minimize2, color: '#84CC16', desc: 'Reduce size' },
  { id: 'pdf-creations', name: 'My Creations', route: '/tools/my-creations', category: 'PDF', icon: Folder, color: '#EC4899', desc: 'Saved PDFs' },
  
  // Image Tools
  { id: 'img-compress', name: 'Image Compress', route: '/tools/image-compressor', category: 'Image', icon: Sliders, color: '#EAB308', desc: 'Reduce KB' },
  { id: 'img-to-txt', name: 'Image to Text', route: '/tools/image-to-text', category: 'Image', icon: Type, color: '#06B6D4', desc: 'Extract Text' },
  { id: 'img-convert', name: 'Image Convert', route: '/tools/image-converter', category: 'Image', icon: RefreshCw, color: '#3B82F6', desc: 'PNG/JPG/WEBP' },
  
  // Business Tools
  { id: 'gst-calc', name: 'GST Calc', route: '/tools/gst-calculator', category: 'Business', icon: Percent, color: '#EC4899', desc: 'Tax calculator' },
  { id: 'barcode-gen', name: 'Barcode Gen', route: '/tools/barcode-generator', category: 'Business', icon: Barcode, color: '#84CC16', desc: 'Create Barcodes' },
  { id: 'invoice-maker', name: 'Invoice Maker', route: '/tools/invoice-maker', category: 'Business', icon: Briefcase, color: '#F43F5E', desc: 'Create Invoices' },
  
  // Utility Tools
  { id: 'pass-gen', name: 'Password Gen', route: '/tools/password-generator', category: 'Utility', icon: Key, color: '#14B8A6', desc: 'Secure keys' },
  { id: 'qr-gen', name: 'QR Generator', route: '/tools/qr-generator', category: 'Utility', icon: QrCode, color: '#EA580C', desc: 'Create QR' },
  { id: 'notepad', name: 'Notepad Notes', route: '/tools/notepad', category: 'Utility', icon: Pen, color: '#16A34A', desc: 'Take Notes' },
  
  // Social Media Tools
  { id: 'ai-rewriter', name: 'AI Rewriter', route: '/tools/ai-rewriter', category: 'Social', icon: Sparkles, color: '#2563EB', desc: 'AI text rewrite' },
  { id: 'caption-gen', name: 'Caption Gen', route: '/tools/caption-gen', category: 'Social', icon: Type, color: '#0891B2', desc: 'Post captions' },
  { id: 'hashtag-gen', name: 'Hashtag Gen', route: '/tools/hashtag-gen', category: 'Social', icon: Hash, color: '#7C3AED', desc: 'Viral hashtags' },
  { id: 'fancy-font', name: 'Fancy Fonts', route: '/tools/fancy-fonts', category: 'Social', icon: Type, color: '#D97706', desc: 'Fancy texts' },
  
  // Finance Tools
  { id: 'emi-calc', name: 'EMI Calculator', route: '/tools/emi-calc', category: 'Finance', icon: Percent, color: '#65A30D', desc: 'Loan EMIs' },
  { id: 'sip-calc', name: 'SIP Calculator', route: '/tools/sip-calc', category: 'Finance', icon: Sliders, color: '#DC2626', desc: 'SIP returns' },
  
  // Link Tools
  { id: 'link-short', name: 'Link Shortener', route: '/tools/link-shortener', category: 'Link', icon: LinkIcon, color: '#9333EA', desc: 'Shorten URLs' },
];

const CATEGORIES = ['All', 'PDF', 'Image', 'Business', 'Utility', 'Social', 'Finance', 'Link'];

const SECTIONS = [
  { id: 'PDF', title: 'PDF Options' },
  { id: 'Image', title: 'Image Tools' },
  { id: 'Business', title: 'Business Tools' },
  { id: 'Utility', title: 'Utility Tools' },
  { id: 'Social', title: 'Social Media' },
  { id: 'Finance', title: 'Finance Tools' },
  { id: 'Link', title: 'Link Tools' },
];

function DocumentIcon({ color, width = 34, height = 41 }: { color: string; width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 40 48" fill="none">
      <Path
        d="M 4,0 L 28,0 L 40,12 L 40,44 A 4,4 0 0 1 36,48 L 4,48 A 4,4 0 0 1 0,44 L 0,4 A 4,4 0 0 1 4,0 Z"
        fill={color}
      />
      <Path
        d="M 28,0 L 28,9 A 3,3 0 0 0 31,12 L 40,12 L 28,0 Z"
        fill="rgba(0,0,0,0.18)"
      />
    </Svg>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];

  const [selectedCategory, setSelectedCategory] = useState('All');

  interface SectionData {
    id: string;
    title: string;
    tools: ToolItem[];
  }

  const sections = useMemo<SectionData[]>(() => {
    return SECTIONS.map(sec => {
      const tools = ALL_TOOLS.filter(t => t.category === sec.id);
      return {
        ...sec,
        tools,
      };
    }).filter(sec => {
      const matchesCategory = selectedCategory === 'All' || selectedCategory === sec.id;
      return matchesCategory && sec.tools.length > 0;
    });
  }, [selectedCategory]);

  const renderToolCard = ({ item }: { item: ToolItem }) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.gridItem,
          {
            backgroundColor: isDark ? '#262626' : '#F8FAFC',
            borderColor: isDark ? '#383838' : '#E2E8F0',
          }
        ]}
        activeOpacity={0.7}
        onPress={() => router.push(item.route as any)}
      >
        {/* Document Icon Graphic */}
        <View style={styles.iconContainer}>
          <DocumentIcon color={item.color} />
          <View style={styles.iconOverlay}>
            <item.icon size={14} color="#FFFFFF" />
          </View>
        </View>

        {/* Labels */}
        <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.itemSubtitle} numberOfLines={1}>
          {item.desc}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSection = ({ item }: { item: SectionData }) => {
    return (
      <View style={styles.sectionContainer}>
        {/* Section Header */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {item.title}
        </Text>
        
        {/* Grid of tools in this section */}
        <View style={styles.gridContainer}>
          {item.tools.map(tool => renderToolCard({ item: tool }))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Fixed Sticky Header */}
      <View style={styles.headerContainer}>
        {/* App Header */}
        <View style={styles.headerTop}>
          <Text style={[styles.appName, { color: theme.text }]}>
            All <Text style={{ color: '#EF4444' }}>Tools</Text>
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.iconBtn, { backgroundColor: isDark ? '#262626' : '#F8FAFC', borderColor: theme.border }]} 
              onPress={() => router.push('/settings')}
              activeOpacity={0.7}
            >
              <Settings size={22} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories chips scroller (Fixed at the top below header) */}
        <View style={styles.categoriesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((item) => {
              const isActive = selectedCategory === item;
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => setSelectedCategory(item)}
                  style={[
                    styles.categoryChip,
                    isActive
                      ? { backgroundColor: '#EF4444' }
                      : { backgroundColor: isDark ? '#262626' : '#F1F5F9' }
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      { color: isActive ? '#FFFFFF' : isDark ? '#CBD5E1' : '#64748B' }
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderSection}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tools found.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  appName: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },

  categoriesSection: {
    marginBottom: 12,
  },
  categoryScroll: {
    paddingHorizontal: 20,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 10,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionContainer: {
    marginBottom: 28,
  },
  sectionTitleRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_SPACING,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
    gap: GRID_SPACING,
    marginBottom: GRID_SPACING,
  },
  gridItem: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 1.14,
    padding: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconContainer: {
    width: 34,
    height: 41,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 1,
  },
  itemSubtitle: {
    fontSize: 7.5,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
  },
});
