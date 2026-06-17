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
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { ArrowLeft, FileText, Trash2, Share2, Lock, ShieldAlert, CheckCircle2, Eye, EyeOff, Download } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { savePdfRecord } from '@/utils/pdfHistory';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt-lite';
import { decode as atob, encode as btoa } from 'base-64';

const { width } = Dimensions.get('window');

interface SelectedFile {
  name: string;
  uri: string;
  size?: number;
}

export default function PdfLockScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const tintColor = '#06B6D4'; // Cyan Protective Vibe

  const [file, setFile] = useState<SelectedFile | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lockedPdfUri, setLockedPdfUri] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [customFileName, setCustomFileName] = useState('');

  const isFocused = useIsFocused();

  React.useEffect(() => {
    if (!isFocused) return;

    const backAction = () => {
      if (isSuccess) {
        setIsSuccess(false);
        setFile(null);
        setPassword('');
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
      setPassword('');
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
        setLockedPdfUri(null);
      }
    } catch (error) {
      console.error('Error picking file:', error);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  const handleLockProcess = () => {
    if (!file) {
      Alert.alert('Selection Required', 'Please select a PDF file first.');
      return;
    }
    if (!password) {
      Alert.alert('Password Required', 'Please enter a password to lock the PDF.');
      return;
    }
    if (password.length < 3) {
      Alert.alert('Too Short', 'Password should be at least 3 characters.');
      return;
    }
    const dotIdx = file.name.lastIndexOf('.');
    const baseName = dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name;
    setCustomFileName(`${baseName}_protected`);
    setShowNamingModal(true);
  };

  const confirmAndStart = async () => {
    setShowNamingModal(false);
    startLock();
  };

  const startLock = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      // 1. Read base64
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: 'base64',
      });
      
      // 2. Convert base64 to Uint8Array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 3. Encrypt via pdf-encrypt-lite
      const encryptedBytes = await encryptPDF(bytes, password);

      // 4. Convert Uint8Array back to base64
      let binary = '';
      const len = encryptedBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(encryptedBytes[i]);
      }
      const encryptedBase64 = btoa(binary);

      // 5. Save output file
      const fileName = `${customFileName.trim() || 'protected'}.pdf`;
      const newPath = FileSystem.cacheDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(newPath, encryptedBase64, {
        encoding: 'base64',
      });

      setLockedPdfUri(newPath);

      // Save directly to Downloads folder silently on Android
      if (Platform.OS === 'android') {
        try {
          const downloadPath = `/storage/emulated/0/Download/${fileName}`;
          await FileSystem.writeAsStringAsync(downloadPath, encryptedBase64, { encoding: 'base64' });
        } catch (downloadErr) {
          console.warn('Downloads save failed:', downloadErr);
        }
      }

      // Register in Creations History
      try {
        const fileInfo = await FileSystem.getInfoAsync(newPath);
        const fileSize = fileInfo.exists ? fileInfo.size : undefined;
        await savePdfRecord({
          name: fileName,
          uri: newPath,
          tool: 'PDF Lock',
          size: fileSize,
          createdAt: Date.now(),
        });
      } catch (historyErr) {
        console.error('History log failed:', historyErr);
      }

      setIsSuccess(true);
    } catch (error) {
      console.error('PDF Encryption error:', error);
      Alert.alert('Error', 'Failed to password protect the PDF file. It might already be locked or corrupt.');
    } finally {
      setIsProcessing(false);
    }
  };

  const sharePdf = async () => {
    if (!lockedPdfUri) return;
    try {
      await Sharing.shareAsync(lockedPdfUri, { mimeType: 'application/pdf' });
    } catch (err) {
      Alert.alert('Error', 'Could not share PDF file.');
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ArrowLeft size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{isSuccess ? 'Success' : 'PDF Lock'}</Text>
            <View style={[styles.headerIcon, { backgroundColor: isDark ? 'rgba(6,182,212,0.12)' : '#ECFEFF' }]}>
              <Lock size={20} color={tintColor} />
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {!isSuccess ? (
              <View style={styles.stepContainer}>
                {/* File Upload Section */}
                {!file ? (
                  <TouchableOpacity style={[styles.uploadArea, { backgroundColor: isDark ? '#262626' : '#F8FAFC', borderColor: isDark ? '#383838' : '#E2E8F0' }]} onPress={pickFile}>
                    <View style={[styles.uploadIconCircle, { backgroundColor: isDark ? 'rgba(6,182,212,0.12)' : '#ECFEFF' }]}>
                      <FileText size={32} color={tintColor} />
                    </View>
                    <Text style={[styles.uploadTitle, { color: theme.text }]}>Choose PDF File</Text>
                    <Text style={styles.uploadSubtext}>Select a PDF to protect with a password</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.fileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.fileRow}>
                      <View style={[styles.fileIconWrapper, { backgroundColor: isDark ? 'rgba(6,182,212,0.12)' : '#ECFEFF' }]}>
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

                {/* Password Setting Section */}
                {file && (
                  <View style={[styles.settingsCard, { backgroundColor: theme.card }]}>
                    <Text style={[styles.settingsLabel, { color: theme.text }]}>Set Password</Text>
                    <View style={[styles.inputContainer, { backgroundColor: isDark ? '#171717' : '#F8FAFC', borderColor: theme.border }]}>
                      <TextInput
                        style={[styles.textInput, { color: theme.text }]}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Enter PDF password"
                        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                        {showPassword ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.passwordHint}>This password will be required whenever someone opens this PDF.</Text>

                    <TouchableOpacity style={[styles.processBtn, { backgroundColor: tintColor }]} onPress={handleLockProcess} disabled={isProcessing}>
                      {isProcessing ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <>
                          <Lock size={20} color="#FFF" />
                          <Text style={styles.processBtnText}>Encrypt & Lock PDF</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              // Success View
              <View style={styles.successContainer}>
                <CheckCircle2 size={64} color="#10B981" />
                <Text style={[styles.successTitle, { color: theme.text }]}>PDF Secured!</Text>
                <Text style={styles.successSubtext}>Your PDF file has been locked with password protection.</Text>

                <View style={[styles.successFileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <FileText size={40} color={tintColor} />
                  <Text style={[styles.successFileName, { color: theme.text }]} numberOfLines={1}>
                    {customFileName}.pdf
                  </Text>
                  <Text style={styles.saveLocationText}>Saved silently to device Downloads</Text>
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
                      setPassword('');
                    }}
                  >
                    <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Encrypt Another</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Naming Modal */}
          <Modal visible={showNamingModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Name Protected PDF</Text>
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
                    <Text style={styles.modalConfirmText}>Save & Lock</Text>
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
  },
  settingsLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 56,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
  },
  passwordHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 16,
  },
  processBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  processBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
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
    gap: 12,
  },
  successFileName: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  saveLocationText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
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
