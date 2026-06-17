import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Download, Share2, Copy, Trash2, Barcode as BarcodeIcon, Settings2, Palette, Scan, X } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { WebView } from 'react-native-webview';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width } = Dimensions.get('window');

const BARCODE_FORMATS = [
  { label: 'CODE 128', value: 'CODE128' },
  { label: 'EAN 13', value: 'EAN13' },
  { label: 'UPC', value: 'UPC' },
  { label: 'CODE 39', value: 'CODE39' },
  { label: 'ITF 14', value: 'ITF14' },
  { label: 'MSI', value: 'MSI' },
  { label: 'Pharmacode', value: 'pharmacode' },
];

const COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Red', value: '#DC2626' },
  { name: 'Green', value: '#16A34A' },
  { name: 'Purple', value: '#7C3AED' },
];

export default function BarcodeGeneratorScreen() {
  const router = useRouter();
  const tintColor = '#10B981'; // Emerald Business Theme
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const webViewRef = useRef<WebView>(null);

  const [text, setText] = useState('12345678');
  const [format, setFormat] = useState('CODE128');
  const [color, setColor] = useState('#000000');
  const [showText, setShowText] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    generateBarcode();
  }, [text, format, color, showText]);

  const handleScanPress = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to use the barcode scanner.');
        return;
      }
    }
    setShowScanner(true);
  };

  const onBarcodeScanned = ({ data }: { data: string }) => {
    setText(data);
    setShowScanner(false);
    Alert.alert('Scanned!', `Barcode data: ${data}`);
  };

  const generateBarcode = () => {
    if (!text) {
      setBarcodeDataUrl(null);
      return;
    }
    setIsGenerating(true);
    const js = `
      try {
        JsBarcode("#barcode", "${text}", {
          format: "${format}",
          lineColor: "${color}",
          width: 2,
          height: 100,
          displayValue: ${showText}
        });
        const url = document.getElementById('barcode').toDataURL("image/png");
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SUCCESS', url }));
      } catch (e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: e.message }));
      }
      true;
    `;
    webViewRef.current?.injectJavaScript(js);
  };

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SUCCESS') {
        setBarcodeDataUrl(data.url);
      } else if (data.type === 'ERROR') {
        console.warn('Barcode Gen Error:', data.message);
      }
    } catch (e) {
      console.error('WebView message error:', e);
    } finally {
      setIsGenerating(false);
    }
  };



  const saveBarcode = async () => {
    if (!barcodeDataUrl) return;
    
    try {
      const base64 = barcodeDataUrl.split(',')[1];
      const filename = `${FileSystem.cacheDirectory}barcode_${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(filename, base64, { encoding: 'base64' });
      
      // Directly save to library to avoid the buggy permission API crash
      await MediaLibrary.saveToLibraryAsync(filename);
      Alert.alert('Images Saved to Gallery', 'Barcode saved to gallery successfully.');
    } catch (e: any) {
      console.error('Save error:', e);
      Alert.alert('Save Failed', 'Gallery save me problem aa rahi hai. Please check app permissions.');
    }
  };

  const shareBarcode = async () => {
    if (!barcodeDataUrl) return;
    try {
      const base64 = barcodeDataUrl.split(',')[1];
      const filename = `${FileSystem.cacheDirectory}barcode_${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(filename, base64, { encoding: 'base64' });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filename, {
          mimeType: 'image/png',
          dialogTitle: 'Share Barcode',
          UTI: 'public.png',
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (e) {
      console.error('Sharing error:', e);
      Alert.alert('Error', 'Sharing failed');
    }
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: transparent; }
          canvas { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <canvas id="barcode"></canvas>
      </body>
    </html>
  `;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Barcode Tools</Text>
          <TouchableOpacity onPress={handleScanPress} style={[styles.scanButton, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
            <Scan size={24} color={tintColor} />
          </TouchableOpacity>
        </View>

        {/* Hidden WebView for generation */}
        <View style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}>
          <WebView
            ref={webViewRef}
            source={{ html: htmlContent }}
            onMessage={onMessage}
            javaScriptEnabled={true}
          />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Preview Area */}
          <View style={[styles.previewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.barcodeFrame, { backgroundColor: isDark ? '#262626' : '#F8FAFC' }]}>
              {isGenerating ? (
                <ActivityIndicator color={tintColor} />
              ) : barcodeDataUrl ? (
                <Image source={{ uri: barcodeDataUrl }} style={styles.barcodeImage} resizeMode="contain" />
              ) : (
                <View style={styles.emptyPreview}>
                  <BarcodeIcon size={48} color="#CBD5E1" />
                  <Text style={styles.emptyText}>Enter text to generate</Text>
                </View>
              )}
            </View>

            <View style={styles.previewActions}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? '#262626' : '#F1F5F9' }]} onPress={shareBarcode} disabled={!barcodeDataUrl}>
                <Share2 size={20} color="#64748B" />
                <Text style={[styles.actionText, { color: isDark ? '#94A3B8' : '#64748B' }]}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.primaryAction, { backgroundColor: isDark ? '#F1F5F9' : '#0F172A' }]} onPress={saveBarcode} disabled={!barcodeDataUrl}>
                <Download size={20} color={isDark ? '#0F172A' : '#FFF'} />
                <Text style={[styles.actionText, { color: isDark ? '#0F172A' : '#FFF' }]}>Save to Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Input Section */}
            <View style={styles.inputSection}>
              <View style={styles.inputHeader}>
                <Settings2 size={18} color={tintColor} />
                <Text style={[styles.inputTitle, { color: theme.text }]}>Configuration</Text>
              </View>

            <View style={styles.inputWrapper}>
              <View style={styles.rowBetween}>
                <Text style={[styles.label, { color: isDark ? '#94A3B8' : '#64748B' }]}>Barcode Text / Data</Text>
                <TouchableOpacity onPress={() => setShowText(!showText)}>
                  <Text style={{ fontSize: 12, color: tintColor, fontWeight: '700' }}>
                    {showText ? 'Hide Text' : 'Show Text'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.textInput, { backgroundColor: isDark ? '#262626' : '#F8FAFC', color: theme.text, borderColor: theme.border }]}
                value={text}
                onChangeText={setText}
                placeholder="e.g. 12345678"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={[styles.label, { color: isDark ? '#94A3B8' : '#64748B' }]}>Format</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formatScroll}>
                {BARCODE_FORMATS.map((f) => (
                  <TouchableOpacity
                    key={f.value}
                    style={[styles.chip, { backgroundColor: isDark ? '#262626' : '#FFFFFF', borderColor: theme.border }, format === f.value && { backgroundColor: tintColor, borderColor: tintColor }]}
                    onPress={() => setFormat(f.value)}
                  >
                    <Text style={[styles.chipText, { color: isDark ? '#94A3B8' : '#64748B' }, format === f.value && { color: '#FFF' }]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>


          </View>
        </ScrollView>

        {/* Scanner Modal */}
        <Modal visible={showScanner} animationType="slide">
          <View style={styles.scannerContainer}>
            <CameraView
              style={StyleSheet.absoluteFill}
              onBarcodeScanned={onBarcodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: [
                  'qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e', 'itf14'
                ],
              }}
            />
            
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerHeader}>
                <TouchableOpacity onPress={() => setShowScanner(false)} style={styles.closeScanner}>
                  <X size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.scannerTitle}>Scan Barcode</Text>
                <View style={{ width: 40 }} />
              </View>
              
              <View style={styles.scanFrameWrapper}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanHint}>Align barcode within the frame</Text>
              </View>
            </View>
          </View>
        </Modal>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import { Image } from 'react-native';

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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scanButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: Platform.OS === 'android' ? 120 : 60,
  },
  previewCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 32,
  },
  barcodeFrame: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    padding: 20,
  },
  barcodeImage: {
    width: '100%',
    height: '100%',
  },
  emptyPreview: {
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 12,
    fontWeight: '500',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryAction: {
    flex: 2,
    backgroundColor: '#0F172A',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  inputSection: {
    gap: 24,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: -8,
  },
  inputTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  inputWrapper: {
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  textInput: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    borderWidth: 1.5,
    fontWeight: '600',
  },
  formatScroll: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorSelected: {
    borderColor: '#E2E8F0',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  closeScanner: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  scanFrameWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  scanFrame: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  scanHint: {
    color: '#FFF',
    marginTop: 24,
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
});
