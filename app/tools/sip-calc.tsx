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

export default function SipCalculatorScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const tintColor = '#F59E0B'; // Amber Gold for Finance Tools

  // Input states
  const [monthlyInvestment, setMonthlyInvestment] = useState(''); // Starts empty for 0 calculation
  const [expectedRate, setExpectedRate] = useState(''); // Starts empty
  const [timePeriod, setTimePeriod] = useState(''); // Starts empty
  const [copied, setCopied] = useState(false);

  // Result states
  const [results, setResults] = useState({
    investedAmount: 0,
    estimatedReturns: 0,
    maturityAmount: 0,
    investedPercentage: 100,
    returnsPercentage: 0,
  });

  useEffect(() => {
    calculateSip();
  }, [monthlyInvestment, expectedRate, timePeriod]);

  const calculateSip = () => {
    const P = parseFloat(monthlyInvestment) || 0;
    const annualRate = parseFloat(expectedRate) || 0;
    const years = parseFloat(timePeriod) || 0;

    if (P <= 0 || annualRate <= 0 || years <= 0) {
      setResults({
        investedAmount: 0,
        estimatedReturns: 0,
        maturityAmount: 0,
        investedPercentage: 100,
        returnsPercentage: 0,
      });
      return;
    }

    const monthlyRate = annualRate / 12 / 100;
    const months = years * 12;

    // SIP Maturity Formula: M = P * [((1 + i)^n - 1) / i] * (1 + i)
    let maturity = 0;
    if (monthlyRate === 0) {
      maturity = P * months;
    } else {
      maturity = P * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    }

    const totalInvested = P * months;
    const totalReturns = maturity - totalInvested;

    const investedPct = (totalInvested / maturity) * 100;
    const returnsPct = (totalReturns / maturity) * 100;

    setResults({
      investedAmount: Math.round(totalInvested),
      estimatedReturns: Math.round(totalReturns),
      maturityAmount: Math.round(maturity),
      investedPercentage: parseFloat(investedPct.toFixed(1)),
      returnsPercentage: parseFloat(returnsPct.toFixed(1)),
    });
  };

  const adjustValue = (type: 'investment' | 'rate' | 'period', operation: 'inc' | 'dec') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (type === 'investment') {
      const val = parseFloat(monthlyInvestment) || 0;
      const step = 500; // ₹500 steps
      const newVal = operation === 'inc' ? val + step : Math.max(0, val - step);
      setMonthlyInvestment(newVal.toString());
    } else if (type === 'rate') {
      const val = parseFloat(expectedRate) || 0;
      const step = 0.5; // 0.5% steps
      const newVal = operation === 'inc' ? val + step : Math.max(0, val - step);
      setExpectedRate(newVal.toString());
    } else if (type === 'period') {
      const val = parseFloat(timePeriod) || 0;
      const step = 1; // 1 year steps
      const newVal = operation === 'inc' ? val + step : Math.max(0, val - step);
      setTimePeriod(newVal.toString());
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
    const summaryText = `SIP Investment Details:\n` +
      `Monthly Investment: ${formatCurrency(parseFloat(monthlyInvestment) || 0)}\n` +
      `Expected Return Rate: ${expectedRate}% p.a.\n` +
      `Time Period: ${timePeriod} Years\n` +
      `---------------------------------\n` +
      `Invested Amount: ${formatCurrency(results.investedAmount)}\n` +
      `Estimated Returns: ${formatCurrency(results.estimatedReturns)}\n` +
      `Total Maturity Value: ${formatCurrency(results.maturityAmount)}`;

    await Clipboard.setStringAsync(summaryText);
    setCopied(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const shareSummary = async () => {
    const summaryText = `SIP Investment Calculation:\n` +
      `Monthly Investment: ${formatCurrency(parseFloat(monthlyInvestment) || 0)}\n` +
      `Maturity Value: ${formatCurrency(results.maturityAmount)}`;
    try {
      await Share.share({ message: summaryText });
    } catch (error) {
      console.log(error);
    }
  };

  const resetCalculator = () => {
    setMonthlyInvestment('');
    setExpectedRate('');
    setTimePeriod('');
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>SIP Calculator</Text>
          <TouchableOpacity onPress={resetCalculator} style={styles.resetButton}>
            <RotateCcw size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Maturity Result Display */}
          <View style={styles.resultDisplayCard}>
            <Text style={styles.resultLabel}>Future Value (Maturity)</Text>
            <Text style={styles.resultValue}>{formatCurrency(results.maturityAmount)}</Text>
            
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Invested Amount</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(results.investedAmount)}</Text>
              </View>
              <View style={[styles.breakdownItem, styles.leftBorder]}>
                <Text style={styles.breakdownLabel}>Est. Returns</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(results.estimatedReturns)}</Text>
              </View>
            </View>

            {/* Proportion Progress Bar */}
            {results.maturityAmount > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBarWrapper}>
                  <View style={[styles.progressSegment, { width: `${results.investedPercentage}%`, backgroundColor: '#F59E0B' }]} />
                  <View style={[styles.progressSegment, { width: `${results.returnsPercentage}%`, backgroundColor: '#10B981' }]} />
                </View>
                <View style={styles.legendContainer}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={styles.legendText}>Invested ({results.investedPercentage}%)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.legendText}>Returns ({results.returnsPercentage}%)</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Input Controls */}
          <View style={[styles.inputCard, { backgroundColor: theme.card }]}>
            {/* Monthly Investment Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>Monthly Investment (₹)</Text>
              <View style={[styles.numericAdjustmentWrapper, { backgroundColor: isDark ? '#171717' : '#F1F5F9' }]}>
                <TouchableOpacity onPress={() => adjustValue('investment', 'dec')} style={[styles.adjBtn, { backgroundColor: isDark ? '#262626' : '#FFFFFF' }]}>
                  <Minus size={18} color={isDark ? '#CBD5E1' : '#64748B'} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.numericTextInput, { color: theme.text }]}
                  value={monthlyInvestment}
                  onChangeText={setMonthlyInvestment}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity onPress={() => adjustValue('investment', 'inc')} style={[styles.adjBtn, { backgroundColor: isDark ? '#262626' : '#FFFFFF' }]}>
                  <Plus size={18} color={isDark ? '#CBD5E1' : '#64748B'} />
                </TouchableOpacity>
              </View>
              <View style={styles.quickSelectorRow}>
                {['1000', '2000', '5000', '10000'].map((amt) => {
                  const isSelected = monthlyInvestment === amt;
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
                      onPress={() => setMonthlyInvestment(amt)}
                    >
                      <Text style={[
                        styles.quickBtnText,
                        { color: isDark ? '#94A3B8' : '#64748B' },
                        isSelected && { color: isDark ? '#F59E0B' : '#D97706' }
                      ]}>
                        ₹{parseInt(amt) >= 1000 ? `${parseInt(amt)/1000}K` : amt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Expected Return Rate Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>Expected Return Rate (% p.a.)</Text>
              <View style={[styles.numericAdjustmentWrapper, { backgroundColor: isDark ? '#171717' : '#F1F5F9' }]}>
                <TouchableOpacity onPress={() => adjustValue('rate', 'dec')} style={[styles.adjBtn, { backgroundColor: isDark ? '#262626' : '#FFFFFF' }]}>
                  <Minus size={18} color={isDark ? '#CBD5E1' : '#64748B'} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.numericTextInput, { color: theme.text }]}
                  value={expectedRate}
                  onChangeText={setExpectedRate}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity onPress={() => adjustValue('rate', 'inc')} style={[styles.adjBtn, { backgroundColor: isDark ? '#262626' : '#FFFFFF' }]}>
                  <Plus size={18} color={isDark ? '#CBD5E1' : '#64748B'} />
                </TouchableOpacity>
              </View>
              <View style={styles.quickSelectorRow}>
                {['8', '12', '15', '18'].map((rate) => {
                  const isSelected = expectedRate === rate;
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
                      onPress={() => setExpectedRate(rate)}
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

            {/* Time Period Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>Time Period (Years)</Text>
              <View style={[styles.numericAdjustmentWrapper, { backgroundColor: isDark ? '#171717' : '#F1F5F9' }]}>
                <TouchableOpacity onPress={() => adjustValue('period', 'dec')} style={[styles.adjBtn, { backgroundColor: isDark ? '#262626' : '#FFFFFF' }]}>
                  <Minus size={18} color={isDark ? '#CBD5E1' : '#64748B'} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.numericTextInput, { color: theme.text }]}
                  value={timePeriod}
                  onChangeText={setTimePeriod}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity onPress={() => adjustValue('period', 'inc')} style={[styles.adjBtn, { backgroundColor: isDark ? '#262626' : '#FFFFFF' }]}>
                  <Plus size={18} color={isDark ? '#CBD5E1' : '#64748B'} />
                </TouchableOpacity>
              </View>
              <View style={styles.quickSelectorRow}>
                {['5', '10', '15', '25'].map((yrs) => {
                  const isSelected = timePeriod === yrs;
                  return (
                    <TouchableOpacity
                      key={yrs}
                      style={[
                        styles.quickBtn,
                        { borderColor: isDark ? '#383838' : '#E2E8F0' },
                        isSelected && {
                          borderColor: tintColor,
                          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7'
                        }
                      ]}
                      onPress={() => setTimePeriod(yrs)}
                    >
                      <Text style={[
                        styles.quickBtnText,
                        { color: isDark ? '#94A3B8' : '#64748B' },
                        isSelected && { color: isDark ? '#F59E0B' : '#D97706' }
                      ]}>
                        {yrs} Yrs
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>


          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.shareBtn]} 
              onPress={shareSummary}
            >
              <Share2 size={20} color="#F59E0B" />
              <Text style={styles.shareBtnText}>Share SIP</Text>
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
  resultDisplayCard: {
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
  resultLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
  },
  resultValue: {
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
