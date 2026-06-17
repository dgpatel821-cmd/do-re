import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { ArrowLeft, FileText, Trash2, Share2, Clock, Merge, FileStack, GripVertical } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { savePdfRecord } from '@/utils/pdfHistory';
import { PDFDocument } from 'pdf-lib';
import { decode as atob } from 'base-64';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');
const SAVE_DIRECTORY_KEY = 'multikit_pdf_save_dir';

interface SelectedFile {
  id: string;
  name: string;
  uri: string;
  size?: number;
}

export default function PdfMergeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const tintColor = '#EF4444'; 

  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedPdfUri, setMergedPdfUri] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [customFileName, setCustomFileName] = useState('');

  const isFocused = useIsFocused();

  React.useEffect(() => {
    if (!isFocused) return;

    const backAction = () => {
      if (isSuccess) {
        setIsSuccess(false);
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
    } else {
      router.back();
    }
  };

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map(asset => ({
          id: Math.random().toString(36).substr(2, 9),
          name: asset.name,
          uri: asset.uri,
          size: asset.size,
        }));
        setFiles([...files, ...newFiles]);
        setIsSuccess(false);
        setMergedPdfUri(null);
      }
    } catch (error) {
      console.error('Error picking files:', error);
    }
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const handleMergeProcess = () => {
    if (files.length < 2) {
      Alert.alert('Selection Required', 'Please select at least 2 PDF files to merge.');
      return;
    }
    setCustomFileName(`Merged_DocReader_${Date.now()}`);
    setShowNamingModal(true);
  };

  const confirmAndStart = async () => {
    setShowNamingModal(false);
    startMerge();
  };

  const startMerge = async () => {
    setIsMerging(true);
    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        try {
          const base64 = await FileSystem.readAsStringAsync(file.uri, {
            encoding: 'base64',
          });
          
          // More robust way to handle base64 to bytes
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const pdf = await PDFDocument.load(bytes);
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } catch (fileErr) {
          console.error(`Failed to load file ${file.name}:`, fileErr);
          // Skip corrupt files but continue with others
        }
      }

      const mergedPdfBase64 = await mergedPdf.saveAsBase64();
      const fileName = `${customFileName.trim() || 'Merged_Doc'}.pdf`;
      const newPath = FileSystem.cacheDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(newPath, mergedPdfBase64, {
        encoding: 'base64',
      });

      setMergedPdfUri(newPath);

      // Try saving directly to Android Downloads folder silently
      if (Platform.OS === 'android') {
        try {
          const downloadPath = `/storage/emulated/0/Download/${fileName}`;
          await FileSystem.writeAsStringAsync(downloadPath, mergedPdfBase64, { encoding: 'base64' });
        } catch (downloadErr) {
          console.warn('Direct Download folder save failed:', downloadErr);
        }
      }

      // Save to My Creations
      try {
        const fileInfo = await FileSystem.getInfoAsync(newPath);
        const fileSize = fileInfo.exists ? fileInfo.size : undefined;
        await savePdfRecord({
          name: fileName,
          uri: newPath,
          tool: 'PDF Merge',
          size: fileSize,
          createdAt: Date.now(),
        });
      } catch (historyErr) {
        console.error('History save error:', historyErr);
      }

      setIsSuccess(true);
    } catch (error) {
      console.error('Merge failed:', error);
      Alert.alert('Error', 'Failed to merge PDF files. Some files might be encrypted or too large.');
    } finally {
      setIsMerging(false);
    }
  };

  const sharePdf = async () => {
    if (!mergedPdfUri) return;
    try {
      await Sharing.shareAsync(mergedPdfUri);
    } catch (error) {
      console.error('Sharing failed:', error);
    }
  };

  const openPdf = async () => {
    if (!mergedPdfUri) return;
    try {
      await Sharing.shareAsync(mergedPdfUri, { mimeType: 'application/pdf' });
    } catch { /* ignore */ }
  };

  const renderFileItem = ({ item, drag, isActive, getIndex }: RenderItemParams<SelectedFile>) => {
    const index = getIndex();
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          style={[
            styles.fileRow,
            { backgroundColor: isDark ? theme.card : '#FFFFFF', borderColor: isDark ? theme.border : '#F1F5F9' },
            isActive && { backgroundColor: isDark ? '#383838' : '#F1F5F9', elevation: 4 }
          ]}
        >
          <View style={[styles.numberBadge, { backgroundColor: tintColor }]}>
            <Text style={styles.numberBadgeText}>{(index ?? 0) + 1}</Text>
          </View>
          <View style={[styles.fileIconWrapper, { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2' }]}>
            <FileText size={24} color={tintColor} />
          </View>
          <View style={styles.fileInfo}>
            <Text style={[styles.fileName, { color: isDark ? '#F1F5F9' : '#0F172A' }]} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.fileSize}>
              {item.size ? (item.size / 1024 / 1024).toFixed(2) + ' MB' : 'Size unknown'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => removeFile(item.id)} style={styles.rowDelete}>
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
            <Text style={[styles.headerTitle, { color: theme.text }]}>PDF Merge</Text>
            <TouchableOpacity style={styles.historyButton}>
              <Clock size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {files.length === 0 ? (
            <View style={styles.scrollContent}>
              <TouchableOpacity style={[styles.uploadArea, { backgroundColor: isDark ? '#262626' : '#F8FAFC', borderColor: theme.border }]} onPress={pickFiles} activeOpacity={0.7}>
                <View style={[styles.uploadIconCircle, { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2' }]}>
                  <Merge size={32} color={tintColor} />
                </View>
                <Text style={[styles.uploadText, { color: theme.text }]}>Tap to Select PDF Files</Text>
                <Text style={[styles.uploadSubtext, { color: isDark ? '#64748B' : '#94A3B8' }]}>Select 2 or more files to combine</Text>
              </TouchableOpacity>
            </View>
          ) : !isSuccess ? (
            <View style={styles.listContainer}>
              <View style={styles.listHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{files.length} Files Selected</Text>
                <TouchableOpacity onPress={pickFiles}>
                  <Text style={{ color: tintColor, fontWeight: '600' }}>Add More</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.dragHint, { color: isDark ? '#64748B' : '#94A3B8' }]}>Long press and drag to reorder</Text>

              <DraggableFlatList
                data={files}
                onDragEnd={({ data }) => setFiles(data)}
                keyExtractor={(item) => item.id}
                renderItem={renderFileItem}
                containerStyle={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
              />

              <View style={styles.bottomAction}>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: tintColor }]}
                  onPress={handleMergeProcess}
                  disabled={isMerging}
                >
                  {isMerging ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Merge size={20} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={styles.primaryButtonText}>Merge PDFs</Text>
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
                    <FileStack size={100} color="#EF4444" />
                    <View style={styles.pdfLabel}>
                      <Text style={styles.pdfLabelText}>PDF</Text>
                    </View>
                  </View>
                  <Text style={[styles.pdfNameText, { color: theme.text }]} numberOfLines={1}>{customFileName || 'Merged_DocReader'}.pdf</Text>
                </View>

                <View style={styles.screenshotActions}>
                  <TouchableOpacity style={styles.blackButton} onPress={sharePdf}>
                    <Text style={styles.blackButtonText}>SHARE</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={styles.resetButton} 
                  onPress={() => {
                    setFiles([]);
                    setIsSuccess(false);
                    setMergedPdfUri(null);
                  }}
                >
                  <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontWeight: '700' }}>Merge More Files</Text>
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
                  <Text style={styles.modalConfirmText}>Merge</Text>
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
  historyButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    // backgroundColor moved to inline (isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2')
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
    // color moved to inline (isDark ? '#64748B' : '#94A3B8')
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
    // color moved to inline (isDark ? '#64748B' : '#94A3B8')
    marginBottom: 16,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    // backgroundColor moved to inline (isDark ? theme.card : '#FFFFFF')
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    // borderColor moved to inline (isDark ? theme.border : '#F1F5F9')
  },
  fileIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    // backgroundColor moved to inline (isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2')
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  numberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  numberBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '700',
    // color moved to inline (isDark ? '#F1F5F9' : '#0F172A')
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#94A3B8',
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
    // borderColor moved to inline (isDark ? '#383838' : '#E2E8F0')
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
