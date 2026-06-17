import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Hash, 
  Copy, 
  Check, 
  Sparkle as SparkleIcon,
  Globe,
  TrendingUp,
  Zap,
  Grid
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'viral', label: 'Viral/Trending', icon: Zap, color: '#F59E0B' },
  { id: 'photography', label: 'Photography', icon: Globe, color: '#3B82F6' },
  { id: 'travel', label: 'Travel', icon: Globe, color: '#10B981' },
  { id: 'business', label: 'Business', icon: TrendingUp, color: '#6366F1' },
  { id: 'fitness', label: 'Fitness/Gym', icon: Zap, color: '#EF4444' },
  { id: 'food', label: 'Foodie', icon: Grid, color: '#EC4899' },
];

const HASHTAG_DB: any = {
  viral: [
    '#explore', '#foryou', '#viral', '#trending', '#viralreels', '#fyp', '#instagood', '#love', '#photography', '#reelitfeelit',
    '#explorepage', '#follow', '#likeforlikes', '#memes', '#india', '#trendingreels', '#nature', '#travel', '#fashion', '#style',
    '#instadaily', '#picoftheday', '#bhfyp', '#viralvideo', '#foryoupage', '#videocreator', '#bollywood', '#smile', '#happy', '#vibes'
  ],
  photography: [
    '#photography', '#photooftheday', '#naturephotography', '#portrait', '#streetphotography', '#landscape', '#canonindia', '#nikon', '#art', '#lightroom',
    '#model', '#photographers_of_india', '#shutterhubindia', '#incredibleindia', '#travelphotography', '#picoftheday', '#photoshoot', '#visuals', '#moodygrams', '#earth',
    '#sunset', '#macrophotography', '#wildlifephotography', '#blackandwhite', '#composition', '#shotoniphone', '#mobilephotography', '#creative', '#lens', '#focus'
  ],
  travel: [
    '#travel', '#travelphotography', '#nature', '#wanderlust', '#travelgram', '#vacation', '#adventure', '#explore', '#incredibleindia', '#trip',
    '#mountains', '#beach', '#backpacker', '#soloatraveller', '#travelblogger', '#tourism', '#beautifuldestinations', '#earthfocus', '#traveling', '#roadtrip',
    '#landscape', '#sunset', '#himalayas', '#paradise', '#explorepage', '#goa', '#manali', '#rajasthan', '#kerela', '#uttarakhand'
  ],
  business: [
    '#business', '#entrepreneur', '#startup', '#marketing', '#success', '#motivation', '#smallbusiness', '#hustle', '#money', '#growth',
    '#digitalmarketing', '#leadership', '#mindset', '#goals', '#businessowner', '#investing', '#finance', '#wealth', '#workhard', '#professional',
    '#strategy', '#network', '#sales', '#ecommerce', '#branding', '#innovation', '#creativity', '#focus', '#india', '#makeinindia'
  ],
  fitness: [
    '#fitness', '#gym', '#workout', '#motivation', '#bodybuilding', '#fitnessmotivation', '#health', '#training', '#lifestyle', '#fitindia',
    '#yoga', '#crossfit', '#abs', '#muscle', '#strong', '#diet', '#nutrition', '#cardio', '#goals', '#discipline',
    '#running', '#sports', '#athlete', '#fitnessmodel', '#gymlife', '#active', '#healthyfood', '#physique', '#powerlifting', '#shredded'
  ],
  food: [
    '#food', '#foodie', '#foodphotography', '#instafood', '#yummy', '#delicious', '#foodblogger', '#streetfoodindia', '#homemade', '#cooking',
    '#dinner', '#lunch', '#breakfast', '#healthyfood', '#tasty', '#foodstagram', '#chef', '#dessert', '#maggi', '#chai',
    '#pizza', '#burger', '#indianfood', '#spices', '#vegetarian', '#paneer', '#mumbai-street-food', '#sweet', '#bakery', '#foodlover'
  ]
};

