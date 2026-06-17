import React, { useState, useEffect } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  BackHandler,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Upload, Check, Download, Share2, RefreshCw, FileImage, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

type FormatType = 'JPEG' | 'PNG' | 'WEBP';

export default function ImageConverterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const tintColor = '#3B82F6'; // Blue Accent for Image Converter

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [convertedImage, setConvertedImage] = useState<string | null>(null);
  
  const [originalName, setOriginalName] = useState<string>('Image');
  const [originalFormat, setOriginalFormat] = useState<string>('Unknown');
  const [originalSize, setOriginalSize] = useState<string | null>(null);
  const [convertedSize, setConvertedSize] = useState<string | null>(null);

  const [targetFormat, setTargetFormat] = useState<FormatType>('JPEG');
  const [quality, setQuality] = useState<number>(0.9); // Default 90%
  const [sliderWidth, setSliderWidth] = useState<number>(0);

  const [isConverting, setIsConverting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleBack = () => {
    if (selectedImage) {
      setSelectedImage(null);
      setConvertedImage(null);
      setConvertedSize(null);
      setOriginalSize(null);
      setIsSuccess(false);
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    }
  };

  useEffect(() => {
    const backAction = () => {
      if (selectedImage) {
        setSelectedImage(null);
        setConvertedImage(null);
        setConvertedSize(null);
        setOriginalSize(null);
        setIsSuccess(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [selectedImage]);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getFormatFromUri = (uri: string): string => {
    const ext = uri.split('.').pop()?.toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg') return 'JPEG';
    if (ext === 'png') return 'PNG';
    if (ext === 'webp') return 'WEBP';
    if (ext === 'gif') return 'GIF';
    return ext?.toUpperCase() || 'JPEG';
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const uri = result.assets[0].uri;
        setSelectedImage(uri);
        setConvertedImage(null);
        setIsSuccess(false);

        // Get file info
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists) {
          setOriginalSize(formatBytes(fileInfo.size));
        }
        setOriginalFormat(getFormatFromUri(uri));
        
        const filename = uri.split('/').pop() || 'image';
        setOriginalName(filename.length > 25 ? filename.substring(0, 22) + '...' : filename);
      }
    } catch (error) {
      console.error('Pick image error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handleTouch = (event: any) => {
    if (sliderWidth <= 0) return;
    const x = event.nativeEvent.locationX;
    const pctVal = Math.max(0.1, Math.min(1.0, x / sliderWidth));
    // Round to 1 decimal place
    setQuality(parseFloat(pctVal.toFixed(2)));
  };

  const convertImage = async () => {
    if (!selectedImage) return;

    setIsConverting(true);
    try {
      let saveFormat: ImageManipulator.SaveFormat;
      if (targetFormat === 'PNG') {
        saveFormat = ImageManipulator.SaveFormat.PNG;
      } else if (targetFormat === 'WEBP') {
        saveFormat = ImageManipulator.SaveFormat.WEBP;
      } else {
        saveFormat = ImageManipulator.SaveFormat.JPEG;
      }

      // Convert image using ImageManipulator
      const manipResult = await ImageManipulator.manipulateAsync(
        selectedImage,
        [],
        {
          format: saveFormat,
          compress: targetFormat === 'PNG' ? 1.0 : quality, // PNG compression is lossless, but manipulator supports quality logic if specified
        }
      );

      const fileInfo = await FileSystem.getInfoAsync(manipResult.uri);
      if (fileInfo.exists) {
        setConvertedSize(formatBytes(fileInfo.size));
      }
      setConvertedImage(manipResult.uri);
      setIsSuccess(true);
    } catch (error) {
      console.error('Conversion failed:', error);
      Alert.alert('Error', 'Failed to convert image. This format or quality might not be supported on this SDK.');
    } finally {
      setIsConverting(false);
    }
  };

  const saveImage = async () => {
    const imageToSave = convertedImage;
    if (!imageToSave) return;

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(imageToSave);
        Alert.alert('Success', 'Image saved to gallery!');
      } else {
        Alert.alert('Permission denied', 'Storage permissions are required to save images.');
      }
    } catch (error) {
      console.error('Save failed:', error);
      Alert.alert('Error', 'Failed to save image');
    }
  };

  const shareImage = async () => {
    const imageToShare = convertedImage;
    if (!imageToShare) return;

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(imageToShare);
      } else {
        Alert.alert('Sharing Not Available', 'Sharing is not supported on this device.');
      }
    } catch (error) {
      console.error('Sharing failed:', error);
      Alert.alert('Error', 'Failed to share image');
    }
  };

  const pct = quality * 100;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Image Converter</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {!selectedImage ? (
            <TouchableOpacity 
              style={[
                styles.uploadArea, 
                { 
                  backgroundColor: isDark ? '#262626' : '#F8FAFC', 
                  borderColor: isDark ? '#404040' : '#E2E8F0',
                  borderStyle: 'dashed',
                  borderWidth: 2
                }
              ]} 
              onPress={pickImage} 
              activeOpacity={0.7}
            >
              <View style={[styles.uploadIconCircle, { backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF' }]}>
                <Upload size={32} color={tintColor} />
              </View>
              <Text style={[styles.uploadText, { color: theme.text }]}>Choose an Image</Text>
              <Text style={styles.uploadSubtext}>Convert PNG, JPG, or WEBP instantly</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.previewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.previewImageContainer}>
                <Image 
                  source={{ uri: selectedImage }} 
                  style={[styles.previewImage, { backgroundColor: isDark ? '#1F1F1F' : '#F8FAFC' }]} 
                  resizeMode="contain"
                />
              </View>
              
              <View style={[styles.metaInfoRow, { borderBottomColor: theme.border }]}>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>Format</Text>
                  <Text style={[styles.metaVal, { color: theme.text }]}>{originalFormat}</Text>
                </View>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>Size</Text>
                  <Text style={[styles.metaVal, { color: theme.text }]}>{originalSize || 'Loading...'}</Text>
                </View>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>Name</Text>
                  <Text style={[styles.metaVal, { color: theme.text }]} numberOfLines={1}>{originalName}</Text>
                </View>
              </View>

              {!isSuccess && (
                <TouchableOpacity style={styles.changeButton} onPress={pickImage}>
                  <Text style={{ color: tintColor, fontWeight: '600' }}>Change Image</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {selectedImage && !isSuccess && (
            <View style={[styles.controlCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Conversion Target Settings</Text>
              
              {/* Target Format Selector */}
              <Text style={styles.inputLabel}>Select Output Format</Text>
              <View style={styles.formatSelectorRow}>
                {(['JPEG', 'PNG', 'WEBP'] as FormatType[]).map((fmt) => {
                  const isSelected = targetFormat === fmt;
                  return (
                    <TouchableOpacity
                      key={fmt}
                      style={[
                        styles.formatChip,
                        {
                          borderColor: isSelected ? tintColor : (isDark ? '#404040' : '#CBD5E1'),
                          backgroundColor: isSelected 
                            ? (isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF')
                            : (isDark ? '#1F1F1F' : '#F8FAFC'),
                          borderWidth: 1.5
                        }
                      ]}
                      onPress={() => setTargetFormat(fmt)}
                    >
                      <Text 
                        style={[
                          styles.formatChipText, 
                          { 
                            color: isSelected ? tintColor : (isDark ? '#94A3B8' : '#64748B'),
                            fontWeight: isSelected ? '700' : '500'
                          }
                        ]}
                      >
                        {fmt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Quality Settings (only relevant for lossy formats JPG and WEBP) */}
              {targetFormat !== 'PNG' && (
                <View style={styles.sliderSection}>
                  <View style={styles.sliderHeaderRow}>
                    <Text style={styles.inputLabel}>Quality Preset</Text>
                    <Text style={[styles.sliderTargetVal, { color: tintColor }]}>{Math.round(pct)}%</Text>
                  </View>
                  <View 
                    style={styles.sliderTrack}
                    onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
                    onStartShouldSetResponder={() => true}
                    onResponderGrant={handleTouch}
                    onResponderMove={handleTouch}
                  >
                    <View style={[styles.sliderBackgroundBar, { backgroundColor: isDark ? '#383838' : '#F1F5F9' }]} pointerEvents="none" />
                    <View style={[styles.sliderProgressBar, { width: `${pct}%`, backgroundColor: tintColor }]} pointerEvents="none" />
                    <View style={[styles.sliderThumb, { left: `${pct}%`, borderColor: tintColor, backgroundColor: isDark ? '#262626' : '#FFFFFF' }]} pointerEvents="none" />
                  </View>
                  <View style={styles.sliderLimitsRow}>
                    <Text style={styles.sliderLimitText}>Low (10%)</Text>
                    <Text style={styles.sliderLimitText}>Max (100%)</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: tintColor }]}
                onPress={convertImage}
                disabled={isConverting}
              >
                {isConverting ? (
                  <View style={styles.rowCentered}>
                    <ActivityIndicator color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryButtonText}>Converting...</Text>
                  </View>
                ) : (
                  <View style={styles.rowCentered}>
                    <RefreshCw size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryButtonText}>Convert Image</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {isSuccess && convertedImage && (
            <View style={[styles.successCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.successHeader}>
                <View style={styles.successIconCircle}>
                  <Check size={28} color="#FFF" />
                </View>
                <Text style={[styles.successTitle, { color: theme.text }]}>Converted Successfully!</Text>
                <Text style={styles.successSub}>Your image has been transformed to {targetFormat}.</Text>
              </View>

              <View style={[styles.convertedPreviewContainer, { borderColor: theme.border }]}>
                <Image 
                  source={{ uri: convertedImage }} 
                  style={[styles.convertedPreviewImage, { backgroundColor: isDark ? '#1F1F1F' : '#F8FAFC' }]} 
                  resizeMode="contain"
                />
              </View>

              <View style={[styles.metaCompareRow, { borderTopColor: theme.border, borderBottomColor: theme.border }]}>
                <View style={styles.compareCol}>
                  <Text style={styles.metaLabel}>Original Size</Text>
                  <Text style={[styles.metaVal, { color: theme.text }]}>{originalSize}</Text>
                </View>
                <View style={styles.compareCol}>
                  <Text style={styles.metaLabel}>New Size</Text>
                  <Text style={[styles.metaVal, { color: tintColor, fontWeight: '700' }]}>{convertedSize || 'Unknown'}</Text>
                </View>
              </View>

              <View style={styles.resultActionsRow}>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#10B981' }]} onPress={saveImage}>
                  <Download size={20} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionButtonText}>Save Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]} onPress={shareImage}>
                  <Share2 size={20} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionButtonText}>Share Image</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.resetButton, { borderColor: theme.border }]} 
                onPress={() => {
                  setSelectedImage(null);
                  setConvertedImage(null);
                  setIsSuccess(false);
                }}
              >
                <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontWeight: '600' }}>Convert Another</Text>
              </TouchableOpacity>
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  uploadArea: {
    height: 220,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 8,
  },
  uploadIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#94A3B8',
  },
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  previewImageContainer: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  metaInfoRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 4,
  },
  metaCol: {
    flex: 1,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  changeButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  controlCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 8,
  },
  formatSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  formatChip: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatChipText: {
    fontSize: 14,
  },
  sliderSection: {
    marginBottom: 24,
  },
  sliderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderTargetVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  sliderTrack: {
    height: 24,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderBackgroundBar: {
    height: 6,
    borderRadius: 3,
    width: '100%',
  },
  sliderProgressBar: {
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    left: 0,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    position: 'absolute',
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  sliderLimitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sliderLimitText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  rowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  successCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  successIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  successSub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  convertedPreviewContainer: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  convertedPreviewImage: {
    width: '100%',
    height: '100%',
  },
  metaCompareRow: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 12,
    marginBottom: 20,
  },
  compareCol: {
    flex: 1,
    alignItems: 'center',
  },
  resultActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  resetButton: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
});
