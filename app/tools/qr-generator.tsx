import React, { useState, useRef, useEffect } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Copy, 
  Share2, 
  Download, 
  QrCode, 
  Link as LinkIcon, 
  Wifi, 
  User, 
  Scan,
  CheckCircle2,
  X,
} from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const QR_TYPES = [
  { id: 'text', label: 'Text/URL', icon: LinkIcon },
  { id: 'wifi', label: 'WiFi', icon: Wifi },
  { id: 'vcard', label: 'Contact', icon: User },
];

export default function QRGeneratorScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const tintColor = '#F59E0B'; // Golden Utility Theme
  
  const [activeType, setActiveType] = useState('text');
  const [inputValue, setInputValue] = useState('');
  const [qrColor, setQrColor] = useState('#000000');
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  
  // WiFi Fields
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [encryption, setEncryption] = useState('WPA');

  // Contact Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Scanner State
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const webViewRef = useRef<WebView>(null);

  // Handle hardware back button when scanner is open
  useEffect(() => {
    const backAction = () => {
      if (showScanner) {
        setShowScanner(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [showScanner]);

  const startScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permission needed', 'Please allow camera access to scan QR codes.');
        return;
      }
    }
    setShowScanner(true);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setShowScanner(false);
    
    // Auto-Parse Logic
    if (data.startsWith('WIFI:')) {
      setActiveType('wifi');
      const ssidMatch = data.match(/S:([^;]+)/);
      const passMatch = data.match(/P:([^;]+)/);
      if (ssidMatch) setSsid(ssidMatch[1]);
      if (passMatch) setPassword(passMatch[1]);
    } else if (data.includes('BEGIN:VCARD')) {
      setActiveType('vcard');
      const fnMatch = data.match(/FN:([^\n\r]+)/);
      const telMatch = data.match(/TEL[^:]*:([^\n\r]+)/);
      const emailMatch = data.match(/EMAIL[^:]*:([^\n\r]+)/);
      if (fnMatch) setName(fnMatch[1].trim());
      if (telMatch) setPhone(telMatch[1].trim());
      if (emailMatch) setEmail(emailMatch[1].trim());
    } else {
      setActiveType('text');
      setInputValue(data);
    }

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert('Scan Successful', 'QR details have been loaded into the editor.');
  };

  const getQRContent = () => {
    switch (activeType) {
      case 'wifi':
        return `WIFI:S:${ssid};T:${encryption};P:${password};;`;
      case 'vcard':
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nN:${name};;;;\nTEL;TYPE=CELL:${phone}\nEMAIL:${email}\nEND:VCARD`;
      default:
        return inputValue || 'https://google.com';
    }
  };

  const generateQR = () => {
    const content = getQRContent();
    const safeContent = JSON.stringify(content);
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
          <style>
            body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: white; }
            canvas { width: 100% !important; height: auto !important; max-width: 512px; }
          </style>
        </head>
        <body>
          <canvas id="qrcode"></canvas>
          <script>
            QRCode.toCanvas(document.getElementById('qrcode'), ${safeContent}, {
              width: 512,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#ffffff'
              }
            }, function (error) {
              if (error) window.ReactNativeWebView.postMessage(JSON.stringify({type: 'error', message: error}));
              const canvas = document.getElementById('qrcode');
              const base64 = canvas.toDataURL('image/png');
              window.ReactNativeWebView.postMessage(JSON.stringify({type: 'success', base64: base64}));
            });
          </script>
        </body>
      </html>
    `;
    return html;
  };

  const handleMessage = (event: any) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'success') {
      setQrBase64(data.base64);
      setIsGenerating(false);
    }
  };

  const saveQR = async () => {
    if (!qrBase64) return;
    try {
      const filename = `${FileSystem.cacheDirectory}qr_${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(filename, qrBase64.split(',')[1], {
        encoding: 'base64',
      });

      await MediaLibrary.saveToLibraryAsync(filename);
      Alert.alert('Success', 'QR Code saved to gallery successfully.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not save QR code.');
    }
  };

  const shareQR = async () => {
    if (!qrBase64) return;
    try {
      const filename = `${FileSystem.cacheDirectory}share_qr.png`;
      await FileSystem.writeAsStringAsync(filename, qrBase64.split(',')[1], {
        encoding: 'base64',
      });
      await Sharing.shareAsync(filename);
    } catch (err) {
      Alert.alert('Error', 'Could not share QR code.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>QR Generator</Text>
            <TouchableOpacity style={[styles.scanBtn, { backgroundColor: isDark ? 'rgba(251,191,36,0.12)' : '#FFFBEB' }]} onPress={startScanner}>
              <Scan size={22} color={tintColor} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          {/* QR Preview Section */}
          <View style={[styles.previewContainer, { backgroundColor: isDark ? '#262626' : '#F8FAFC', borderColor: theme.border }]}>
            <View style={[styles.qrWrapper, { backgroundColor: isDark ? '#262626' : '#FFFFFF', borderColor: isDark ? '#383838' : '#F1F5F9' }]}>
              <View style={styles.qrImageContainer}>
                <WebView
                  key={getQRContent()}
                  ref={webViewRef}
                  originWhitelist={['*']}
                  source={{ html: generateQR() }}
                  onMessage={handleMessage}
                  style={styles.webView}
                  scrollEnabled={false}
                  javaScriptEnabled={true}
                />
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? '#262626' : '#F1F5F9' }]} onPress={saveQR}>
                <Download size={20} color={theme.text} />
                <Text style={[styles.actionBtnText, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? '#F1F5F9' : '#0F172A' }]} onPress={shareQR}>
                <Share2 size={20} color={isDark ? '#0F172A' : '#FFFFFF'} />
                <Text style={[styles.actionBtnText, { color: isDark ? '#0F172A' : '#FFFFFF' }]}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Input Types Tabs */}
          <View style={[styles.tabsContainer, { backgroundColor: isDark ? '#262626' : '#F8FAFC' }]}>
            {QR_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.tab, activeType === type.id && [styles.activeTab, { backgroundColor: isDark ? '#383838' : '#FFFFFF' }]]}
                onPress={() => setActiveType(type.id)}
              >
                <type.icon size={18} color={activeType === type.id ? tintColor : '#64748B'} />
                <Text style={[styles.tabText, activeType === type.id && [styles.activeTabText, { color: isDark ? '#F1F5F9' : '#0F172A' }]]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Input Fields based on type */}
          <View style={styles.inputSection}>
            {activeType === 'text' && (
              <TextInput
                style={[styles.textInput, { backgroundColor: isDark ? '#262626' : '#F8FAFC', color: theme.text, borderColor: theme.border }]}
                placeholder="Enter URL or Text"
                value={inputValue}
                onChangeText={setInputValue}
                multiline
              />
            )}

            {activeType === 'wifi' && (
              <View style={styles.wifiForm}>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: isDark ? '#262626' : '#F8FAFC', color: theme.text, borderColor: theme.border }]}
                  placeholder="Network Name (SSID)"
                  value={ssid}
                  onChangeText={setSsid}
                />
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: isDark ? '#262626' : '#F8FAFC', color: theme.text, borderColor: theme.border }]}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            )}

            {activeType === 'vcard' && (
              <View style={styles.wifiForm}>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: isDark ? '#262626' : '#F8FAFC', color: theme.text, borderColor: theme.border }]}
                  placeholder="Full Name"
                  value={name}
                  onChangeText={setName}
                />
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: isDark ? '#262626' : '#F8FAFC', color: theme.text, borderColor: theme.border }]}
                  placeholder="Phone Number"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: isDark ? '#262626' : '#F8FAFC', color: theme.text, borderColor: theme.border }]}
                  placeholder="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />
              </View>
            )}
          </View>
        </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Camera Modal Overlay */}
      {showScanner && (
        <View style={StyleSheet.absoluteFill}>
          <CameraView
            style={StyleSheet.absoluteFill}
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          >
            <SafeAreaView style={styles.scannerOverlay}>
              <View style={styles.scannerHeader}>
                <Text style={styles.scannerTitle}>Scan QR Code</Text>
                <TouchableOpacity 
                  style={styles.closeScanner} 
                  onPress={() => setShowScanner(false)}
                >
                  <X size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.scannerFrameContainer}>
                <View style={styles.scannerFrame} />
                <Text style={styles.scannerHint}>Align QR code inside the frame</Text>
              </View>
              
              <View style={styles.scannerFooter} />
            </SafeAreaView>
          </CameraView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... existing styles ...
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    position: 'relative',
  },
  scannerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  closeScanner: {
    position: 'absolute',
    right: 20,
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrameContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: width * 0.7,
    height: width * 0.7,
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  scannerHint: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  scannerFooter: {
    height: 100,
  },
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
  scanBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  scrollContent: {
    padding: 24,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  qrWrapper: {
    width: 260,
    height: 260,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  qrImageContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 12,
  },
  webView: {
    flex: 1,
  },
  placeholder: {
    alignItems: 'center',
    gap: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 6,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    fontWeight: '700',
  },
  inputSection: {
    marginBottom: 24,
  },
  textInput: {
    
    borderRadius: 16,
    borderWidth: 1.5,
    
    padding: 16,
    fontSize: 16,
    
    minHeight: 100,
    textAlignVertical: 'top',
  },
  wifiForm: {
    gap: 12,
  },
  fieldInput: {
    
    borderRadius: 16,
    borderWidth: 1.5,
    
    padding: 16,
    fontSize: 16,
    
  },
  colorSection: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  colorGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  activeColor: {
    transform: [{ scale: 1.1 }],
  },
});
