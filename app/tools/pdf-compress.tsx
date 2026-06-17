import React, { useState, useRef } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  Modal,
  TextInput,
  BackHandler,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { ArrowLeft, FileText, Trash2, Share2, Minimize2, CheckCircle2, Sliders, Sparkles } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';
import { savePdfRecord } from '@/utils/pdfHistory';
import { PDFDocument } from 'pdf-lib';
import { decode as atob, encode as btoa } from 'base-64';

const { width } = Dimensions.get('window');

interface SelectedFile {
  name: string;
  uri: string;
  size?: number;
}

export default function PdfCompressScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const tintColor = '#84CC16'; // Lime Green Compress Vibe
  const webViewRef = useRef<WebView>(null);

  const [file, setFile] = useState<SelectedFile | null>(null);
  const [compressMode, setCompressMode] = useState<'safe' | 'high'>('safe');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compressedPdfUri, setCompressedPdfUri] = useState<string | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [customFileName, setCustomFileName] = useState('');

  // WebView temporary cache variables
  const accumulatedJpegs = useRef<string[]>([]);
  const isFocused = useIsFocused();

  React.useEffect(() => {
    if (!isFocused) return;

    const backAction = () => {
      if (isSuccess) {
        setIsSuccess(false);
        setFile(null);
        setProgress(0);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [isSuccess, isFocused]);

  const handleBack = () => {
    if (isSuccess) {
      setIsSuccess(false);
      setFile(null);
      setProgress(0);
    } else {
      router.back();
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setFile({
          name: asset.name,
          uri: asset.uri,
          size: asset.size,
        });
        setIsSuccess(false);
        setCompressedPdfUri(null);
        setProgress(0);
      }
    } catch (error) {
      console.error('Error picking file:', error);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  const handleCompressProcess = () => {
    if (!file) {
      Alert.alert('Selection Required', 'Please select a PDF file first.');
      return;
    }
    const dotIdx = file.name.lastIndexOf('.');
    const baseName = dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name;
    setCustomFileName(`${baseName}_compressed`);
    setShowNamingModal(true);
  };

  const confirmAndStart = async () => {
    setShowNamingModal(false);
    startCompression();
  };

  const startCompression = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    accumulatedJpegs.current = [];

    try {
      if (compressMode === 'safe') {
        // Safe Optimization (Lossless stream pack)
        setProgress(15);
        const base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: 'base64',
        });
        setProgress(40);
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        setProgress(65);
        const pdfDoc = await PDFDocument.load(bytes);
        const compressedBase64 = await pdfDoc.saveAsBase64({ useObjectStreams: true });
        setProgress(85);
        await saveCompressedFile(compressedBase64);
      } else {
        // Maximum Compression (WebView Rasterizer)
        const base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: 'base64',
        });
        const js = `startCompression("${base64}"); true;`;
        webViewRef.current?.injectJavaScript(js);
      }
    } catch (error) {
      console.error('Safe compression failed:', error);
      Alert.alert('Compression Error', 'This PDF might be password-protected or corrupt.');
      setIsProcessing(false);
    }
  };

  const onMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PROGRESS') {
        setProgress(data.progress * 0.8); // Reserve 20% for compilation
      } else if (data.type === 'PAGE_RESULT') {
        accumulatedJpegs.current.push(data.image);
      } else if (data.type === 'FINISHED') {
        compileCompressedPdf();
      } else if (data.type === 'ERROR') {
        setIsProcessing(false);
        Alert.alert('Compression Failed', 'The document rendering engine failed: ' + data.message);
      }
    } catch (e) {
      console.error('WebView message error:', e);
    }
  };

  const compileCompressedPdf = async () => {
    if (accumulatedJpegs.current.length === 0) {
      setIsProcessing(false);
      Alert.alert('Error', 'No pages were processed for compression.');
      return;
    }

    try {
      setProgress(85);
      const pdfDoc = await PDFDocument.create();

      for (let i = 0; i < accumulatedJpegs.current.length; i++) {
        const dataUrl = accumulatedJpegs.current[i];
        const base64Data = dataUrl.split(',')[1];
        
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }

        const embeddedImage = await pdfDoc.embedJpg(bytes);
        const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: embeddedImage.width,
          height: embeddedImage.height,
        });
      }

      setProgress(95);
      const compressedBase64 = await pdfDoc.saveAsBase64({ useObjectStreams: true });
      await saveCompressedFile(compressedBase64);
    } catch (compileErr) {
      console.error('Rasterized PDF compilation failed:', compileErr);
      Alert.alert('Error', 'Failed to compile compressed document.');
      setIsProcessing(false);
    }
  };

  const saveCompressedFile = async (base64: string) => {
    if (!file) return;
    try {
      const fileName = `${customFileName.trim() || 'compressed'}.pdf`;
      const newPath = FileSystem.cacheDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(newPath, base64, {
        encoding: 'base64',
      });

      setCompressedPdfUri(newPath);

      // Save directly to Downloads folder silently on Android
      if (Platform.OS === 'android') {
        try {
          const downloadPath = `/storage/emulated/0/Download/${fileName}`;
          await FileSystem.writeAsStringAsync(downloadPath, base64, { encoding: 'base64' });
        } catch (downloadErr) {
          console.warn('Downloads save failed:', downloadErr);
        }
      }

      // Check final file size
      const fileInfo = await FileSystem.getInfoAsync(newPath);
      const newSize = fileInfo.exists ? fileInfo.size : base64.length * 0.75;
      setCompressedSize(newSize);

      // Register in Creations History
      try {
        await savePdfRecord({
          name: fileName,
          uri: newPath,
          tool: 'PDF Compress',
          size: newSize,
          createdAt: Date.now(),
        });
      } catch (historyErr) {
        console.error('History log failed:', historyErr);
      }

      setProgress(100);
      setIsSuccess(true);
    } catch (e) {
      console.error('Save failed:', e);
      Alert.alert('Error', 'Failed to save compressed file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const sharePdf = async () => {
    if (!compressedPdfUri) return;
    try {
      await Sharing.shareAsync(compressedPdfUri, { mimeType: 'application/pdf' });
    } catch (err) {
      Alert.alert('Error', 'Could not share PDF file.');
    }
  };

  const formatSize = (bytes?: number | null) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const getSavingsPercentage = () => {
    if (!file?.size || !compressedSize) return '0%';
    const savings = ((file.size - compressedSize) / file.size) * 100;
    if (savings <= 0) return '0%';
    return `${savings.toFixed(0)}%`;
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

          async function startCompression(base64) {
            try {
              const bin = atob(base64);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

              const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
              const total = pdf.numPages;

              for (let i = 1; i <= total; i++) {
                const page = await pdf.getPage(i);
                // 1.2x scale keeps legible text while reducing pixel count
                const vp = page.getViewport({ scale: 1.2 });
                const canvas = document.createElement('canvas');
                canvas.width = vp.width;
                canvas.height = vp.height;
                
                await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
                
                // JPEG at 0.55 quality offers excellent compression ratio
                send('PAGE_RESULT', { image: canvas.toDataURL('image/jpeg', 0.55), index: i });
                send('PROGRESS', { progress: Math.round((i / total) * 100) });
              }
              send('FINISHED');
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ArrowLeft size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{isSuccess ? 'Success' : 'PDF Compress'}</Text>
            <View style={[styles.headerIcon, { backgroundColor: isDark ? 'rgba(132,204,22,0.12)' : '#F7FEE7' }]}>
              <Minimize2 size={20} color={tintColor} />
            </View>
          </View>

          {/* Hidden WebView for PDF compression engine */}
          <View style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}>
            <WebView
              ref={webViewRef}
              source={{ html: htmlContent }}
              onMessage={onMessage}
              javaScriptEnabled={true}
            />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {!isSuccess ? (
              <View style={styles.stepContainer}>
                {/* File Upload Section */}
                {!file ? (
                  <TouchableOpacity style={[styles.uploadArea, { backgroundColor: isDark ? '#262626' : '#F8FAFC', borderColor: isDark ? '#383838' : '#E2E8F0' }]} onPress={pickFile}>
                    <View style={[styles.uploadIconCircle, { backgroundColor: isDark ? 'rgba(132,204,22,0.12)' : '#F7FEE7' }]}>
                      <FileText size={32} color={tintColor} />
                    </View>
                    <Text style={[styles.uploadTitle, { color: theme.text }]}>Choose PDF File</Text>
                    <Text style={styles.uploadSubtext}>Select a PDF to compress and reduce its file size</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.fileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.fileRow}>
                      <View style={[styles.fileIconWrapper, { backgroundColor: isDark ? 'rgba(132,204,22,0.12)' : '#F7FEE7' }]}>
                        <FileText size={24} color={tintColor} />
                      </View>
                      <View style={styles.fileInfo}>
                        <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>{file.name}</Text>
                        <Text style={styles.fileSize}>{formatSize(file.size)}</Text>
                      </View>
                      <TouchableOpacity onPress={removeFile} style={styles.removeBtn}>
                        <Trash2 size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Compression Level Selector */}
                {file && !isProcessing && (
                  <View style={[styles.settingsCard, { backgroundColor: theme.card }]}>
                    <View style={styles.settingsHeader}>
                      <Sliders size={18} color={tintColor} />
                      <Text style={[styles.settingsTitleText, { color: theme.text }]}>Compression Strategy</Text>
                    </View>

                    {/* Safe Optimization Chip */}
                    <TouchableOpacity
                      style={[
                        styles.strategyOption,
                        {
                          borderColor: theme.border,
                          backgroundColor: isDark ? '#171717' : '#F8FAFC',
                        },
                        compressMode === 'safe' && {
                          borderColor: tintColor,
                          backgroundColor: isDark ? 'rgba(132,204,22,0.08)' : '#F7FEE7',
                        },
                      ]}
                      onPress={() => setCompressMode('safe')}
                    >
                      <View style={styles.strategyTitleRow}>
                        <Text style={[styles.strategyTitle, { color: theme.text }]}>Safe Optimization (Lossless)</Text>
                        {compressMode === 'safe' && <CheckCircle2 size={16} color={tintColor} />}
                      </View>
                      <Text style={styles.strategyDesc}>Safely packs elements, strips metadata, and groups objects into streams. 100% vector text quality remains completely intact.</Text>
                    </TouchableOpacity>

                    {/* Maximum Compression Chip */}
                    <TouchableOpacity
                      style={[
                        styles.strategyOption,
                        {
                          borderColor: theme.border,
                          backgroundColor: isDark ? '#171717' : '#F8FAFC',
                        },
                        compressMode === 'high' && {
                          borderColor: tintColor,
                          backgroundColor: isDark ? 'rgba(132,204,22,0.08)' : '#F7FEE7',
                        },
                      ]}
                      onPress={() => setCompressMode('high')}
                    >
                      <View style={styles.strategyTitleRow}>
                        <Text style={[styles.strategyTitle, { color: theme.text }]}>Maximum Compression (Lossy)</Text>
                        {compressMode === 'high' && <CheckCircle2 size={16} color={tintColor} />}
                      </View>
                      <Text style={styles.strategyDesc}>Rasterizes pages to JPEGs at a lower DPI and downsamples all embedded images. Highly recommended for heavy scans or books.</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.processBtn, { backgroundColor: tintColor }]} onPress={handleCompressProcess}>
                      <Minimize2 size={20} color="#FFF" />
                      <Text style={styles.processBtnText}>Compress PDF</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Progress Indicators */}
                {isProcessing && (
                  <View style={[styles.settingsCard, { backgroundColor: theme.card, alignItems: 'center', paddingVertical: 30 }]}>
                    <ActivityIndicator size="large" color={tintColor} style={{ marginBottom: 16 }} />
                    <Text style={[styles.loadingText, { color: theme.text }]}>Compressing PDF...</Text>
                    <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
                    <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#383838' : '#F1F5F9' }]}>
                      <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: tintColor }]} />
                    </View>
                    <Text style={styles.loadingTip}>Do not close the app or lock your screen.</Text>
                  </View>
                )}
              </View>
            ) : (
              // Success View
              <View style={styles.successContainer}>
                <CheckCircle2 size={64} color="#10B981" />
                <Text style={[styles.successTitle, { color: theme.text }]}>Compression Complete!</Text>
                <Text style={styles.successSubtext}>Your PDF has been compressed successfully.</Text>

                <View style={[styles.successFileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.successFileName, { color: theme.text }]} numberOfLines={1}>
                    {customFileName}.pdf
                  </Text>
                  
                  {/* Size Comparison Chart */}
                  <View style={styles.comparisonChart}>
                    <View style={styles.chartCol}>
                      <Text style={styles.chartLabel}>Original</Text>
                      <Text style={[styles.chartValue, { color: theme.text }]}>{formatSize(file?.size)}</Text>
                    </View>
                    <View style={[styles.chartDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.chartCol}>
                      <Text style={styles.chartLabel}>Compressed</Text>
                      <Text style={[styles.chartValue, { color: tintColor }]}>{formatSize(compressedSize)}</Text>
                    </View>
                  </View>

                  <View style={[styles.savingsBadge, { backgroundColor: isDark ? 'rgba(132,204,22,0.12)' : '#F7FEE7' }]}>
                    <Sparkles size={14} color={tintColor} />
                    <Text style={[styles.savingsText, { color: tintColor }]}>{getSavingsPercentage()} Space Saved!</Text>
                  </View>
                </View>

                <View style={styles.successActions}>
                  <TouchableOpacity style={[styles.successBtn, { backgroundColor: tintColor }]} onPress={sharePdf}>
                    <Share2 size={20} color="#FFF" />
                    <Text style={styles.successBtnText}>Share Document</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.successBtn, styles.secondaryBtn, { borderColor: theme.border }]}
                    onPress={() => {
                      setIsSuccess(false);
                      setFile(null);
                      setProgress(0);
                    }}
                  >
                    <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Compress Another</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Naming Modal */}
          <Modal visible={showNamingModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Name Compressed PDF</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: isDark ? '#171717' : '#F8FAFC', color: theme.text, borderColor: theme.border }]}
                  value={customFileName}
                  onChangeText={setCustomFileName}
                  placeholder="Filename"
                  placeholderTextColor="#94A3B8"
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setShowNamingModal(false)}>
                    <Text style={[styles.modalCancelText, { color: theme.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: tintColor }]} onPress={confirmAndStart}>
                    <Text style={styles.modalConfirmText}>Save & Compress</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: Platform.OS === 'android' ? 120 : 60,
  },
  stepContainer: {
    gap: 20,
  },
  uploadArea: {
    height: 200,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  uploadIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  fileCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '700',
  },
  fileSize: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  removeBtn: {
    padding: 8,
  },
  settingsCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    gap: 16,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  settingsTitleText: {
    fontSize: 15,
    fontWeight: '700',
  },
  strategyOption: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
    gap: 6,
  },
  strategyTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strategyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  strategyDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  processBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  processBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  progressPercentage: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#84CC16',
    marginBottom: 16,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  loadingTip: {
    fontSize: 11,
    color: '#94A3B8',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  successFileCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    gap: 16,
  },
  successFileName: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
  },
  comparisonChart: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  chartCol: {
    alignItems: 'center',
    gap: 4,
  },
  chartLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  chartValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  chartDivider: {
    width: 1.5,
    height: 40,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  savingsText: {
    fontSize: 13,
    fontWeight: '800',
  },
  successActions: {
    width: '100%',
    gap: 12,
  },
  successBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  successBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 48,
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalInput: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancel: {
    backgroundColor: 'transparent',
  },
  modalCancelText: {
    fontWeight: '700',
  },
  modalConfirmText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
