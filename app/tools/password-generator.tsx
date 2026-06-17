import React, { useState, useEffect, useCallback } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Copy, RefreshCw, Shield, ShieldAlert, ShieldCheck, Lock } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const STRENGTH_LEVELS = [
  { label: 'Weak', color: '#EF4444', minPoints: 0 },
  { label: 'Fair', color: '#F59E0B', minPoints: 2 },
  { label: 'Strong', color: '#10B981', minPoints: 4 },
  { label: 'Secure', color: '#6366F1', minPoints: 5 },
];

export default function PasswordGeneratorScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const tintColor = '#F59E0B'; // Golden Utility Theme

  const [password, setPassword] = useState('');
  const [length, setLength] = useState(12);
  const [includeUpper, setIncludeUpper] = useState(true);
  const [includeLower, setIncludeLower] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [strength, setStrength] = useState(STRENGTH_LEVELS[0]);

  const generatePassword = useCallback(() => {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
    
    let chars = '';
    if (includeUpper) chars += upper;
    if (includeLower) chars += lower;
    if (includeNumbers) chars += numbers;
    if (includeSymbols) chars += symbols;
    
    if (chars === '') {
      setPassword('Select at least one option');
      return;
    }
    
    let generatedPassword = '';
    for (let i = 0; i < length; i++) {
      generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    setPassword(generatedPassword);
    calculateStrength(generatedPassword);
  }, [length, includeUpper, includeLower, includeNumbers, includeSymbols]);

  const calculateStrength = (pass: string) => {
    let points = 0;
    if (pass.length > 8) points += 1;
    if (pass.length > 12) points += 1;
    if (/[A-Z]/.test(pass)) points += 1;
    if (/[0-9]/.test(pass)) points += 1;
    if (/[^A-Za-z0-9]/.test(pass)) points += 1;
    
    const level = STRENGTH_LEVELS.reduce((prev, curr) => 
      points >= curr.minPoints ? curr : prev
    );
    setStrength(level);
  };

  useEffect(() => {
    generatePassword();
  }, [generatePassword]);

  const copyToClipboard = async () => {
    if (password === 'Select at least one option') return;
    await Clipboard.setStringAsync(password);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert('Copied', 'Password copied to clipboard safely!');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Password Generator</Text>
          <View style={styles.headerIcon}>
            <Lock size={20} color={tintColor} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Password Preview Card */}
          <View style={[styles.previewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.passwordContainer}>
              <Text style={styles.passwordText} numberOfLines={2}>
                {password}
              </Text>
              <TouchableOpacity onPress={generatePassword} style={styles.refreshBtn}>
                <RefreshCw size={22} color={tintColor} />
              </TouchableOpacity>
            </View>

            {/* Strength Meter */}
            <View style={styles.strengthSection}>
              <View style={styles.strengthInfo}>
                <Text style={styles.strengthLabel}>Security Level</Text>
                <Text style={[styles.strengthValue, { color: strength.color }]}>{strength.label}</Text>
              </View>
              <View style={[styles.meterBg, { backgroundColor: isDark ? '#171717' : '#F1F5F9' }]}>
                <View 
                  style={[
                    styles.meterFill, 
                    { 
                      width: `${(STRENGTH_LEVELS.indexOf(strength) + 1) * 25}%`,
                      backgroundColor: strength.color 
                    }
                  ]} 
                />
              </View>
            </View>

            <TouchableOpacity style={styles.copyBtn} onPress={copyToClipboard}>
              <Copy size={20} color="#FFFFFF" />
              <Text style={styles.copyBtnText}>Copy Secure Password</Text>
            </TouchableOpacity>
          </View>

          {/* Configuration Section */}
          <View style={styles.configSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Password Settings</Text>
            
            <View style={styles.lengthContainer}>
              <View style={styles.lengthHeader}>
                <Text style={[styles.configLabel, { color: theme.text }]}>Length</Text>
                <Text style={styles.lengthValue}>{length}</Text>
              </View>
              <View style={styles.lengthControls}>
                {[8, 12, 16, 20, 24, 32].map((l) => {
                  const isSelected = length === l;
                  return (
                    <TouchableOpacity
                      key={l}
                      style={[
                        styles.lengthOption,
                        { backgroundColor: isDark ? '#262626' : '#FFFFFF', borderColor: isDark ? '#383838' : '#E2E8F0' },
                        isSelected && { backgroundColor: tintColor, borderColor: tintColor }
                      ]}
                      onPress={() => setLength(l)}
                    >
                      <Text style={[
                        styles.lengthOptionText,
                        { color: isDark ? '#94A3B8' : '#64748B' },
                        isSelected && { color: '#FFF' }
                      ]}>{l}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>


            <View style={[styles.optionsGrid, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <OptionRow 
                label="Uppercase (A-Z)" 
                value={includeUpper} 
                onValueChange={setIncludeUpper} 
                tint={tintColor} 
              />
              <OptionRow 
                label="Lowercase (a-z)" 
                value={includeLower} 
                onValueChange={setIncludeLower} 
                tint={tintColor} 
              />
              <OptionRow 
                label="Numbers (0-9)" 
                value={includeNumbers} 
                onValueChange={setIncludeNumbers} 
                tint={tintColor} 
              />
              <OptionRow 
                label="Symbols (!@#$)" 
                value={includeSymbols} 
                onValueChange={setIncludeSymbols} 
                tint={tintColor} 
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function OptionRow({ label, value, onValueChange, tint }: any) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  return (
    <View style={styles.optionRow}>
      <Text style={[styles.optionLabel, { color: theme.text }]}>{label}</Text>
      <Switch
        trackColor={{ false: '#E2E8F0', true: tint + '40' }}
        thumbColor={value ? tint : '#94A3B8'}
        onValueChange={onValueChange}
        value={value}
      />
    </View>
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
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
  },
  scrollContent: {
    padding: 24,
  },
  previewCard: {
    
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 32,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passwordText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  refreshBtn: {
    padding: 8,
  },
  strengthSection: {
    marginBottom: 24,
  },
  strengthInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  strengthLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  strengthValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  meterBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 3,
  },
  copyBtn: {
    backgroundColor: '#0F172A',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  configSection: {
    gap: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  lengthContainer: {
    gap: 12,
  },
  lengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '700',
    
  },
  lengthValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F59E0B',
  },
  lengthControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  lengthOption: {
    width: (width - 48 - 50) / 6,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lengthOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  optionsGrid: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    
  },
  tipCard: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginTop: 32,
    gap: 12,
    alignItems: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    fontWeight: '500',
  },
});
