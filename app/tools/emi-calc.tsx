import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Platform,
  Share,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { ArrowLeft, Share2, Copy, RotateCcw, Check, Plus, Minus } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function EmiCalculatorScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const tintColor = '#F59E0B'; // Amber Gold for Finance Tools

  // Input states
  const [principal, setPrincipal] = useState(''); // Starts empty for 0 calculation
  const [interestRate, setInterestRate] = useState(''); // Starts empty
  const [tenure, setTenure] = useState(''); // Starts empty
  const [tenureType, setTenureType] = useState<'years' | 'months'>('years');
  const [copied, setCopied] = useState(false);

  // Result states
  const [results, setResults] = useState({
    monthlyEmi: 0,
    totalInterest: 0,
    totalPayment: 0,
    principalPercentage: 100,
    interestPercentage: 0,
  });

  useEffect(() => {
    calculateEmi();
  }, [principal, interestRate, tenure, tenureType]);

  const calculateEmi = () => {
    const P = parseFloat(principal) || 0;
    const annualRate = parseFloat(interestRate) || 0;
    const t = parseFloat(tenure) || 0;

    if (P <= 0 || annualRate <= 0 || t <= 0) {
      setResults({
        monthlyEmi: 0,
        totalInterest: 0,
        totalPayment: 0,
        principalPercentage: 100,
        interestPercentage: 0,
      });
      return;
    }

    const monthlyRate = annualRate / 12 / 100;
    const numberOfMonths = tenureType === 'years' ? t * 12 : t;

    let emi = 0;
    if (monthlyRate === 0) {
      emi = P / numberOfMonths;
    } else {
      emi = (P * monthlyRate * Math.pow(1 + monthlyRate, numberOfMonths)) / 
            (Math.pow(1 + monthlyRate, numberOfMonths) - 1);
    }

    const totalPayable = emi * numberOfMonths;
    const totalInterestPayable = totalPayable - P;

    const principalPct = (P / totalPayable) * 100;
    const interestPct = (totalInterestPayable / totalPayable) * 100;

    setResults({
      monthlyEmi: Math.round(emi),
      totalInterest: Math.round(totalInterestPayable),
      totalPayment: Math.round(totalPayable),
      principalPercentage: parseFloat(principalPct.toFixed(1)),
      interestPercentage: parseFloat(interestPct.toFixed(1)),
    });
  };

  const adjustValue = (type: 'principal' | 'rate' | 'tenure', operation: 'inc' | 'dec') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (type === 'principal') {
      const val = parseFloat(principal) || 0;
      const step = 50000; // 50k steps
      const newVal = operation === 'inc' ? val + step : Math.max(0, val - step);
      setPrincipal(newVal.toString());
    } else if (type === 'rate') {
      const val = parseFloat(interestRate) || 0;
      const step = 0.25; // 0.25% steps
      const newVal = operation === 'inc' ? val + step : Math.max(0, val - step);
      setInterestRate(newVal.toString());
    } else if (type === 'tenure') {
      const val = parseFloat(tenure) || 0;
      const step = 1;
      const newVal = operation === 'inc' ? val + step : Math.max(0, val - step);
      setTenure(newVal.toString());
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const copyToClipboard = async () => {
    const summaryText = `Loan EMI Details:\n` +
      `Principal Amount: ${formatCurrency(parseFloat(principal) || 0)}\n` +
      `Interest Rate: ${interestRate}% p.a.\n` +
      `Tenure: ${tenure} ${tenureType === 'years' ? 'Years' : 'Months'}\n` +
      `---------------------------------\n` +
      `Monthly EMI: ${formatCurrency(results.monthlyEmi)}\n` +
      `Total Interest Payable: ${formatCurrency(results.totalInterest)}\n` +
      `Total Amount Payable: ${formatCurrency(results.totalPayment)}`;

    await Clipboard.setStringAsync(summaryText);
    setCopied(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const shareSummary = async () => {
    const summaryText = `Loan EMI Calculation:\n` +
      `Loan Amount: ${formatCurrency(parseFloat(principal) || 0)}\n` +
      `Monthly EMI: ${formatCurrency(results.monthlyEmi)}`;
    try {
      await Share.share({ message: summaryText });
    } catch (error) {
      console.log(error);
    }
  };

  const resetCalculator = () => {
    setPrincipal('');
    setInterestRate('');
    setTenure('');
    setTenureType('years');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>EMI Calculator</Text>
          <TouchableOpacity onPress={resetCalculator} style={styles.resetButton}>
            <RotateCcw size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main EMI Result Display */}
          <View style={styles.emiDisplayCard}>
            <Text style={styles.emiLabel}>Monthly EMI</Text>
            <Text style={styles.emiValue}>{formatCurrency(results.monthlyEmi)}</Text>
            
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Total Interest</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(results.totalInterest)}</Text>
              </View>
              <View style={[styles.breakdownItem, styles.leftBorder]}>
                <Text style={styles.breakdownLabel}>Total Payment</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(results.totalPayment)}</Text>
              </View>
            </View>

            {/* Proportion Progress Bar */}
            {results.totalPayment > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBarWrapper}>
                  <View style={[styles.progressSegment, { width: `${results.principalPercentage}%`, backgroundColor: '#F59E0B' }]} />
                  <View style={[styles.progressSegment, { width: `${results.interestPercentage}%`, backgroundColor: '#E2E8F0' }]} />
                </View>
                <View style={styles.legendContainer}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={styles.legendText}>Principal ({results.principalPercentage}%)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#E2E8F0' }]} />
                    <Text style={styles.legendText}>Interest ({results.interestPercentage}%)</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Input Controls */}
          <View style={[styles.inputCard, { backgroundColor: theme.card }]}>
            {/* Principal Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>Loan Amount (₹)</Text>
              <View style={[styles.numericAdjustmentWrapper, { backgroundColor: isDark ? '#171717' : '#F1F5F9' }]}>
                <TouchableOpacity onPress={() => adjustValue('principal', 'dec')} style={[styles.adjBtn, { backgroundColor: isDark ? '#262626' : '#FFFFFF' }]}>
                  <Minus size={18} color={isDark ? '#CBD5E1' : '#64748B'} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.numericTextInput, { color: theme.text }]}
                  value={principal}
                  onChangeText={setPrincipal}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity onPress={() => adjustValue('principal', 'inc')} style={[styles.adjBtn, { backgroundColor: isDark ? '#262626' : '#FFFFFF' }]}>
                  <Plus size={18} color={isDark ? '#CBD5E1' : '#64748B'} />
                </TouchableOpacity>
              </View>
              <View style={styles.quickSelectorRow}>
                {['500000', '1000000', '2000000', '5000000'].map((amt) => {
                  const isSelected = principal === amt;
                  return (
                    <TouchableOpacity
                      key={amt}
                      style={[
                        styles.quickBtn,
                        { borderColor: isDark ? '#383838' : '#E2E8F0' },
                        isSelected && {
                          borderColor: tintColor,
                          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7'
                        }
                      ]}
                      onPress={() => setPrincipal(amt)}
                    >
                      <Text style={[
                        styles.quickBtnText,
                        { color: isDark ? '#94A3B8' : '#64748B' },
                        isSelected && { color: isDark ? '#F59E0B' : '#D97706' }
                      ]}>
                        ₹{parseInt(amt) >= 10000000 ? `${parseInt(amt)/10000000}Cr` : `${parseInt(amt)/100000}L`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Interest Rate Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>Interest Rate (% p.a.)</Text>
              <View style={[styles.numericAdjustmentWrapper, { backgroundColor: isDark ? '#171717' : '#F1F5F9' }]}>
                <TouchableOpacity onPress={() => adjustValue('rate', 'dec')} style={[styles.adjBtn, { backgroundColor: isDark ? '#262626' : '#FFFFFF' }]}>
                  <Minus size={18} color={isDark ? '#CBD5E1' : '#64748B'} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.numericTextInput, { color: theme.text }]}
                  value={interestRate}
                  onChangeText={setInterestRate}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity onPress={() => adjustValue('rate', 'inc')} style={[styles.adjBtn, { backgroundColor: isDark ? '#262626' : '#FFFFFF' }]}>
                  <Plus size={18} color={isDark ? '#CBD5E1' : '#64748B'} />
                </TouchableOpacity>
              </View>
              <View style={styles.quickSelectorRow}>
                {['6.5', '8.5', '10.5', '12.5'].map((rate) => {
                  const isSelected = interestRate === rate;
                  return (
                    <TouchableOpacity
                      key={rate}
                      style={[
                        styles.quickBtn,
                        { borderColor: isDark ? '#383838' : '#E2E8F0' },
                        isSelected && {
                          borderColor: tintColor,
                          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7'
                        }
                      ]}
                      onPress={() => setInterestRate(rate)}
                    >
                      <Text style={[
                        styles.quickBtnText,
                        { color: isDark ? '#94A3B8' : '#64748B' },
                        isSelected && { color: isDark ? '#F59E0B' : '#D97706' }
                      ]}>
                        {rate}%
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Tenure Input */}
            <View style={styles.inputGroup}>
              <View style={styles.tenureHeader}>
                <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#475569', marginBottom: 0 }]}>Loan Tenure</Text>
                <View style={[styles.toggleTypeContainer, { backgroundColor: isDark ? '#171717' : '#F1F5F9' }]}>
                  <TouchableOpacity
                    style={[styles.typeBtn, tenureType === 'years' && [styles.typeBtnActive, { backgroundColor: isDark ? '#262626' : '#FFFFFF' }]]}
                    onPress={() => setTenureType('years')}
                  >
                    <Text style={[styles.typeBtnText, { color: isDark ? '#94A3B8' : '#64748B' }, tenureType === 'years' && { color: '#F59E0B' }]}>Years</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeBtn, tenureType === 'months' && [styles.typeBtnActive, { backgroundColor: isDark ? '#262626' : '#FFFFFF' }]]}
                    onPress={() => setTenureType('months')}
                  >
                    <Text style={[styles.typeBtnText, { color: isDark ? '#94A3B8' : '#64748B' }, tenureType === 'months' && { color: '#F59E0B' }]}>Months</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[styles.numericAdjustmentWrapper, { backgroundColor: isDark ? '#171717' : '#F1F5F9' }]}>
                <TouchableOpacity onPress={() => adjustValue('tenure', 'dec')} style={[styles.adjBtn, { backgroundColor: isDark ? '#262626' : '#FFFFFF' }]}>
                  <Minus size={18} color={isDark ? '#CBD5E1' : '#64748B'} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.numericTextInput, { color: theme.text }]}
                  value={tenure}
                  onChangeText={setTenure}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity onPress={() => adjustValue('tenure', 'inc')} style={[styles.adjBtn, { backgroundColor: isDark ? '#262626' : '#FFFFFF' }]}>
                  <Plus size={18} color={isDark ? '#CBD5E1' : '#64748B'} />
                </TouchableOpacity>
              </View>
              <View style={styles.quickSelectorRow}>
                {(tenureType === 'years' ? ['5', '10', '15', '20'] : ['60', '120', '180', '240']).map((ten) => {
                  const isSelected = tenure === ten;
                  return (
                    <TouchableOpacity
                      key={ten}
                      style={[
                        styles.quickBtn,
                        { borderColor: isDark ? '#383838' : '#E2E8F0' },
                        isSelected && {
                          borderColor: tintColor,
                          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7'
                        }
                      ]}
                      onPress={() => setTenure(ten)}
                    >
                      <Text style={[
                        styles.quickBtnText,
                        { color: isDark ? '#94A3B8' : '#64748B' },
                        isSelected && { color: isDark ? '#F59E0B' : '#D97706' }
                      ]}>
                        {ten} {tenureType === 'years' ? 'Yrs' : 'Mths'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>


          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.shareBtn]} 
              onPress={shareSummary}
            >
              <Share2 size={20} color="#F59E0B" />
              <Text style={styles.shareBtnText}>Share EMI</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.copyBtn, copied && styles.copiedBtn]} 
              onPress={copyToClipboard}
            >
              {copied ? <Check size={20} color="#FFF" /> : <Copy size={20} color="#FFF" />}
              <Text style={[styles.copyBtnText, copied && styles.copiedBtnText]}>
                {copied ? 'Summary Copied' : 'Copy Summary'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  resetButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  emiDisplayCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 24,
  },
  emiLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
  },
  emiValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#383838',
    paddingTop: 16,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  leftBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#383838',
  },
  breakdownLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressContainer: {
    marginTop: 24,
    gap: 8,
  },
  progressBarWrapper: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  progressSegment: {
    height: '100%',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  inputCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 24,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  numericAdjustmentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 8,
  },
  adjBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  numericTextInput: {
    flex: 1,
    height: '100%',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 0,
  },
  quickSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  quickBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickBtnSelected: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  quickBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  quickBtnTextSelected: {
    color: '#D97706',
  },
  tenureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  toggleTypeContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
  },
  typeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  typeBtnTextActive: {
    color: '#F59E0B',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  shareBtn: {
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F59E0B',
  },
  copyBtn: {
    backgroundColor: '#F59E0B',
  },
  copyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  copiedBtn: {
    backgroundColor: '#10B981',
  },
  copiedBtnText: {
    color: '#FFFFFF',
  },
});
