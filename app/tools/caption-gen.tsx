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
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { 
  ArrowLeft, 
  Sparkle as SparkleIcon, 
  Copy, 
  RefreshCcw, 
  Hash, 
  Smile, 
  Globe, 
  MessageCircle, 
  Send 
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const TONES = [
  { id: 'witty', label: 'Witty', emoji: '😎' },
  { id: 'inspirational', label: 'Inspirational', emoji: '✨' },
  { id: 'minimalist', label: 'Minimalist', emoji: '🖤' },
  { id: 'professional', label: 'Professional', emoji: '💼' },
  { id: 'funny', label: 'Funny', emoji: '😂' },
];

const PLATFORMS = [
  { id: 'instagram', icon: Globe, label: 'Creative' },
  { id: 'twitter', icon: Send, label: 'Trending' },
  { id: 'linkedin', icon: MessageCircle, label: 'Professional' },
];

// --- ADVANCED CAPTION ENGINE DATA ---
const DATA: any = {
  witty: {
    hooks: [
      "Wait, did I actually do something today?",
      "Current status: Making history (or at least a mess).",
      "If you were looking for a sign, this is it.",
      "Keeping it 100% real, and 200% dramatic.",
      "Just another day of being incredibly over-prepared.",
      "They said I couldn't, so I did.",
      "Reality called, I hung up.",
      "Sassy, classy, and a bit bad-assy.",
      "I’m not a backup plan, and I’m definitely not a second choice.",
      "Life isn't perfect, but your outfit (and this post) can be."
    ],
    bodies: [
      "Spending my time wisely on {t}.",
      "Just me, myself, and {t}.",
      "Whatever is good for your soul, do that. Like {t}.",
      "Actually, {t} is my personality now.",
      "Proof that I can survive anything with {t}.",
      "Life is short, make every {t} count.",
      "If it involves {t}, I'm in.",
      "Happiness is a choice. My choice is {t}.",
      "Doing {t} like I mean it.",
      "Capturing the magic of {t}."
    ],
    closings: [
      "No further questions. 🎬",
      "Stay golden. ✨",
      "Adulting score: 10/10. 🏆",
      "Don't @ me. 💅",
      "Vibe check passed. ✅",
      "Just keep swimming. 🐠",
      "Living my best life. 🌈",
      "Peace out. ✌️",
      "Mic drop. 🎤",
      "You're welcome. 😉"
    ]
  },
  inspirational: {
    hooks: [
      "The best is yet to come.",
      "Dream big, work hard, stay focused.",
      "Success is a journey, not a destination.",
      "Believe you can and you're halfway there.",
      "Your only limit is you.",
      "Grow through what you go through.",
      "Every day is a second chance.",
      "Push yourself, no one else is going to do it for you.",
      "Great things never come from comfort zones.",
      "Start where you are. Use what you have. Do what you can."
    ],
    bodies: [
      "Focusing on the beauty of {t}.",
      "Turning my {t} into a masterpiece.",
      "Embracing the challenges of {t}.",
      "Letting {t} lead the way to greatness.",
      "Finding strength in the middle of {t}.",
      "Building a future fueled by {t}.",
      "The path to success always includes {t}.",
      "Manifesting the best version of {t}.",
      "Gratitude changes everything, especially {t}.",
      "Small steps lead to big {t} results."
    ],
    closings: [
      "Keep shining. ✨",
      "The sky is the limit. 🚀",
      "Stay inspired. 🌟",
      "Never give up. 💪",
      "Believe in the magic. 🪄",
      "Onwards and upwards. 📈",
      "Your time is now. 🕰️",
      "Choose joy. 😊",
      "Make it happen. 🎯",
      "With love and light. ❤️"
    ]
  },
  minimalist: {
    hooks: ["Less is more.", "Simple.", "Clean vibes.", "Quietly.", "Essence.", "Balance.", "Focused.", "Pure.", "Standard.", "Minimal."],
    bodies: ["{t}.", "All about {t}.", "Just {t}.", "Simply {t}.", "The {t} story.", "Purely {t}.", "Only {t}.", "Essence of {t}.", "Finding {t}.", "Centered on {t}."],
    closings: ["🖤", "✨", "☁️", "🕰️", "🌿", "🧘", "⚪", "📎", "🧊", "🌘"]
  },
  funny: {
    hooks: [
      "My life is a constant battle between...",
      "I followed my heart and it led me to the fridge.",
      "I’m not lazy, I’m just on energy-saving mode.",
      "I need a six-month vacation, twice a year.",
      "Adulting is like look both ways before crossing the street and getting hit by an airplane.",
      "I’m on a seafood diet. I see food and I eat it.",
      "My bank account says no, but my heart says yes.",
      "Life is short. Smile while you still have teeth.",
      "I’m not arguing, I’m just explaining why I’m right.",
      "I’m at that age where my back goes out more than I do."
    ],
    bodies: [
      "Trying to handle {t} like a pro.",
      "If {t} was an Olympic sport, I'd have a gold medal.",
      "My hobbies include {t} and overthinking.",
      "Currently looking for {t} motivation.",
      "Doing {t} because I can't afford a therapist.",
      "My life is 50% {t} and 50% trying to find my phone.",
      "I put the 'pro' in procrastinating {t}.",
      "If you think I'm crazy, you should see me doing {t}.",
      "Reality called, so I let {t} handle it.",
      "Whatever {t} says, I'm probably doing the opposite."
    ],
    closings: [
      "😂📱",
      "💀🔥",
      "🔋🔋",
      "😫💸",
      "🌴🍹",
      "💀",
      "🤡",
      "💅",
      "🤷‍♂️",
      "🚩"
    ]
  }
};

const EXTRA_HASHTAGS = [
  "#trending #viral #vibes #exploremore",
  "#contentcreator #igdaily #instagood #lifequotes",
  "#creative #style #motivation #picoftheday",
  "#photography #nature #love #goals",
  "#business #hustle #workmode #success"
];

export default function CaptionGeneratorScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const tintColor = '#3B82F6';

  const [topic, setTopic] = useState('');
  const [selectedTone, setSelectedTone] = useState('witty');
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [isGenerating, setIsGenerating] = useState(false);
  const [captions, setCaptions] = useState<string[]>([]);

  const generateCaptions = () => {
    if (!topic.trim()) {
      Alert.alert('Empty Topic', 'Please enter a topic!');
      return;
    }

    setIsGenerating(true);
    
    setTimeout(() => {
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(generateOneCaption(topic, selectedTone));
      }
      setCaptions(results);
      setIsGenerating(false);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }, 1200);
  };

  const generateOneCaption = (t: string, tone: string) => {
    const toneData = DATA[tone] || DATA.witty;
    
    const hook = toneData.hooks[Math.floor(Math.random() * toneData.hooks.length)];
    const body = toneData.bodies[Math.floor(Math.random() * toneData.bodies.length)].replace('{t}', t);
    const closing = toneData.closings[Math.floor(Math.random() * toneData.closings.length)];
    const hashtags = EXTRA_HASHTAGS[Math.floor(Math.random() * EXTRA_HASHTAGS.length)];
    
    if (tone === 'minimalist') return `${body} ${closing}`;
    
    const variations = [
      `${hook} ${body} ${closing}\n\n#${t.replace(/\s+/g, '')} ${hashtags}`,
      `${body} ${hook} ${closing}\n\n#${t.replace(/\s+/g, '')} ${hashtags}`,
      `${hook}\n\n${body}\n\n${closing}\n\n#${t.replace(/\s+/g, '')} ${hashtags}`
    ];
    
    return variations[Math.floor(Math.random() * variations.length)];
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert('Copied', 'Caption copied successfully.');
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>Caption Generator</Text>
          <View style={[styles.headerIcon, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF' }]}>
            <SparkleIcon size={20} color={tintColor} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.inputCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.label, { color: theme.text }]}>What&apos;s the topic? 💡</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: isDark ? '#171717' : '#F8FAFC',
                  color: theme.text,
                  borderColor: theme.border,
                  borderWidth: 1.5,
                },
              ]}
              placeholder="e.g. My new car, Sunday morning..."
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={topic}
              onChangeText={setTopic}
              multiline
            />

            <View style={styles.selectorContainer}>
              <Text style={[styles.subLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Platform</Text>
              <View style={styles.platformRow}>
                {PLATFORMS.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.platformBtn, { backgroundColor: isDark ? '#262626' : '#F1F5F9' }, selectedPlatform === p.id && { backgroundColor: tintColor }]}
                    onPress={() => setSelectedPlatform(p.id)}
                  >
                    <p.icon size={18} color={selectedPlatform === p.id ? '#FFF' : (isDark ? '#94A3B8' : '#64748B')} />
                    <Text style={[styles.platformText, { color: isDark ? '#94A3B8' : '#64748B' }, selectedPlatform === p.id && { color: '#FFF' }]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.selectorContainer}>
              <Text style={[styles.subLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Mood / Tone</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toneScroll}>
                {TONES.map((tone) => (
                  <TouchableOpacity
                    key={tone.id}
                    style={[styles.toneBtn, { backgroundColor: isDark ? '#262626' : '#FFFFFF', borderColor: isDark ? '#383838' : '#F1F5F9' }, selectedTone === tone.id && { borderColor: tintColor, backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF' }]}
                    onPress={() => setSelectedTone(tone.id)}
                  >
                    <Text style={styles.toneEmoji}>{tone.emoji}</Text>
                    <Text style={[styles.toneText, { color: isDark ? '#94A3B8' : '#64748B' }, selectedTone === tone.id && { color: tintColor }]}>{tone.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity 
              style={[styles.generateBtn, { backgroundColor: tintColor }]} 
              onPress={generateCaptions}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <SparkleIcon size={20} color="#FFFFFF" />
                  <Text style={styles.generateBtnText}>Magic Write</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {captions.length > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={[styles.resultsTitle, { color: theme.text }]}>Generated Captions</Text>
              {captions.map((caption, index) => (
                <View key={index} style={[styles.captionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.captionText, { color: theme.text }]}>{caption}</Text>
                  <TouchableOpacity style={[styles.copyBtn, { borderTopColor: isDark ? '#383838' : '#F1F5F9' }]} onPress={() => copyToClipboard(caption)}>
                    <Copy size={16} color={tintColor} />
                    <Text style={[styles.copyBtnText, { color: tintColor }]}>Copy Caption</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {captions.length === 0 && !isGenerating && (
            <View style={styles.emptyState}>
              <Smile size={48} color={isDark ? '#383838' : '#E2E8F0'} />
              <Text style={styles.emptyText}>Enter a topic and let the magic happen! ✨</Text>
            </View>
          )}
        </ScrollView>
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
  inputCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  textInput: {
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  selectorContainer: {
    marginBottom: 20,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  platformRow: {
    flexDirection: 'row',
    gap: 8,
  },
  platformBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  platformText: {
    fontSize: 12,
    fontWeight: '700',
  },
  toneScroll: {
    flexDirection: 'row',
  },
  toneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    marginRight: 10,
    gap: 6,
  },
  toneEmoji: {
    fontSize: 16,
  },
  toneText: {
    fontSize: 13,
    fontWeight: '600',
  },
  generateBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resultsContainer: {
    gap: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  captionCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  captionText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  copyBtnText: {
    fontSize: 13,
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
  },
});
