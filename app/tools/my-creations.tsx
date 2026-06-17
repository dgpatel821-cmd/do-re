import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  ArrowLeft,
  FileText,
  Share2,
  Trash2,
  ImageIcon,
  Camera,
  Layers,
  Image as ImageLucide,
  FolderOpen,
  Sparkles,
  Lock,
  Unlock,
  Minimize2,
} from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { WebView } from 'react-native-webview';
import {
  getPdfHistory,
  deletePdfRecord,
  clearPdfHistory,
  formatSize,
  formatDate,
  PdfRecord,
  PdfTool,
} from '@/utils/pdfHistory';

const TINT = '#EF4444';

// Tool → icon + color mapping
const TOOL_META: Record<PdfTool, { icon: any; color: string; bg: string }> = {
  'Image to PDF':  { icon: ImageIcon, color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
  'Camera to PDF': { icon: Camera,    color: '#22C55E', bg: 'rgba(34,197,94,0.12)'  },
  'PDF Merge':     { icon: Layers,    color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  'PDF to Image':  { icon: ImageLucide,     color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  'PDF Lock':      { icon: Lock,      color: '#06B6D4', bg: 'rgba(6,182,212,0.12)' },
  'PDF Unlock':    { icon: Unlock,    color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  'PDF Compress':  { icon: Minimize2,  color: '#84CC16', bg: 'rgba(132,204,22,0.12)' },
};

export default function MyCreationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];

  const [records, setRecords] = useState<PdfRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Preview PDF States
  const [previewPdf, setPreviewPdf] = useState<PdfRecord | null>(null);
  const [previewBase64, setPreviewBase64] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const handlePreviewPdf = async (rec: PdfRecord) => {
    try {
      setPreviewLoading(true);
      setPreviewPdf(rec);
      
      const info = await FileSystem.getInfoAsync(rec.uri);
      if (!info.exists) {
        Alert.alert(
          'File Missing',
          'This file has been cleared from cache. Please recreate it.',
          [{ text: 'OK', onPress: () => {
            setPreviewPdf(null);
            setPreviewLoading(false);
          }}]
        );
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(rec.uri, { encoding: 'base64' });
      setPreviewBase64(base64);
    } catch (e: any) {
      Alert.alert('Preview Failed', e?.message || 'Could not load PDF preview.');
      setPreviewPdf(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewPdf(null);
    setPreviewBase64(null);
  };

  const handleWebViewLoad = () => {
    if (previewBase64) {
      const js = `loadPdf("${previewBase64}"); true;`;
      webViewRef.current?.injectJavaScript(js);
    }
  };

  const previewHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
        <style>
          body {
            margin: 0;
            padding: 15px 0;
            background-color: ${isDark ? '#171717' : '#F8FAFC'};
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
          }
          canvas {
            max-width: 95%;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            border-radius: 6px;
            background-color: white;
          }
          .loading {
            color: #94A3B8;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin-top: 100px;
            font-size: 16px;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div id="status" class="loading">Parsing Document...</div>
        <script>
          const pdfjsLib = window['pdfjs-dist/build/pdf'];
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

          async function loadPdf(base64) {
            try {
              const bin = atob(base64);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

              const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
              document.getElementById('status').style.display = 'none';

              for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                document.body.appendChild(canvas);
                
                await page.render({
                  canvasContext: context,
                  viewport: viewport
                }).promise;
              }
            } catch (err) {
              document.getElementById('status').innerText = 'Error loading PDF: ' + err.message;
            }
          }
        </script>
      </body>
    </html>
  `;

  // Reload whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        const hist = await getPdfHistory();
        if (active) {
          setRecords(hist);
          setLoading(false);
        }
      })();
      return () => { active = false; };
    }, [])
  );

  // ── Share ──────────────────────────────────────────────────────────────────
  const handleShare = async (rec: PdfRecord) => {
    try {
      // Check if file still exists in cache
      const info = await FileSystem.getInfoAsync(rec.uri);
      if (!info.exists) {
        Alert.alert(
          'File Missing',
          'This file has been cleared from cache. Please recreate it.',
          [{ text: 'OK' }]
        );
        return;
      }
      await Sharing.shareAsync(rec.uri, { mimeType: 'application/pdf' });
    } catch (e: any) {
      Alert.alert('Share Failed', e?.message || 'Something went wrong.');
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (rec: PdfRecord) => {
    Alert.alert(
      'Delete Record',
      `Are you sure you want to remove "${rec.name}" from history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePdfRecord(rec.id);
            setRecords(prev => prev.filter(r => r.id !== rec.id));
          },
        },
      ]
    );
  };

  // ── Clear All ──────────────────────────────────────────────────────────────
  const handleClearAll = () => {
    if (records.length === 0) return;
    Alert.alert(
      'Clear All History',
      'All creation history will be deleted. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearPdfHistory();
            setRecords([]);
          },
        },
      ]
    );
  };

  // ── Render each record ─────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: PdfRecord }) => {
    const meta = TOOL_META[item.tool] ?? TOOL_META['Image to PDF'];
    const IconComp = meta.icon;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handlePreviewPdf(item)}
        style={[
          styles.card,
          {
            backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
            borderColor: isDark ? '#2E2E2E' : '#F1F5F9',
          },
        ]}
      >
        {/* Thumbnail Image or Fallback Tool Icon */}
        <View style={styles.thumbnailContainer}>
          {item.thumbnailUri ? (
            <Image
              source={{ uri: item.thumbnailUri }}
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.toolIcon, { backgroundColor: meta.bg }]}>
              <IconComp size={22} color={meta.color} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text
            style={[styles.cardName, { color: theme.text }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text style={styles.cardMeta}>
            {item.tool}
            {item.size ? `  ·  ${formatSize(item.size)}` : ''}
          </Text>
          <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isDark ? '#2E2E2E' : '#F1F5F9' }]}
            onPress={() => handleShare(item)}
            activeOpacity={0.7}
          >
            <Share2 size={16} color={TINT} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isDark ? '#2E2E2E' : '#F1F5F9' }]}
            onPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <Trash2 size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Empty state ────────────────────────────────────────────────────────────
  const EmptyView = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconBg, { backgroundColor: isDark ? '#1E1E1E' : '#FEF2F2' }]}>
        <FolderOpen size={52} color={TINT} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No Creations Yet</Text>
      <Text style={styles.emptySubtitle}>
        Whenever you create a PDF —{'\n'}Image to PDF, Camera to PDF,{'\n'}PDF Merge — it will show up here!
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>My Creations</Text>
          {records.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{records.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={handleClearAll} style={styles.backBtn} activeOpacity={0.7}>
          <Trash2 size={20} color={records.length ? '#94A3B8' : 'transparent'} />
        </TouchableOpacity>
      </View>

      {/* Legend chips */}
      {records.length > 0 && (
        <View style={styles.legend}>
          {(Object.entries(TOOL_META) as [PdfTool, typeof TOOL_META[PdfTool]][]).map(([tool, m]) => {
            const count = records.filter(r => r.tool === tool).length;
            if (!count) return null;
            const Ic = m.icon;
            return (
              <View key={tool} style={[styles.chip, { backgroundColor: m.bg }]}>
                <Ic size={11} color={m.color} />
                <Text style={[styles.chipText, { color: m.color }]}>{count}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={TINT} />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyView />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      {/* PDF Full Screen Preview Modal */}
      <Modal visible={previewPdf !== null} animationType="slide" transparent={false} onRequestClose={closePreview}>
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#171717' : '#FFFFFF' }}>
          {/* Modal Header */}
          <View
            style={[
              styles.header,
              { backgroundColor: theme.card, borderBottomColor: theme.border, borderBottomWidth: 1 },
            ]}
          >
            <TouchableOpacity onPress={closePreview} style={styles.backBtn}>
              <ArrowLeft size={24} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: theme.text, maxWidth: 200 }]} numberOfLines={1}>
                {previewPdf?.name}
              </Text>
            </View>
            {previewPdf && (
              <TouchableOpacity onPress={() => handleShare(previewPdf)} style={styles.backBtn}>
                <Share2 size={20} color={TINT} />
              </TouchableOpacity>
            )}
          </View>

          {/* Modal Content */}
          {previewLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={TINT} />
              <Text style={{ marginTop: 12, color: theme.text, fontWeight: '600' }}>Loading Preview...</Text>
            </View>
          ) : (
            <WebView
              ref={webViewRef}
              source={{ html: previewHtml }}
              onLoadEnd={handleWebViewLoad}
              style={{ flex: 1, backgroundColor: isDark ? '#171717' : '#FFFFFF' }}
              javaScriptEnabled={true}
              originWhitelist={['*']}
              domStorageEnabled={true}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  badge: {
    backgroundColor: TINT,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },

  legend: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  chipText: { fontSize: 11, fontWeight: '700' },

  listContent: { padding: 20, paddingBottom: 40 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  thumbnailContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    backgroundColor: '#262626',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '800', marginBottom: 3 },
  cardMeta: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 2 },
  cardDate: { fontSize: 10, color: '#64748B', fontWeight: '500' },

  cardActions: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyContainer: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIconBg: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
});
