import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { ArrowLeft, FileType, Download, Trash2, ImageIcon } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { WebView } from 'react-native-webview';
import { savePdfRecord } from '@/utils/pdfHistory';

const { width } = Dimensions.get('window');

export default function PdfToImageScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const tintColor = '#EF4444';
  const webViewRef = useRef<WebView>(null);
  const firstPageThumbRef = useRef<string | null>(null);

  const [selectedPdf, setSelectedPdf] = useState<{ uri: string; name: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [debugLogs, setDebugLogs] = useState<string[]>(['System Ready']);

  const addLog = (msg: string) => {
    setDebugLogs(prev => [msg, ...prev].slice(0, 8));
  };

  const onMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'LOG') {
        addLog(data.message);
      } else if (data.type === 'PROGRESS') {
        setProgress(data.progress);
      } else if (data.type === 'PAGE_RESULT') {
        setImages(prev => [...prev, data.image]);
        if (data.index === 1 && selectedPdf) {
          try {
            const thumbFileName = `thumb_${selectedPdf.name.replace(/\s+/g, '_')}.jpg`;
            const thumbPath = FileSystem.cacheDirectory + thumbFileName;
            const base64Data = data.image.split(',')[1];
            await FileSystem.writeAsStringAsync(thumbPath, base64Data, { encoding: 'base64' });
            firstPageThumbRef.current = thumbPath;
          } catch (err) {
            console.error('Failed to save thumbnail image', err);
          }
        }
      } else if (data.type === 'FINISHED') {
        setIsProcessing(false);
        addLog('✅ All pages converted');
        // Save PDF to creations history
        if (selectedPdf) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(selectedPdf.uri);
            const fileSize = fileInfo.exists ? fileInfo.size : undefined;
            await savePdfRecord({
              name: selectedPdf.name,
              uri: selectedPdf.uri,
              tool: 'PDF to Image',
              size: fileSize,
              createdAt: Date.now(),
              thumbnailUri: firstPageThumbRef.current || undefined,
            });
          } catch (historyErr) {
            console.error('History save error:', historyErr);
          }
        }
      } else if (data.type === 'ERROR') {
        addLog('❌ Error: ' + data.message);
        Alert.alert('Conversion Failed', data.message);
        setIsProcessing(false);
      }
    } catch (e) {
      console.error('WebView message error:', e);
    }
  };

  const pickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedPdf({
          uri: result.assets[0].uri,
          name: result.assets[0].name,
        });
        setImages([]);
        setProgress(0);
        setDebugLogs(['PDF Selected: ' + result.assets[0].name]);
        firstPageThumbRef.current = null;
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to pick PDF');
    }
  };

  const startConversion = async () => {
    if (!selectedPdf) return;
    setIsProcessing(true);
    setImages([]);
    setProgress(0);
    setDebugLogs(['Reading binary data...']);

    try {
      const base64 = await FileSystem.readAsStringAsync(selectedPdf.uri, { encoding: 'base64' });
      addLog('Injecting data into engine...');
      // Use injectJavaScript instead of postMessage - works reliably with local HTML
      const js = `startConversion("${base64}"); true;`;
      webViewRef.current?.injectJavaScript(js);
    } catch (e) {
      addLog('Failed to read file: ' + String(e));
      setIsProcessing(false);
    }
  };

  const saveAllImages = async () => {
    try {
      setIsProcessing(true);
      addLog('Saving to gallery...');
      for (let i = 0; i < images.length; i++) {
        const base64 = images[i].split(',')[1];
        const filename = `${FileSystem.cacheDirectory}page_${i + 1}.jpg`;
        await FileSystem.writeAsStringAsync(filename, base64, { encoding: 'base64' });
        await MediaLibrary.saveToLibraryAsync(filename);
      }
      Alert.alert('Images Saved to Gallery', `${images.length} page${images.length > 1 ? 's' : ''} saved successfully.`);
    } catch (e: any) {
      console.error('Save error:', e);
      Alert.alert('Save Failed', e?.message || 'There was a problem saving to the gallery.');
    } finally {
      setIsProcessing(false);
    }
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
        <style>body { margin: 0; }</style>
      </head>
      <body>
        <script>
          const pdfjsLib = window['pdfjs-dist/build/pdf'];
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

          const send = (type, data = {}) => window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...data }));

          async function startConversion(base64) {
            try {
              send('LOG', { message: 'Engine started!' });
              const bin = atob(base64);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

              send('LOG', { message: 'PDF Parsing...' });
              const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
              const total = pdf.numPages;
              send('LOG', { message: 'Found ' + total + ' pages' });

              for (let i = 1; i <= total; i++) {
                send('LOG', { message: 'Rendering ' + i + '/' + total });
                const page = await pdf.getPage(i);
                const vp = page.getViewport({ scale: 2.5 });
                const canvas = document.createElement('canvas');
                canvas.width = vp.width;
                canvas.height = vp.height;
                await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
                send('PAGE_RESULT', { image: canvas.toDataURL('image/jpeg', 0.95), index: i });
                send('PROGRESS', { progress: Math.round((i / total) * 100) });
              }
              send('FINISHED', { count: total });
            } catch (err) {
              send('ERROR', { message: err.message });
            }
          }
        </script>
      </body>
    </html>
  `;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>PDF to Image V2</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ width: 0, height: 0, opacity: 0 }}>
          <WebView
            ref={webViewRef}
            source={{ html: htmlContent }}
            onMessage={onMessage}
            javaScriptEnabled={true}
            originWhitelist={['*']}
            domStorageEnabled={true}
          />
        </View>

        {images.length === 0 ? (
          <View style={styles.content}>
            {!selectedPdf ? (
              <TouchableOpacity style={[styles.uploadArea, { backgroundColor: isDark ? '#262626' : '#F8FAFC', borderColor: isDark ? '#383838' : '#F1F5F9' }]} onPress={pickPdf}>
                <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2' }]}>
                  <FileType size={32} color={tintColor} />
                </View>
                <Text style={styles.uploadText}>Select PDF File</Text>
                <Text style={styles.uploadSubtext}>Select a PDF file to extract pages as images</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.selectedFileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.fileIconWrapper, { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2' }]}>
                  <FileType size={40} color={tintColor} />
                </View>
                <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>{selectedPdf.name}</Text>
                <TouchableOpacity onPress={() => setSelectedPdf(null)} style={styles.removeBtn}>
                  <Trash2 size={18} color="#94A3B8" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.primaryButton, { backgroundColor: tintColor, marginTop: 32 }]}
                  onPress={startConversion}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <ImageIcon size={20} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={styles.primaryButtonText}>Start Conversion</Text>
                    </>
                  )}
                </TouchableOpacity>

                {isProcessing && (
                  <View style={styles.progressSection}>
                    <View style={[styles.progressBarWrapper, { backgroundColor: isDark ? '#383838' : '#F1F5F9' }]}>
                      <View style={[styles.progressBar, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.progressPercent}>{progress}% Processing...</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.resultsContainer}>
            <View style={[styles.resultsHeader, { backgroundColor: isDark ? '#262626' : '#F8FAFC' }]}>
              <Text style={[styles.resultsTitle, { color: theme.text }]}>{images.length} Pages Extracted</Text>
              <TouchableOpacity onPress={saveAllImages} style={[styles.saveAllBtn, { backgroundColor: isDark ? '#F1F5F9' : '#0F172A' }]}>
                <Download size={18} color={isDark ? '#0F172A' : '#FFF'} style={{ marginRight: 6 }} />
                <Text style={[styles.saveAllText, { color: isDark ? '#0F172A' : '#FFF' }]}>Save All</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={images}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item, index }) => (
                <View style={[styles.imageCard, { backgroundColor: isDark ? theme.card : '#FFF', borderColor: isDark ? theme.border : '#F1F5F9' }]}>
                  <Image source={{ uri: item }} style={[styles.extractedImage, { backgroundColor: isDark ? '#262626' : '#F8FAFC' }]} resizeMode="contain" />
                  <View style={[styles.imageInfo, { borderTopColor: isDark ? '#383838' : '#F1F5F9' }]}>
                    <Text style={styles.pageLabel}>Page {index + 1}</Text>
                  </View>
                </View>
              )}
              contentContainerStyle={{ padding: 20 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {isProcessing && images.length === 0 && (
          <View style={[styles.loadingOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)' }]}>
            <ActivityIndicator size="large" color={tintColor} />
            <Text style={styles.loadingText}>Engine Initializing...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  uploadArea: { height: 280, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  iconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  uploadText: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  uploadSubtext: { fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 20 },
  selectedFileCard: { borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 1, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20 },
  fileIconWrapper: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  fileName: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  removeBtn: { position: 'absolute', top: 20, right: 20, padding: 8 },
  primaryButton: { width: '100%', height: 56, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  consoleWrapper: { marginTop: 40 },
  consoleTitle: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' },
  console: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  consoleText: { fontSize: 11, color: '#94A3B8', marginBottom: 4, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  resultsContainer: { flex: 1 },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  resultsTitle: { fontSize: 16, fontWeight: '700' },
  saveAllBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  saveAllText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  imageCard: { borderRadius: 16, marginBottom: 20, overflow: 'hidden', borderWidth: 1, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  extractedImage: { width: '100%', height: 300 },
  imageInfo: { padding: 12, borderTopWidth: 1, alignItems: 'center' },
  pageLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '700',
  },
  progressSection: {
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
  },
  progressBarWrapper: {
    width: '100%',
    height: 8,
    // backgroundColor moved to inline (isDark ? '#383838' : '#F1F5F9')
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 4,
  },
  progressPercent: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  miniConsole: { marginTop: 12, paddingHorizontal: 20 },
  miniConsoleText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
});
