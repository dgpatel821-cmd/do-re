import React, { useState, useEffect } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Animated,
  Share,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, Upload, Copy, Share2, Settings, Sparkles, Check, RefreshCw, Edit2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const API_KEY_STORAGE_KEY = 'multikit_ocr_space_api_key';

export default function ImageToTextScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const isFocused = useIsFocused();
  const tintColor = '#3B82F6'; // Blue theme for Image Tools

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Scanner animation
  const [scanAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Load saved API key
    const loadApiKey = async () => {
      try {
        const savedKey = await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
        if (savedKey) setApiKey(savedKey);
      } catch (e) {
        console.error(e);
      }
    };
    loadApiKey();
  }, []);

  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanAnim.setValue(0);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!isFocused) return;

    const backAction = () => {
      if (imageUri || extractedText) {
        handleReset();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [imageUri, extractedText, isFocused]);

  const handleBack = () => {
    if (imageUri || extractedText) {
      handleReset();
    } else {
      router.back();
    }
  };

  const handleReset = () => {
    setImageUri(null);
    setExtractedText('');
    setIsLoading(false);
    setCopied(false);
    setIsEditing(false);
  };

  const saveApiKey = async (key: string) => {
    try {
      setApiKey(key);
      await AsyncStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
    } catch (e) {
      Alert.alert('Error', 'Failed to save API key');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        setExtractedText('');
        setCopied(false);
        performOCR(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to pick image');
    }
  };

  const captureImage = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to capture photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        setExtractedText('');
        setCopied(false);
        performOCR(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to capture image');
    }
  };

  const performOCR = async (uri: string) => {
    setIsLoading(true);
    try {
      // 1. Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 2. Prepare Form Data
      const formData = new FormData();
      formData.append('base64Image', `data:image/jpeg;base64,${base64}`);
      formData.append('apikey', apiKey.trim() || 'helloworld');
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');

      // 3. Request OCR API
      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();

      if (data && data.ParsedResults && data.ParsedResults.length > 0) {
        const text = data.ParsedResults[0].ParsedText;
        if (text && text.trim().length > 0) {
          setExtractedText(text.trim());
        } else {
          Alert.alert('OCR Result', 'No clear text was found in the image. Please try with a clearer image.');
        }
      } else {
        const errorMsg = data.ErrorMessage || 'Failed to extract text. Please try again.';
        Alert.alert('OCR Failed', errorMsg);
      }
    } catch (error) {
      console.error('OCR Request Error:', error);
      Alert.alert(
        'Connection Error',
        'Unable to connect to the server. Please check your internet connection.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!extractedText) return;
    await Clipboard.setStringAsync(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = async () => {
    if (!extractedText) return;
    try {
      await Share.share({
        message: extractedText,
      });
    } catch (error) {
      console.error('Sharing failed:', error);
    }
  };

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 240], // matching image preview frame height
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Image to Text</Text>
          <TouchableOpacity onPress={() => setShowSettings(!showSettings)} style={styles.settingsButton}>
            <Settings size={22} color={showSettings ? tintColor : '#64748B'} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* API Key settings panel */}
          {showSettings && (
            <View style={[styles.settingsPanel, { backgroundColor: isDark ? '#262626' : '#F8FAFC', borderColor: isDark ? '#383838' : '#E2E8F0' }]}>
              <Text style={[styles.settingsPanelTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>Custom API Key (Optional)</Text>
              <Text style={styles.settingsPanelSub}>
                A default test key is being used. If the limit is exhausted, you can get a free key from ocr.space and paste it here.
              </Text>
              <TextInput
                style={[styles.settingsInput, { backgroundColor: isDark ? '#171717' : '#FFFFFF', color: isDark ? '#F1F5F9' : '#0F172A', borderColor: isDark ? '#383838' : '#CBD5E1' }]}
                value={apiKey}
                onChangeText={saveApiKey}
                placeholder="Enter OCR.space API Key (starts with K8)"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={[styles.closeSettingsBtn, { backgroundColor: isDark ? '#F1F5F9' : '#0F172A' }]} onPress={() => setShowSettings(false)}>
                <Text style={[styles.closeSettingsBtnText, { color: isDark ? '#0F172A' : '#FFFFFF' }]}>Done</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Core Content */}
          {!imageUri ? (
            <View style={styles.pickerSection}>

              <TouchableOpacity style={[styles.uploadArea, { backgroundColor: isDark ? '#262626' : '#F8FAFC', borderColor: theme.border }]} onPress={pickImage} activeOpacity={0.7}>
                <View style={[styles.uploadIconCircle, { backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : '#EEF2FF' }]}>
                  <Upload size={32} color={tintColor} />
                </View>
                <Text style={[styles.uploadText, { color: theme.text }]}>Tap to Select Image</Text>
                <Text style={styles.uploadSubtext}>Supported: JPG, PNG, WEBP</Text>
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, { backgroundColor: isDark ? '#383838' : '#E2E8F0' }]} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={[styles.dividerLine, { backgroundColor: isDark ? '#383838' : '#E2E8F0' }]} />
              </View>

              <TouchableOpacity style={[styles.cameraButton, { backgroundColor: tintColor }]} onPress={captureImage} activeOpacity={0.8}>
                <Camera size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.cameraButtonText}>Take a Photo (Camera)</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.previewSection}>
              {isLoading ? (
                /* Big Image Preview with Scanner Line while loading */
                <View style={[styles.imageFrameContainer, { backgroundColor: isDark ? '#262626' : '#F1F5F9', borderColor: isDark ? '#383838' : '#E2E8F0' }]}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                  <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#FFF" />
                    <Text style={styles.loadingText}>Scanning Text...</Text>
                  </View>
                </View>
              ) : (
                /* Sleek Mini Image Preview when done */
                <View style={[styles.miniImageContainer, { backgroundColor: isDark ? '#262626' : '#F8FAFC', borderColor: isDark ? '#383838' : '#E2E8F0' }]}>
                  <Image source={{ uri: imageUri }} style={[styles.miniImage, { backgroundColor: isDark ? '#374151' : '#CBD5E1' }]} />
                  <View style={styles.miniImageInfo}>
                    <Text style={[styles.miniImageTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>Scanned Image</Text>
                    <Text style={styles.miniImageSub}>Text extracted successfully</Text>
                  </View>
                  <TouchableOpacity onPress={handleReset} style={[styles.changeImageTextButton, { backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF' }]}>
                    <Text style={{ color: tintColor, fontWeight: '700', fontSize: 13 }}>Change</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Extraction result */}
              {!isLoading && extractedText.length > 0 && (
                <View style={[styles.resultCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.resultHeader}>
                    <Text style={[styles.resultTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>Extracted Text</Text>
                    <View style={styles.resultHeaderActions}>
                      <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.headerActionButton}>
                        <Edit2 size={16} color={isEditing ? tintColor : '#64748B'} style={{ marginRight: 4 }} />
                        <Text style={[styles.headerActionButtonText, isEditing && { color: tintColor, fontWeight: '700' }]}>
                          {isEditing ? 'Done' : 'Edit'}
                        </Text>
                      </TouchableOpacity>
                      <View style={[styles.headerActionSeparator, { backgroundColor: isDark ? '#383838' : '#CBD5E1' }]} />
                      <TouchableOpacity onPress={handleReset} style={styles.headerActionButton}>
                        <RefreshCw size={16} color="#64748B" style={{ marginRight: 4 }} />
                        <Text style={styles.headerActionButtonText}>Scan New</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {isEditing ? (
                    <TextInput
                      style={[styles.resultInput, { backgroundColor: isDark ? '#262626' : '#F8FAFC', color: theme.text, borderColor: theme.border }]}
                      value={extractedText}
                      onChangeText={setExtractedText}
                      multiline
                      scrollEnabled={true}
                      textAlignVertical="top"
                    />
                  ) : (
                    <ScrollView style={[styles.resultScroll, { backgroundColor: isDark ? '#262626' : '#F8FAFC', borderColor: theme.border }]} nestedScrollEnabled>
                      <Text selectable style={[styles.resultText, { color: isDark ? '#E2E8F0' : '#383838' }]}>
                        {extractedText}
                      </Text>
                    </ScrollView>
                  )}

                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      {extractedText.length} characters | {extractedText.trim().split(/\s+/).filter(Boolean).length} words
                    </Text>
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, styles.copyBtn, { backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF', borderColor: isDark ? '#3B82F6' : '#BFDBFE' }]} onPress={copyToClipboard}>
                      {copied ? (
                        <>
                          <Check size={20} color="#10B981" style={{ marginRight: 8 }} />
                          <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Copied</Text>
                        
                        </>
                      ) : (
                        <>
                          <Copy size={20} color={tintColor} style={{ marginRight: 8 }} />
                          <Text style={[styles.actionBtnText, { color: tintColor }]}>Copy Text</Text>
                        
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionBtn, styles.shareBtn, { backgroundColor: tintColor }]} onPress={shareText}>
                      <Share2 size={20} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
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
  settingsButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
  },
  settingsPanel: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  settingsPanelTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  settingsPanelSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 12,
  },
  settingsInput: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 12,
  },
  closeSettingsBtn: {
    alignSelf: 'flex-end',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeSettingsBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pickerSection: {
    alignItems: 'center',
    paddingTop: 12,
    width: '100%',
  },
  uploadArea: {
    height: 280,
    borderRadius: 24,
    borderWidth: 2,
    
    borderStyle: 'dashed',
    
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  uploadIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '700',
    
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#94A3B8',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
    marginHorizontal: 16,
  },
  cameraButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cameraButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  previewSection: {
    alignItems: 'center',
    width: '100%',
  },
  imageFrameContainer: {
    width: '100%',
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 5,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
  },
  resultCard: {
    width: '100%',
    
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  miniImageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  miniImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#CBD5E1',
    resizeMode: 'cover',
  },
  miniImageInfo: {
    flex: 1,
    marginLeft: 12,
  },
  miniImageTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  miniImageSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  changeImageTextButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  resultHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  headerActionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  headerActionSeparator: {
    width: 1,
    height: 14,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  resultInput: {
    height: 200,
    
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    
    fontSize: 15,
    
    lineHeight: 22,
    marginBottom: 12,
  },
  resultScroll: {
    height: 200,
    
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    
    marginBottom: 12,
  },
  resultText: {
    fontSize: 15,
    color: '#383838',
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  shareBtn: {
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
});
