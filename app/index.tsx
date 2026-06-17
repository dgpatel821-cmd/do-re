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
import { useLanguage } from '@/hooks/LanguageContext';

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

// Tool definitions with translation key references instead of hardcoded strings
const TOOL_DEFS = [
  // PDF Tools
  { id: 'img-to-pdf', nameKey: 'tool_img_to_pdf_name', descKey: 'tool_img_to_pdf_desc', route: '/tools/image-to-pdf', category: 'PDF', icon: ImageIcon, color: '#EF4444' },
  { id: 'pdf-to-img', nameKey: 'tool_pdf_to_img_name', descKey: 'tool_pdf_to_img_desc', route: '/tools/pdf-to-image', category: 'PDF', icon: FileText, color: '#3B82F6' },
  { id: 'cam-to-pdf', nameKey: 'tool_cam_to_pdf_name', descKey: 'tool_cam_to_pdf_desc', route: '/tools/camera-to-pdf', category: 'PDF', icon: Camera, color: '#22C55E' },
  { id: 'pdf-merge', nameKey: 'tool_pdf_merge_name', descKey: 'tool_pdf_merge_desc', route: '/tools/pdf-merge', category: 'PDF', icon: Archive, color: '#F97316' },
  { id: 'pdf-lock', nameKey: 'tool_pdf_lock_name', descKey: 'tool_pdf_lock_desc', route: '/tools/pdf-lock', category: 'PDF', icon: Lock, color: '#06B6D4' },
  { id: 'pdf-unlock', nameKey: 'tool_pdf_unlock_name', descKey: 'tool_pdf_unlock_desc', route: '/tools/pdf-unlock', category: 'PDF', icon: Unlock, color: '#10B981' },
  { id: 'pdf-compress', nameKey: 'tool_pdf_compress_name', descKey: 'tool_pdf_compress_desc', route: '/tools/pdf-compress', category: 'PDF', icon: Minimize2, color: '#84CC16' },
  { id: 'pdf-creations', nameKey: 'tool_pdf_creations_name', descKey: 'tool_pdf_creations_desc', route: '/tools/my-creations', category: 'PDF', icon: Folder, color: '#EC4899' },
  // Image Tools
  { id: 'img-compress', nameKey: 'tool_img_compress_name', descKey: 'tool_img_compress_desc', route: '/tools/image-compressor', category: 'Image', icon: Sliders, color: '#EAB308' },
  { id: 'img-to-txt', nameKey: 'tool_img_to_txt_name', descKey: 'tool_img_to_txt_desc', route: '/tools/image-to-text', category: 'Image', icon: Type, color: '#06B6D4' },
  { id: 'img-convert', nameKey: 'tool_img_convert_name', descKey: 'tool_img_convert_desc', route: '/tools/image-converter', category: 'Image', icon: RefreshCw, color: '#3B82F6' },
  // Business Tools
  { id: 'gst-calc', nameKey: 'tool_gst_calc_name', descKey: 'tool_gst_calc_desc', route: '/tools/gst-calculator', category: 'Business', icon: Percent, color: '#EC4899' },
  { id: 'barcode-gen', nameKey: 'tool_barcode_gen_name', descKey: 'tool_barcode_gen_desc', route: '/tools/barcode-generator', category: 'Business', icon: Barcode, color: '#84CC16' },
  { id: 'invoice-maker', nameKey: 'tool_invoice_maker_name', descKey: 'tool_invoice_maker_desc', route: '/tools/invoice-maker', category: 'Business', icon: Briefcase, color: '#F43F5E' },
  // Utility Tools
  { id: 'pass-gen', nameKey: 'tool_pass_gen_name', descKey: 'tool_pass_gen_desc', route: '/tools/password-generator', category: 'Utility', icon: Key, color: '#14B8A6' },
  { id: 'qr-gen', nameKey: 'tool_qr_gen_name', descKey: 'tool_qr_gen_desc', route: '/tools/qr-generator', category: 'Utility', icon: QrCode, color: '#EA580C' },
  { id: 'notepad', nameKey: 'tool_notepad_name', descKey: 'tool_notepad_desc', route: '/tools/notepad', category: 'Utility', icon: Pen, color: '#16A34A' },
  // Social Media Tools
  { id: 'ai-rewriter', nameKey: 'tool_ai_rewriter_name', descKey: 'tool_ai_rewriter_desc', route: '/tools/ai-rewriter', category: 'Social', icon: Sparkles, color: '#2563EB' },
  { id: 'caption-gen', nameKey: 'tool_caption_gen_name', descKey: 'tool_caption_gen_desc', route: '/tools/caption-gen', category: 'Social', icon: Type, color: '#0891B2' },
  { id: 'hashtag-gen', nameKey: 'tool_hashtag_gen_name', descKey: 'tool_hashtag_gen_desc', route: '/tools/hashtag-gen', category: 'Social', icon: Hash, color: '#7C3AED' },
  { id: 'fancy-font', nameKey: 'tool_fancy_font_name', descKey: 'tool_fancy_font_desc', route: '/tools/fancy-fonts', category: 'Social', icon: Type, color: '#D97706' },
  // Finance Tools
  { id: 'emi-calc', nameKey: 'tool_emi_calc_name', descKey: 'tool_emi_calc_desc', route: '/tools/emi-calc', category: 'Finance', icon: Percent, color: '#65A30D' },
  { id: 'sip-calc', nameKey: 'tool_sip_calc_name', descKey: 'tool_sip_calc_desc', route: '/tools/sip-calc', category: 'Finance', icon: Sliders, color: '#DC2626' },
  // Link Tools
  { id: 'link-short', nameKey: 'tool_link_short_name', descKey: 'tool_link_short_desc', route: '/tools/link-shortener', category: 'Link', icon: LinkIcon, color: '#9333EA' },
];

