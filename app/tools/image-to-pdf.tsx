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
  Platform,
  ScrollView,
  Modal,
  TextInput,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { ArrowLeft, Upload, FileText, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { savePdfRecord } from '@/utils/pdfHistory';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');
const SAVE_DIRECTORY_KEY = 'multikit_pdf_save_dir';

interface SelectedImage {
  id: string;
  uri: string;
}

export default function ImageToPdfScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const tintColor = '#EF4444'; 

  const [images, setImages] = useState<SelectedImage[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [customFileName, setCustomFileName] = useState('');

  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) return;

    const backAction = () => {
      if (isSuccess) {
        setIsSuccess(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isSuccess, isFocused]);

  const handleBack = () => {
    if (isSuccess) {
      setIsSuccess(false);
    } else {
      router.back();
    }
  };

  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => ({
          id: Math.random().toString(36).substr(2, 9),
          uri: asset.uri,
        }));
        setImages([...images, ...newImages]);
        setIsSuccess(false);
        setPdfUri(null);
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to pick images');
    }
  };

  const removeImage = (id: string) => {
    setImages(images.filter(img => img.id !== id));
  };

  const handleConversionProcess = () => {
    if (images.length === 0) return;
    setCustomFileName(`DocReader_${Date.now()}`);
    setShowNamingModal(true);
  };

  const confirmAndStart = async () => {
    setShowNamingModal(false);
    startConversion();
  };

  const startConversion = async () => {
    setIsConverting(true);
    try {
      const { PDFDocument, rgb } = await import('pdf-lib');
      const { decode: b64decode } = await import('base-64');

      // A4 dimensions in PDF points (72 dpi)
      const PAGE_W = 595.28;
      const PAGE_H = 841.89;

      const pdfDoc = await PDFDocument.create();

      for (const img of images) {
        // Optimize image
        const result = await ImageManipulator.manipulateAsync(
          img.uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        if (!result.base64) continue;

        // Convert base64 to Uint8Array
        const binaryStr = b64decode(result.base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        // Embed JPEG directly into PDF
        const jpgImage = await pdfDoc.embedJpg(bytes);
        const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

        // Scale image to fit page while keeping aspect ratio
        const imgWidth = jpgImage.width;
        const imgHeight = jpgImage.height;
        const scaleX = PAGE_W / imgWidth;
        const scaleY = PAGE_H / imgHeight;
        const scale = Math.min(scaleX, scaleY);
        const drawW = imgWidth * scale;
        const drawH = imgHeight * scale;
        const x = (PAGE_W - drawW) / 2;
        const y = (PAGE_H - drawH) / 2;

        page.drawImage(jpgImage, { x, y, width: drawW, height: drawH });
      }

      const mergedBase64 = await pdfDoc.saveAsBase64();
      const finalFileName = `${customFileName.trim() || 'DocReader_Doc'}.pdf`;
      const finalPath = FileSystem.cacheDirectory + finalFileName;
      await FileSystem.writeAsStringAsync(finalPath, mergedBase64, { encoding: 'base64' });
      setPdfUri(finalPath);

      // Try saving directly to Android Downloads folder silently
      if (Platform.OS === 'android') {
        try {
          const downloadPath = `/storage/emulated/0/Download/${finalFileName}`;
          await FileSystem.writeAsStringAsync(downloadPath, mergedBase64, { encoding: 'base64' });
        } catch (downloadErr) {
          console.warn('Direct Download folder save failed:', downloadErr);
        }
      }

      // Save to My Creations
      try {
        const fileInfo = await FileSystem.getInfoAsync(finalPath);
        const fileSize = fileInfo.exists ? fileInfo.size : undefined;
        const firstImageUri = images.length > 0 ? images[0].uri : undefined;
        await savePdfRecord({
          name: finalFileName,
          uri: finalPath,
          tool: 'Image to PDF',
          size: fileSize,
          createdAt: Date.now(),
          thumbnailUri: firstImageUri,
        });
      } catch (historyErr) {
        console.error('History save error:', historyErr);
      }

      setIsSuccess(true);
    } catch (error: any) {
      console.error('PDF conversion failed:', error);
      Alert.alert('Conversion Failed', error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  const sharePdf = async () => {
    if (!pdfUri) return;
    try {
      await Sharing.shareAsync(pdfUri);
    } catch (error) {
      console.error('Sharing failed:', error);
    }
  };

  const openPdf = async () => {
    if (!pdfUri) return;
    try {
      await Sharing.shareAsync(pdfUri, { mimeType: 'application/pdf' });
    } catch { /* ignore */ }
  };

  const renderImageItem = ({ item, drag, isActive, getIndex }: RenderItemParams<SelectedImage>) => {
    const index = getIndex();
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          style={[
            styles.imageRow,
            isActive && { backgroundColor: isDark ? '#383838' : '#F1F5F9', elevation: 4 }
          ]}
        >
          <View style={[styles.numberBadge, { backgroundColor: tintColor }]}>
            <Text style={styles.numberBadgeText}>{(index ?? 0) + 1}</Text>
          </View>
          <Image source={{ uri: item.uri }} style={styles.rowThumb} />
          <Text style={[styles.rowText, { color: theme.text }]} numberOfLines={1}>Page {(index ?? 0) + 1}</Text>
          <TouchableOpacity onPress={() => removeImage(item.id)} style={styles.rowDelete}>
            <Trash2 size={20} color="#FDA4AF" />
          </TouchableOpacity>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ArrowLeft size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Image to PDF</Text>
            <View style={{ width: 40 }} />
          </View>

          {images.length === 0 ? (
            <View style={styles.scrollContent}>
              <TouchableOpacity style={[styles.uploadArea, { backgroundColor: isDark ? '#262626' : '#F8FAFC', borderColor: theme.border }]} onPress={pickImages} activeOpacity={0.7}>
                <View style={[styles.uploadIconCircle, { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2' }]}>
                  <Upload size={32} color={tintColor} />
                </View>
                <Text style={[styles.uploadText, { color: theme.text }]}>Tap to Select Images</Text>
                <Text style={styles.uploadSubtext}>Select one or more images</Text>
              </TouchableOpacity>
            </View>
          ) : !isSuccess ? (
            <View style={styles.listContainer}>
              <View style={styles.listHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{images.length} Images Selected</Text>
                <TouchableOpacity onPress={pickImages}>
                  <Text style={{ color: tintColor, fontWeight: '600' }}>Add More</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.dragHint}>Long press and drag to reorder</Text>

              <DraggableFlatList
                data={images}
                onDragEnd={({ data }) => setImages(data)}
                keyExtractor={(item) => item.id}
                renderItem={renderImageItem}
                containerStyle={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
              />

              <View style={styles.bottomAction}>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: tintColor }]}
                  onPress={handleConversionProcess}
                  disabled={isConverting}
                >
                  {isConverting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <FileText size={20} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={styles.primaryButtonText}>Convert to PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.successContainer}>
                <View style={styles.previewFrame}>
                  <View style={[styles.pdfIconContainer, { borderColor: isDark ? '#383838' : '#E2E8F0' }]}>
                    {images.length > 0 ? (
                      <Image source={{ uri: images[0].uri }} style={styles.previewThumbnail} />
                    ) : (
                      <FileText size={80} color="#EF4444" />
                    )}
                    <View style={styles.pdfLabel}>
                      <Text style={styles.pdfLabelText}>PDF</Text>
                    </View>
                  </View>
                  <Text style={[styles.pdfNameText, { color: theme.text }]} numberOfLines={1}>{customFileName || 'DocReader_Document'}.pdf</Text>
                </View>

                <View style={styles.screenshotActions}>
                  <TouchableOpacity style={[styles.blackButton, { backgroundColor: isDark ? '#F1F5F9' : '#000' }]} onPress={sharePdf}>
                    <Text style={[styles.blackButtonText, { color: isDark ? '#000' : '#FFF' }]}>SHARE</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={styles.resetButton} 
                  onPress={() => {
                    setImages([]);
                    setIsSuccess(false);
                    setPdfUri(null);
                  }}
                >
                  <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontWeight: '700' }}>Create Another PDF</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>

        {/* File Naming Modal */}
        <Modal visible={showNamingModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.namingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>File Name</Text>
              <TextInput
                style={[styles.fileNameInput, { backgroundColor: isDark ? '#262626' : '#F8FAFC', color: theme.text, borderColor: theme.border }]}
                value={customFileName}
                onChangeText={setCustomFileName}
                placeholder="Enter file name"
                autoFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalCancel, { backgroundColor: isDark ? '#383838' : '#F1F5F9' }]} 
                  onPress={() => setShowNamingModal(false)}
                >
                  <Text style={[styles.modalCancelText, { color: isDark ? '#CBD5E1' : '#64748B' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalConfirm, { backgroundColor: tintColor }]}
                  onPress={confirmAndStart}
                >
                  <Text style={styles.modalConfirmText}>Convert</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    
  },
  scrollContent: {
    padding: 24,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 24,
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
    backgroundColor: 'transparent',
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
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    
  },
  dragHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 16,
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    
  },
  numberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  numberBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  rowThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  rowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    
  },
  rowDelete: {
    padding: 8,
  },
  bottomAction: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  successContainer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  previewFrame: {
    alignItems: 'center',
    marginBottom: 40,
  },
  pdfIconContainer: {
    width: 200,
    height: 260,
        borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  previewThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  pdfLabel: {
    position: 'absolute',
    top: 20,
    left: 10,
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pdfLabelText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
  },
  pdfNameText: {
    fontSize: 20,
    fontWeight: '800',
    
  },
  screenshotActions: {
    width: '100%',
    gap: 16,
    marginBottom: 40,
  },
  blackButton: {
    backgroundColor: '#000',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blackButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  whiteButton: {
    
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    
    justifyContent: 'center',
    alignItems: 'center',
  },
  whiteButtonText: {
    
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  resetButton: {
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  namingCard: {
    width: '100%',
    
    borderRadius: 24,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    
    marginBottom: 20,
  },
  fileNameInput: {
    height: 56,
    
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    
    borderWidth: 1.5,
    
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '700',
    
  },
  modalConfirm: {
    flex: 2,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
