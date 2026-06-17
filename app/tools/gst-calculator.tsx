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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { ArrowLeft, Share2, Copy, RotateCcw, Check } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

const { width } = Dimensions.get('window');

const GST_RATES = [5, 12, 18, 28];

export default function GstCalculatorScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const tintColor = '#10B981'; // Emerald Green for Business Tools

  const [amount, setAmount] = useState('');
  const [selectedRate, setSelectedRate] = useState(18);
  const [isInclusive, setIsInclusive] = useState(false); // false = Add GST, true = Remove GST
  const [copied, setCopied] = useState(false);

  // Result States
  const [results, setResults] = useState({
    netAmount: 0,
    gstAmount: 0,
    cgst: 0,
    sgst: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    calculateGst();
  }, [amount, selectedRate, isInclusive]);

  const calculateGst = () => {
    const baseAmount = parseFloat(amount) || 0;
    let net = 0;
    let gst = 0;
    let total = 0;

    if (!isInclusive) {
      // Add GST (Amount + GST)
      net = baseAmount;
      gst = (baseAmount * selectedRate) / 100;
      total = baseAmount + gst;
    } else {
      // Remove GST (Amount is inclusive of GST)
      total = baseAmount;
      net = (baseAmount * 100) / (100 + selectedRate);
      gst = baseAmount - net;
    }

    setResults({
      netAmount: net,
      gstAmount: gst,
      cgst: gst / 2,
      sgst: gst / 2,
      totalAmount: total,
    });
  };

  const copyToClipboard = async () => {
    const text = `GST Calculation:\nAmount: ₹${amount}\nRate: ${selectedRate}%\nType: ${isInclusive ? 'Inclusive' : 'Exclusive'}\n---\nNet Amount: ₹${results.netAmount.toFixed(2)}\nCGST (9%): ₹${results.cgst.toFixed(2)}\nSGST (9%): ₹${results.sgst.toFixed(2)}\nTotal GST: ₹${results.gstAmount.toFixed(2)}\nTotal Amount: ₹${results.totalAmount.toFixed(2)}`;
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareResult = async () => {
    const text = `GST Calculation:\nAmount: ₹${amount}\nTotal Amount: ₹${results.totalAmount.toFixed(2)}`;
    try {
      await Share.share({ message: text });
    } catch (error) {
      console.log(error);
    }
  };

  const reset = () => {
    setAmount('');
    setSelectedRate(18);
    setIsInclusive(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>GST Calculator</Text>
          <TouchableOpacity onPress={reset} style={styles.resetButton}>
            <RotateCcw size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Input Section */}
          <View style={[styles.inputCard, { backgroundColor: theme.card }]}>
            <View style={[styles.toggleContainer, { backgroundColor: isDark ? '#171717' : '#F1F5F9' }]}>
              <TouchableOpacity
                style={[styles.toggleButton, !isInclusive && { backgroundColor: tintColor }]}
                onPress={() => setIsInclusive(false)}
              >
                <Text style={[styles.toggleText, !isInclusive && styles.activeToggleText, { color: !isInclusive ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B') }]}>Add GST</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, isInclusive && { backgroundColor: tintColor }]}
                onPress={() => setIsInclusive(true)}
              >
                <Text style={[styles.toggleText, isInclusive && styles.activeToggleText, { color: isInclusive ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B') }]}>Remove GST</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Enter Amount (₹)</Text>
            <TextInput
              style={[styles.amountInput, { color: theme.text, borderBottomColor: isDark ? '#383838' : '#F1F5F9' }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor="#94A3B8"
            />

            <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Select GST Rate</Text>
            <View style={styles.rateGrid}>
              {GST_RATES.map((rate) => {
                const isSelected = selectedRate === rate;
                return (
                  <TouchableOpacity
                    key={rate}
                    style={[
                      styles.rateItem,
                      { backgroundColor: isDark ? '#262626' : '#FFFFFF', borderColor: isDark ? '#383838' : '#F1F5F9' },
                      isSelected && { borderColor: tintColor, backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : tintColor + '10' }
                    ]}
                    onPress={() => setSelectedRate(rate)}
                  >
                    <Text style={[styles.rateText, { color: isDark ? '#94A3B8' : '#64748B' }, isSelected && { color: tintColor }]}>{rate}%</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Results Section */}
          <View style={[styles.resultCard, { backgroundColor: theme.card }]}>
            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>{isInclusive ? 'Base Amount' : 'Net Amount'}</Text>
              <Text style={[styles.resultValue, { color: theme.text }]}>₹{results.netAmount.toFixed(2)}</Text>
            </View>
            
            <View style={[styles.divider, { backgroundColor: isDark ? '#383838' : '#F1F5F9' }]} />
            
            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>CGST ({selectedRate/2}%)</Text>
              <Text style={[styles.resultValue, { color: theme.text }]}>₹{results.cgst.toFixed(2)}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>SGST ({selectedRate/2}%)</Text>
              <Text style={[styles.resultValue, { color: theme.text }]}>₹{results.sgst.toFixed(2)}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { fontWeight: '700', color: tintColor }]}>Total GST</Text>
              <Text style={[styles.resultValue, { fontWeight: '700', color: tintColor }]}>₹{results.gstAmount.toFixed(2)}</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: tintColor + '30', height: 2 }]} />

            <View style={styles.totalRow}>
              <View>
                <Text style={[styles.totalLabel, { color: theme.text }]}>Total Amount</Text>
                <Text style={styles.totalSubtext}>Inclusive of all taxes</Text>
              </View>
              <Text style={[styles.totalValue, { color: theme.text }]}>₹{results.totalAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: isDark ? '#262626' : '#F8FAFC', borderColor: isDark ? '#383838' : '#F1F5F9' }]} onPress={copyToClipboard}>
                {copied ? <Check size={18} color={tintColor} /> : <Copy size={18} color={isDark ? '#94A3B8' : '#64748B'} />}
                <Text style={[styles.actionButtonText, { color: isDark ? '#94A3B8' : '#64748B' }, copied && { color: tintColor }]}>
                  {copied ? 'Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: isDark ? '#262626' : '#F8FAFC', borderColor: isDark ? '#383838' : '#F1F5F9' }]} onPress={shareResult}>
                <Share2 size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                <Text style={[styles.actionButtonText, { color: isDark ? '#94A3B8' : '#64748B' }]}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>

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
  resetButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  inputCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeToggleText: {
    color: '#FFFFFF',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    marginLeft: 4,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#F1F5F9',
    marginBottom: 24,
  },
  rateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  rateItem: {
    flex: 1,
    minWidth: '20%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  rateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  resultCard: {
    borderRadius: 24,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 8,
  },
});