export default function HashtagGeneratorScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const tintColor = '#6366F1'; // Premium Indigo

  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('viral');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateHashtags = () => {
    setIsGenerating(true);
    setCopied(false);
    
    setTimeout(() => {
      let baseSet = [...HASHTAG_DB[selectedCategory]];
      
      // If keyword is provided, inject it and its variations
      if (keyword.trim()) {
        const cleanKeyword = keyword.trim().replace(/\s+/g, '');
        const customTags = [
          `#${cleanKeyword}`,
          `#${cleanKeyword}life`,
          `#${cleanKeyword}vibes`,
          `#${cleanKeyword}india`,
          `#${cleanKeyword}daily`,
          `#love${cleanKeyword}`,
          `#best${cleanKeyword}`
        ];
        // Replace some base tags with custom tags
        baseSet = [...customTags, ...baseSet.slice(0, 23)];
      }

      // Shuffle a bit for "Magic" feel
      const shuffled = baseSet.sort(() => 0.5 - Math.random());
      setHashtags(shuffled);
      setIsGenerating(false);
      
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    }, 1000);
  };

  const copyAll = async () => {
    const text = hashtags.join(' ');
    await Clipboard.setStringAsync(text);
    setCopied(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleTag = (tag: string) => {
    // Basic interaction: remove tag on tap
    setHashtags(prev => prev.filter(t => t !== tag));
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>Hashtag Generator</Text>
          <View style={[styles.headerIcon, { backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : '#EEF2FF' }]}>
            <Hash size={20} color={tintColor} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Top Info Card */}
          <View style={[styles.inputCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.text }]}>Niche / Keyword</Text>
            <View
              style={[
                styles.keywordContainer,
                {
                  backgroundColor: isDark ? '#171717' : '#F8FAFC',
                  borderColor: theme.border,
                  borderWidth: 1.5,
                },
              ]}
            >
              <Hash size={20} color="#94A3B8" />
              <TextInput
                style={[styles.keywordInput, { color: isDark ? theme.text : '#0F172A' }]}
                placeholder="Enter topic (e.g. Nature, Gym)"
                value={keyword}
                onChangeText={setKeyword}
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              />
            </View>

            <Text style={[styles.label, { marginTop: 20, color: theme.text }]}>Select Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catBtn,
                    { borderColor: isDark ? '#383838' : '#F1F5F9' },
                    selectedCategory === cat.id && { backgroundColor: cat.color, borderColor: cat.color }
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <cat.icon size={16} color={selectedCategory === cat.id ? '#FFF' : (isDark ? '#94A3B8' : '#64748B')} />
                  <Text style={[styles.catText, { color: isDark ? '#94A3B8' : '#64748B' }, selectedCategory === cat.id && { color: '#FFF' }]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.generateBtn, { backgroundColor: tintColor }]} 
              onPress={generateHashtags}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <SparkleIcon size={20} color="#FFFFFF" />
                  <Text style={styles.generateBtnText}>Find Viral Tags</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Results Section */}
          {hashtags.length > 0 && (
            <View style={styles.resultsContainer}>
              <View style={styles.resultsHeader}>
                <Text style={[styles.resultsTitle, { color: theme.text }]}>{hashtags.length} Optimized Tags</Text>
                <TouchableOpacity 
                  style={[styles.copyAllBtn, { backgroundColor: copied ? '#10B981' : (isDark ? '#262626' : '#F1F5F9') }]} 
                  onPress={copyAll}
                >
                  {copied ? (
                    <Check size={16} color="#FFF" />
                  ) : (
                    <Copy size={16} color={tintColor} />
                  )}
                  <Text style={[styles.copyAllText, { color: copied ? '#FFF' : tintColor }]}>
                    {copied ? 'Copied!' : 'Copy All'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.hint}>Tap on a tag to remove it</Text>

              <View style={styles.tagCloud}>
                {hashtags.map((tag, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.tagPill, { backgroundColor: isDark ? '#262626' : '#F1F5F9', borderColor: isDark ? '#383838' : '#E2E8F0' }]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[styles.tagText, { color: isDark ? '#CBD5E1' : '#383838' }]}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {hashtags.length === 0 && !isGenerating && (
            <View style={styles.emptyState}>
              <TrendingUp size={48} color="#E2E8F0" />
              <Text style={styles.emptyText}>Find the best hashtags to boost your reach! 🚀</Text>
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
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  keywordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  keywordInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
    height: '100%',
    paddingVertical: 0,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  catText: {
    fontSize: 12,
    fontWeight: '700',
  },
  generateBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resultsContainer: {
        borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '800',
    
  },
  copyAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyAllText: {
    fontSize: 12,
    fontWeight: '800',
  },
  hint: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 16,
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
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