const CATEGORY_KEYS = [
  { key: 'All', tKey: 'cat_All' },
  { key: 'PDF', tKey: 'cat_PDF' },
  { key: 'Image', tKey: 'cat_Image' },
  { key: 'Business', tKey: 'cat_Business' },
  { key: 'Utility', tKey: 'cat_Utility' },
  { key: 'Social', tKey: 'cat_Social' },
  { key: 'Finance', tKey: 'cat_Finance' },
  { key: 'Link', tKey: 'cat_Link' },
];

const SECTION_KEYS = [
  { id: 'PDF', tKey: 'sec_PDF' },
  { id: 'Image', tKey: 'sec_Image' },
  { id: 'Business', tKey: 'sec_Business' },
  { id: 'Utility', tKey: 'sec_Utility' },
  { id: 'Social', tKey: 'sec_Social' },
  { id: 'Finance', tKey: 'sec_Finance' },
  { id: 'Link', tKey: 'sec_Link' },
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
  const { t } = useLanguage();

  const [selectedCategory, setSelectedCategory] = useState('All');

  interface SectionData {
    id: string;
    title: string;
    tKey: string;
    tools: ToolItem[];
  }

  const ALL_TOOLS: ToolItem[] = useMemo(() => TOOL_DEFS.map(def => ({
    ...def,
    name: t(def.nameKey),
    desc: t(def.descKey),
  })), [t]);

  const sections = useMemo<SectionData[]>(() => {
    return SECTION_KEYS.map(sec => {
      const tools = ALL_TOOLS.filter(tool => tool.category === sec.id);
      return { ...sec, title: t(sec.tKey), tools };
    }).filter(sec => {
      const matchesCategory = selectedCategory === 'All' || selectedCategory === sec.id;
      return matchesCategory && sec.tools.length > 0;
    });
  }, [selectedCategory, ALL_TOOLS, t]);

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
            {CATEGORY_KEYS.map(({ key, tKey }) => {
              const isActive = selectedCategory === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setSelectedCategory(key)}
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
                    {t(tKey)}
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
