import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Share,
  Keyboard,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Link as LinkIcon,
  Copy,
  Share2,
  QrCode,
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
  Sparkles,
  ExternalLink,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const HISTORY_STORAGE_KEY = 'multikit_link_shortener_history';

interface HistoryItem {
  id: string;
  original: string;
  short: string;
  timestamp: number;
}

export default function LinkShortenerScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const tintColor = '#06B6D4'; // Cyan theme for Link Tools

  const [longUrl, setLongUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const saved = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading history:', e);
    }
  };

  const saveHistory = async (newHistory: HistoryItem[]) => {
    try {
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
      setHistory(newHistory);
    } catch (e) {
      console.error('Error saving history:', e);
    }
  };

  const handleShorten = async () => {
    if (!longUrl.trim()) {
      Alert.alert('Required', 'Please enter or paste a long URL.');
      return;
    }

    // Basic URL validation
    let targetUrl = longUrl.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    setIsLoading(true);
    Keyboard.dismiss();

    try {
      const randomChars = Math.random().toString(36).substring(2, 7);
      const finalAlias = `multikit_${randomChars}`;

      let responseText = '';
      let attempts = 0;
      let aliasToUse = finalAlias;

      while (attempts < 3) {
        let apiUrl = `https://ulvis.net/api.php?url=${encodeURIComponent(targetUrl)}&custom=${encodeURIComponent(aliasToUse)}`;
        const response = await fetch(apiUrl);
        responseText = await response.text();

        if (responseText && responseText.startsWith('Error: Custom name already taken')) {
          const newRandom = Math.random().toString(36).substring(2, 7);
          aliasToUse = `multikit_${newRandom}`;
          attempts++;
        } else {
          break;
        }
      }

      if (responseText && responseText.startsWith('https://ulvis.net')) {
        const shortResult = responseText.trim();
        setShortUrl(shortResult);
        setShowQr(false);

        // Add to history
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          original: targetUrl,
          short: shortResult,
          timestamp: Date.now(),
        };

        const updatedHistory = [newItem, ...history.filter(item => item.original !== targetUrl)].slice(0, 15);
        await saveHistory(updatedHistory);
      } else if (responseText && responseText.startsWith('Error:')) {
        Alert.alert('Shorten Failed', responseText.replace('Error:', '').trim());
      } else {
        Alert.alert('Error', 'Something went wrong. Please check your URL and try again.');
      }
    } catch (error) {
      console.error('Shorten Error:', error);
      Alert.alert('Connection Error', 'Unable to reach the shortening server. Check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setLongUrl(text);
    }
  };

  const handleCopy = async (url: string) => {
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async (url: string) => {
    try {
      await Share.share({
        message: `Check out this link: ${url}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteHistoryItem = async (id: string) => {
    const updated = history.filter(item => item.id !== id);
    await saveHistory(updated);
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all shortened link history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await saveHistory([]);
          },
        },
      ]
    );
  };

  const handleReset = () => {
    setLongUrl('');
    setShortUrl('');
    setShowQr(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Link Shortener</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Input Form */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardLabel, { color: theme.text }]}>Paste Long URL</Text>
            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#171717' : '#F8FAFC', borderColor: isDark ? '#383838' : '#E2E8F0' }]}>
              <LinkIcon size={20} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.textInput, { color: theme.text }]}
                value={longUrl}
                onChangeText={setLongUrl}
                placeholder="Paste URL here..."
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                multiline={false}
                numberOfLines={1}
              />
              {longUrl.length > 0 ? (
                <TouchableOpacity onPress={() => setLongUrl('')} style={[styles.clearBtn, { backgroundColor: isDark ? '#262626' : '#F1F5F9' }]}>
                  <Text style={[styles.clearBtnText, { color: isDark ? '#94A3B8' : '#64748B' }]}>Clear</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handlePaste} style={[styles.pasteBtn, { backgroundColor: isDark ? 'rgba(6, 182, 212, 0.15)' : '#ECFEFF' }]}>
                  <Text style={[styles.pasteBtnText, { color: tintColor }]}>Paste</Text>
                </TouchableOpacity>
              )}
            </View>

            {shortUrl ? (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: isDark ? '#262626' : '#F1F5F9' }]}
                onPress={handleReset}
              >
                <Text style={[styles.actionButtonText, { color: isDark ? '#94A3B8' : '#475569' }]}>Shorten Another</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: tintColor }]}
                onPress={handleShorten}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Sparkles size={18} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.actionButtonText}>Shorten URL</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Results Card */}
          {shortUrl.length > 0 && !isLoading && (
            <View style={[styles.card, styles.resultCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.resultLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Shortened Link</Text>
              <View style={[styles.resultRow, { backgroundColor: isDark ? 'rgba(13, 148, 136, 0.15)' : '#F0FDFA', borderColor: isDark ? '#0D9488' : '#99F6E4' }]}>
                <Text numberOfLines={1} style={[styles.resultText, { color: isDark ? '#2DD4BF' : '#0D9488' }]}>
                  {shortUrl}
                </Text>
                <TouchableOpacity
                  style={styles.visitBtn}
                  onPress={() => Share.share({ message: shortUrl })}
                >
                  <ExternalLink size={16} color={tintColor} />
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={styles.resultActions}>
                <TouchableOpacity
                  style={[
                    styles.resultBtn, 
                    styles.copyBtn, 
                    { 
                      backgroundColor: isDark ? 'rgba(6, 182, 212, 0.15)' : '#ECFEFF', 
                      borderColor: isDark ? '#06B6D4' : '#A5F3FC' 
                    }
                  ]}
                  onPress={() => handleCopy(shortUrl)}
                >
                  {copied ? (
                    <>
                      <Check size={18} color="#10B981" style={{ marginRight: 6 }} />
                      <Text style={[styles.resultBtnText, { color: '#10B981' }]}>Copied</Text>
                    </>
                  ) : (
                    <>
                      <Copy size={18} color={tintColor} style={{ marginRight: 6 }} />
                      <Text style={[styles.resultBtnText, { color: tintColor }]}>Copy Link</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.resultBtn, styles.shareBtn, { backgroundColor: tintColor }]}
                  onPress={() => handleShare(shortUrl)}
                >
                  <Share2 size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={[styles.resultBtnText, { color: '#FFF' }]}>Share Link</Text>
                </TouchableOpacity>
              </View>

              {/* QR Toggle Button */}
              <TouchableOpacity
                style={[styles.qrToggle, { backgroundColor: isDark ? '#262626' : '#F8FAFC', borderColor: isDark ? '#383838' : '#E2E8F0' }]}
                onPress={() => setShowQr(!showQr)}
                activeOpacity={0.7}
              >
                <QrCode size={18} color={isDark ? '#CBD5E1' : '#475569'} style={{ marginRight: 8 }} />
                <Text style={[styles.qrToggleText, { color: isDark ? '#CBD5E1' : '#475569' }]}>{showQr ? 'Hide QR Code' : 'Generate QR Code'}</Text>
              </TouchableOpacity>

              {/* QR Code Container */}
              {showQr && (
                <View style={[styles.qrContainer, { borderTopColor: isDark ? '#383838' : '#F1F5F9' }]}>
                  <Image
                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shortUrl)}` }}
                    style={styles.qrImage}
                  />
                  <Text style={styles.qrWarning}>
                    Scanning this QR redirects users to your shortened link.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* History Section */}
          {history.length > 0 && (
            <View style={styles.historySection}>
              <View style={styles.historyHeader}>
                <Text style={[styles.historyTitle, { color: theme.text }]}>Recent Short Links</Text>
                <TouchableOpacity onPress={handleClearHistory}>
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>

              {history.map((item) => (
                <View key={item.id} style={[styles.historyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.historyInfo}>
                    <Text numberOfLines={1} style={styles.historyShort}>
                      {item.short}
                    </Text>
                    <Text numberOfLines={1} style={styles.historyOriginal}>
                      {item.original}
                    </Text>
                  </View>
                  <View style={styles.historyActions}>
                    <TouchableOpacity
                      style={[styles.historyActionBtn, { backgroundColor: isDark ? '#383838' : '#F8FAFC' }]}
                      onPress={() => handleCopy(item.short)}
                    >
                      <Copy size={16} color="#64748B" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.historyActionBtn, { backgroundColor: isDark ? '#383838' : '#F8FAFC' }]}
                      onPress={() => handleShare(item.short)}
                    >
                      <Share2 size={16} color="#64748B" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.historyActionBtn, { backgroundColor: isDark ? '#383838' : '#F8FAFC' }]}
                      onPress={() => handleDeleteHistoryItem(item.id)}
                    >
                      <Trash2 size={16} color="#FDA4AF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
          <View style={{ height: 40 }} />
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
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 20,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#383838',
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 52,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    
    height: '100%',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  pasteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ECFEFF',
    borderRadius: 8,
  },
  pasteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0891B2',
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  customToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 12,
  },
  customToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0891B2',
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 52,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  customPrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginRight: 2,
  },
  customInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    height: '100%',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  actionButton: {
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 10,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  formActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  resultCard: {
    
    
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '800',
    
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 16,
  },
  resultText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0D9488',
    flex: 1,
  },
  visitBtn: {
    padding: 6,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  resultBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyBtn: {
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A5F3FC',
  },
  shareBtn: {
    elevation: 2,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  qrToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
  },
  qrToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  qrImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  qrWarning: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  historySection: {
    marginTop: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '800',
    
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    
    marginBottom: 8,
  },
  historyInfo: {
    flex: 1,
    marginRight: 10,
  },
  historyShort: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0891B2',
  },
  historyOriginal: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  historyActions: {
    flexDirection: 'row',
    gap: 4,
  },
  historyActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    
    justifyContent: 'center',
    alignItems: 'center',
  },
});
