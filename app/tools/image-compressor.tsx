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
  Share,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Upload, Check, Download, Share2, Clock } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

export default function ImageCompressorScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const tintColor = '#6366F1';

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [compressedImage, setCompressedImage] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<string | null>(null);
  const [originalSizeInBytes, setOriginalSizeInBytes] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<string | null>(null);
  const [targetSizeKb, setTargetSizeKb] = useState<number>(100);
  const [sliderWidth, setSliderWidth] = useState<number>(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleBack = () => {
    if (selectedImage) {
      setSelectedImage(null);
      setCompressedImage(null);
      setCompressedSize(null);
      setOriginalSize(null);
      setOriginalSizeInBytes(0);
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
        setCompressedImage(null);
        setCompressedSize(null);
        setOriginalSize(null);
        setOriginalSizeInBytes(0);
        setIsSuccess(false);
        return true; // prevent screen pop
      }
      return false; // let hardware back press pop the route naturally
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [selectedImage]);

  const maxKb = Math.max(26, Math.round(originalSizeInBytes / 1024));
  const minKb = Math.min(25, Math.round(maxKb / 2));
  const pct = maxKb === minKb ? 100 : ((targetSizeKb - minKb) / (maxKb - minKb)) * 100;

  const handleTouch = (event: any) => {
    if (sliderWidth <= 0) return;
    const x = event.nativeEvent.locationX;
    const pctVal = Math.max(0, Math.min(1, x / sliderWidth));
    const newKb = Math.round(minKb + pctVal * (maxKb - minKb));
    setTargetSizeKb(newKb);
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const uri = result.assets[0].uri;
      setSelectedImage(uri);
      setCompressedImage(null);
      setIsSuccess(false);
      
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        setOriginalSize(formatBytes(fileInfo.size));
        setOriginalSizeInBytes(fileInfo.size);
        const sizeKb = Math.round(fileInfo.size / 1024);
        setTargetSizeKb(Math.max(25, Math.min(100, Math.round(sizeKb / 2))));
      }
    }
  };

  const compressImage = async () => {
    if (!selectedImage || !originalSizeInBytes) return;
    
    setIsCompressing(true);
    try {
      const targetBytes = targetSizeKb * 1024;
      
      let low = 0.01;
      let high = 1.0;
      let bestQuality = 0.5;
      let bestUri = '';
      let bestSize = 0;
      
      // Binary search for compression quality
      for (let i = 0; i < 5; i++) {
        const mid = (low + high) / 2;
        const manipResult = await ImageManipulator.manipulateAsync(
          selectedImage,
          [],
          { compress: mid, format: ImageManipulator.SaveFormat.JPEG }
        );
        
        const fileInfo = await FileSystem.getInfoAsync(manipResult.uri);
        const size = fileInfo.exists ? fileInfo.size : 0;
        
        if (size <= targetBytes) {
          bestUri = manipResult.uri;
          bestSize = size;
          bestQuality = mid;
          low = mid; // Try to get higher quality that fits target
        } else {
          high = mid; // Must compress more
          if (!bestUri) {
            bestUri = manipResult.uri;
            bestSize = size;
            bestQuality = mid;
          }
        }
      }
      
      setCompressedImage(bestUri);
      setCompressedSize(formatBytes(bestSize));
      setIsSuccess(true);
    } catch (error) {
      console.error('Compression failed:', error);
      Alert.alert('Error', 'Failed to compress image');
    } finally {
      setIsCompressing(false);
    }
  };

  const saveImage = async () => {
    const imageToSave = compressedImage || selectedImage;
    if (!imageToSave) return;

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(imageToSave);
        Alert.alert('Success', 'Image saved to gallery!');
      } else {
        Alert.alert('Permission denied', 'We need storage permission to save the image');
      }
    } catch (error) {
      console.error('Save failed:', error);
      Alert.alert('Error', 'Failed to save image');
    }
  };

  const shareImage = async () => {
    const imageToShare = compressedImage || selectedImage;
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Image Compressor</Text>
          <TouchableOpacity style={styles.historyButton}>
            <Clock size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {!selectedImage ? (
            <TouchableOpacity style={[styles.uploadArea, { backgroundColor: isDark ? '#262626' : '#F8FAFC', borderColor: theme.border }]} onPress={pickImage} activeOpacity={0.7}>
              <View style={[styles.uploadIconCircle, { backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : '#EEF2FF' }]}>
                <Upload size={32} color={tintColor} />
              </View>
              <Text style={[styles.uploadText, { color: theme.text }]}>Tap to Select Image</Text>
              <Text style={styles.uploadSubtext}>Supported: JPG, PNG, WEBP</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.previewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Image source={{ uri: selectedImage }} style={[styles.previewImage, { backgroundColor: isDark ? '#262626' : '#F8FAFC' }]} />
              
              <View style={styles.sizeInfoContainer}>
                <View style={styles.sizeBlock}>
                  <Text style={styles.sizeLabel}>Original</Text>
                  <Text style={[styles.sizeValue, { color: theme.text }]}>{originalSize || 'N/A'}</Text>
                </View>
                {compressedSize && (
                  <View style={styles.sizeBlock}>
                    <Text style={styles.sizeLabel}>Compressed</Text>
                    <Text style={[styles.sizeValue, { color: tintColor }]}>{compressedSize}</Text>
                  </View>
                )}
              </View>
              
              <TouchableOpacity style={styles.changeButton} onPress={pickImage}>
                <Text style={{ color: tintColor, fontWeight: '600' }}>Change Image</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedImage && (
            <View style={styles.controlSection}>
              {!isSuccess && (
                <View style={styles.sliderSection}>
                  <View style={styles.sliderHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Target File Size</Text>
                    <Text style={[styles.sliderTargetVal, { color: tintColor }]}>{targetSizeKb} KB</Text>
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
                    <Text style={styles.sliderLimitText}>{minKb} KB</Text>
                    <Text style={styles.sliderLimitText}>{maxKb} KB (Original)</Text>
                  </View>
                </View>
              )}

              <View style={styles.actionsContainer}>
                {!isSuccess ? (
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: tintColor }]}
                    onPress={compressImage}
                    disabled={isCompressing}
                  >
                    {isCompressing ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Compress Image</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.successContainer}>
                    <View style={[styles.successBadge, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
                      <Check size={16} color="#10B981" />
                      <Text style={styles.successText}>Compressed Successfully</Text>
                    </View>
                    
                    <View style={styles.buttonRow}>
                      <TouchableOpacity style={[styles.secondaryButton, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={saveImage}>
                        <Download size={20} color={theme.text} />
                        <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.secondaryButton, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={shareImage}>
                        <Share2 size={20} color={theme.text} />
                        <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Share</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
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
    
  },
  historyButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
  },
  uploadArea: {
    height: 280,
    borderRadius: 24,
    borderWidth: 2,
    
    borderStyle: 'dashed',
    
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  uploadIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
  previewCard: {
    borderRadius: 24,
    
    borderWidth: 1.5,
    
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  sizeInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  sizeBlock: {
    alignItems: 'center',
  },
  sizeLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  sizeValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  changeButton: {
    paddingVertical: 8,
  },
  controlSection: {
    gap: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    
    marginBottom: 12,
  },
  sliderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderTargetVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  sliderTrack: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
    marginTop: 8,
  },
  sliderBackgroundBar: {
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    left: 0,
    right: 0,
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
    top: 10, // centered: (40 - 20) / 2
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  sliderLimitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLimitText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  actionsContainer: {
    marginTop: 8,
    marginBottom: 40,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  successContainer: {
    alignItems: 'center',
    gap: 16,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  successText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  sliderSection: {},
});
