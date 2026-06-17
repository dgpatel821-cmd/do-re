import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { 
  ArrowLeft, 
  Sparkle as SparkleIcon, 
  Copy, 
  Briefcase, 
  Smile, 
  Zap, 
  PenTool,
  History,
  Check
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const TONES = [
  { id: 'pro', label: 'Professional', icon: Briefcase, color: '#6366F1' },
  { id: 'friendly', label: 'Friendly', icon: Smile, color: '#10B981' },
  { id: 'creative', label: 'Creative', icon: PenTool, color: '#EC4899' },
  { id: 'urgent', label: 'Urgent', icon: Zap, color: '#F59E0B' },
];

export default function AIRewriterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const tintColor = '#8B5CF6'; // AI Purple

  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [selectedTone, setSelectedTone] = useState('pro');
  const [isRewriting, setIsRewriting] = useState(false);
  const [copied, setCopied] = useState(false);

  const rewriteText = () => {
    if (!inputText.trim()) {
      Alert.alert('Empty Text', 'Please enter some text first!');
      return;
    }

    setIsRewriting(true);
    setCopied(false);
    
    // Simulate AI Thinking
    setTimeout(() => {
      const result = performRewrite(inputText, selectedTone);
      setOutputText(result);
      setIsRewriting(false);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 2000);
  };

  const performRewrite = (text: string, tone: string) => {
    const t = text.toLowerCase();
    
    // --- SMART REWRITE ENGINE ---
    // This uses a logic-based mapping to simulate AI understanding
    
    if (tone === 'pro') {
      if (t.includes('want to quit') || t.includes('leaving')) return "I am writing to formally communicate my decision to resign from my current position.";
      if (t.includes('sorry') || t.includes('late')) return "I sincerely apologize for the delay and any inconvenience this may have caused.";
      if (t.includes('thanks') || t.includes('thank you')) return "I would like to express my sincere gratitude for your assistance and professional support.";
      if (t.includes('help me')) return "I would greatly appreciate your professional guidance and assistance regarding this matter.";
      return `[Professional Rewrite]: I am reaching out to discuss the following: "${text}". I look forward to your professional feedback on this subject.`;
    }

    if (tone === 'friendly') {
      if (t.includes('want to quit')) return "Hey! Just wanted to let you know I'm moving on to a new adventure. It's been great working together!";
      if (t.includes('sorry') || t.includes('late')) return "So sorry for being late! Hope everything is still good on your end. 😊";
      if (t.includes('thanks')) return "Thanks a ton! You're a lifesaver. Really appreciate the help!";
      return `Hey! Just thought I'd share this with you: "${text}". Let me know what you think! Cheers. ✨`;
    }

    if (tone === 'creative') {
      if (t.includes('want to quit')) return "Setting sail for new horizons and leaving this harbor behind. The journey continues! ⛵✨";
      if (t.includes('sorry')) return "Time slipped through my fingers today, but I'm back in the rhythm now! ⏳✨";
      return `Imagine a world where: "${text}". That's the vibe I'm going for. Truly magical! 🪄🌈`;
    }

    if (tone === 'urgent') {
      return `IMPORTANT: ${text.toUpperCase()}. Action required immediately. Please acknowledge receipt as soon as possible. ⚡🚨`;
    }

    return text;
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(outputText);
    setCopied(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>AI Text Rewriter</Text>
          <View style={[styles.headerIcon, { backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : '#F5F3FF' }]}>
            <SparkleIcon size={20} color={tintColor} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Input Area */}
          <View style={[styles.inputCard, { backgroundColor: theme.card }]}>
            <View style={styles.cardHeader}>
              <History size={16} color={isDark ? '#94A3B8' : '#64748B'} />
              <Text style={[styles.cardTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>Original Text</Text>
            </View>
            <TextInput
              style={[styles.textInput, { backgroundColor: isDark ? '#262626' : '#F8FAFC', color: theme.text, borderColor: theme.border }]}
              placeholder="Type or paste your text here..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              placeholderTextColor="#94A3B8"
            />

            {/* Tone Selector */}
            <Text style={[styles.label, { color: theme.text }]}>Choose Tone</Text>
            <View style={styles.toneGrid}>
              {TONES.map((tone) => (
                <TouchableOpacity
                  key={tone.id}
                  style={[
                    styles.toneBtn,
                    selectedTone === tone.id && { backgroundColor: tone.color, borderColor: tone.color }
                  ]}
                  onPress={() => setSelectedTone(tone.id)}
                >
                  <tone.icon size={16} color={selectedTone === tone.id ? '#FFF' : (isDark ? '#94A3B8' : '#64748B')} />
                  <Text style={[styles.toneText, { color: isDark ? '#94A3B8' : '#64748B' }, selectedTone === tone.id && { color: '#FFF' }]}>{tone.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.rewriteBtn, { backgroundColor: tintColor }]} 
              onPress={rewriteText}
              disabled={isRewriting}
            >
              {isRewriting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <SparkleIcon size={20} color="#FFFFFF" />
                  <Text style={styles.rewriteBtnText}>Rewrite with AI</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Output Area */}
          {(outputText || isRewriting) && (
            <View style={[styles.outputCard, { backgroundColor: theme.card, borderColor: isDark ? '#4C1D95' : '#DDD6FE' }]}>
              <View style={styles.cardHeader}>
                <SparkleIcon size={16} color={tintColor} />
                <Text style={[styles.cardTitle, { color: tintColor }]}>AI Rewritten Result</Text>
              </View>
              
              {isRewriting ? (
                <View style={styles.thinkingContainer}>
                  <Text style={styles.thinkingText}>AI is analyzing your text...</Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.outputText, { color: theme.text }]}>{outputText}</Text>
                  <TouchableOpacity 
                    style={[styles.copyBtn, { backgroundColor: copied ? '#10B981' : (isDark ? '#262626' : '#F1F5F9') }]} 
                    onPress={copyToClipboard}
                  >
                    {copied ? (
                      <Check size={18} color="#FFF" />
                    ) : (
                      <Copy size={18} color={tintColor} />
                    )}
                    <Text style={[styles.copyBtnText, { color: copied ? '#FFF' : tintColor }]}>
                      {copied ? 'Copied to Clipboard!' : 'Copy Rewritten Text'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {!outputText && !isRewriting && (
            <View style={styles.emptyState}>
              <PenTool size={48} color={isDark ? '#383838' : '#E2E8F0'} />
              <Text style={styles.emptyText}>Write something and see the AI magic! ✨</Text>
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
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  scrollContent: {
    padding: 20,
  },
  inputCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  toneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  toneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  toneText: {
    fontSize: 12,
    fontWeight: '700',
  },
  rewriteBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  rewriteBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  outputCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  thinkingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  thinkingText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  outputText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  copyBtn: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  copyBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
    gap: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: '80%',
  },
});
