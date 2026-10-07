import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { useAuth } from '@/context';
import { submitComplaint } from '@/api/support';
import { colors, headerGradient } from '@/theme';

const SUPPORT_PHONE = '+2348089989469';
const SUPPORT_EMAIL = 'support@gutter.com';

const ISSUE_CATEGORIES = [
  { key: 'airtime_data', label: 'Airtime / Data Delivery', icon: 'flash-outline' as const },
  { key: 'bank_transfer', label: 'Bank Transfer Delay', icon: 'swap-horizontal-outline' as const },
  { key: 'crypto', label: 'Crypto Deposit / Withdrawal', icon: 'logo-bitcoin' as const },
  { key: 'card', label: 'Virtual Card Issue', icon: 'card-outline' as const },
  { key: 'account', label: 'Account & Security', icon: 'shield-checkmark-outline' as const },
  { key: 'other', label: 'Other Inquiries', icon: 'help-circle-outline' as const },
];

const FAQS = [
  {
    q: 'My airtime/data was debited but not delivered — what should I do?',
    a: 'Telco networks occasionally experience momentary gateway delays. If your recharge was not delivered within 2 minutes, our system automatically requeries the operator and refunds the amount back to your Naira wallet balance. You can also file a complaint below with your reference for instant verification.',
  },
  {
    q: 'How long do bank transfers take to arrive?',
    a: 'Transfers sent on Gutter are processed directly via instant NIBSS rails. Most transfers are credited within 10 to 60 seconds. In rare cases of destination bank downtime, it may take up to 15 minutes.',
  },
  {
    q: 'How do I upgrade my account limits?',
    a: 'Go to your Profile tab and select "Transaction Limits". You can complete Tier 2 (BVN/NIN) for up to ₦5M/day or Tier 3 (proof of address) for up to ₦25M/day.',
  },
  {
    q: 'Why is my crypto deposit taking time to confirm?',
    a: 'Crypto deposits require blockchain network confirmations (e.g. 1 confirmation for USDT-TRC20, 2 for Bitcoin). Once confirmed on the blockchain, your Gutter wallet is credited automatically.',
  },
];

export default function HelpCenterScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [category, setCategory] = useState('airtime_data');
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handlePasteReference = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setReference(text.trim());
  };

  const handleWhatsApp = async () => {
    const userName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'User';
    const text = `Hello Gutter Support, I need help with my account (Name: ${userName}, ID: #${user?.id ?? ''}).`;
    const cleanPhone = SUPPORT_PHONE.replace(/[^0-9]/g, '');
    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    const webUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch {
      await Linking.openURL(webUrl);
    }
  };

  const handleCall = () => {
    void Linking.openURL(`tel:${SUPPORT_PHONE}`);
  };

  const handleEmail = () => {
    const userName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'User';
    const subject = `Support Request - ${userName} (#${user?.id ?? ''})`;
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`);
  };

  const handleSubmitComplaint = async () => {
    if (!message.trim() || message.trim().length < 6) {
      Alert.alert('Incomplete Message', 'Please describe your complaint in detail so our team can help you promptly.', [
        { text: 'OK' },
      ]);
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitComplaint({
        category,
        reference: reference.trim() || undefined,
        message: message.trim(),
      });

      setSubmittedTicket(res.ticket_id);
      setMessage('');
      setReference('');
    } catch {
      Alert.alert('Unable to Submit', 'Network error while submitting complaint. Please try again or chat with us on WhatsApp.', [
        { text: 'OK' },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screenBg}
    >
      {/* Background Gradient */}
      <LinearGradient
        colors={[...headerGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={styles.gradientHeader}
      >
        <GWatermark light size={400} className="-bottom-20 -left-16 opacity-15" />
      </LinearGradient>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Top Navigation Bar */}
        <View style={styles.navBar}>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
            hitSlop={12}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>

          <View style={styles.navTitleGroup}>
            <Text style={styles.navTitle}>Help & Support</Text>
            <Text style={styles.navSubtitle}>24/7 Priority Resolution</Text>
          </View>

          <Pressable onPress={handleWhatsApp} hitSlop={10} style={styles.waHeaderBtn}>
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Quick Contact Channels Banner */}
          <Text style={styles.sectionHeader}>Instant Support Channels</Text>
          <View style={styles.channelsRow}>
            {/* WhatsApp Card */}
            <Pressable onPress={handleWhatsApp} style={styles.channelCard}>
              <View style={[styles.channelIconBox, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="logo-whatsapp" size={22} color="#16A34A" />
              </View>
              <Text style={styles.channelTitle}>WhatsApp</Text>
              <Text style={styles.channelDesc}>Instant response</Text>
            </Pressable>

            {/* Direct Call Card */}
            <Pressable onPress={handleCall} style={styles.channelCard}>
              <View style={[styles.channelIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="call" size={20} color="#2563EB" />
              </View>
              <Text style={styles.channelTitle}>Call Center</Text>
              <Text style={styles.channelDesc}>Direct phone line</Text>
            </Pressable>

            {/* Email Support Card */}
            <Pressable onPress={handleEmail} style={styles.channelCard}>
              <View style={[styles.channelIconBox, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="mail" size={20} color="#9333EA" />
              </View>
              <Text style={styles.channelTitle}>Email</Text>
              <Text style={styles.channelDesc}>Formal inquiries</Text>
            </Pressable>
          </View>

          {/* Ticket Confirmation Toast / Card if just submitted */}
          {submittedTicket ? (
            <View style={styles.successTicketBox}>
              <View style={styles.successTicketHeader}>
                <Ionicons name="checkmark-circle" size={22} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.successTicketTitle}>Complaint Received</Text>
                  <Text style={styles.successTicketSub}>
                    Ticket ID: <Text style={styles.successTicketBold}>{submittedTicket}</Text>
                  </Text>
                </View>
                <Pressable onPress={() => setSubmittedTicket(null)} hitSlop={10}>
                  <Ionicons name="close" size={18} color="#059669" />
                </Pressable>
              </View>
              <Text style={styles.successTicketBody}>
                Our resolution team has received your ticket and is working on it. You will receive an update in your notifications.
              </Text>
            </View>
          ) : null}

          {/* File a Complaint Form */}
          <View style={styles.complaintCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="chatbubble-ellipses" size={18} color={colors.navy} />
              </View>
              <View>
                <Text style={styles.cardHeaderTitle}>File a Complaint / Dispute</Text>
                <Text style={styles.cardHeaderSub}>Direct resolution with priority support</Text>
              </View>
            </View>

            {/* Issue Category Selector */}
            <Text style={styles.fieldLabel}>Select Issue Type</Text>
            <View style={styles.categoryWrap}>
              {ISSUE_CATEGORIES.map((cat) => {
                const active = category === cat.key;
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() => setCategory(cat.key)}
                    style={[
                      styles.categoryChip,
                      active ? styles.categoryChipActive : styles.categoryChipInactive,
                    ]}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={14}
                      color={active ? colors.white : colors.navy}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        active ? styles.categoryChipTextActive : styles.categoryChipTextInactive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Transaction Reference (Optional) */}
            <View style={styles.inputGroup}>
              <View style={styles.inputGroupHeader}>
                <Text style={styles.fieldLabel}>Transaction Reference (Optional)</Text>
                <Pressable onPress={handlePasteReference} style={styles.pasteBadge}>
                  <Text style={styles.pasteBadgeText}>Paste</Text>
                </Pressable>
              </View>
              <TextInput
                value={reference}
                onChangeText={setReference}
                placeholder="e.g. 202609291150ndrca9"
                placeholderTextColor={colors.inkMuted}
                autoCapitalize="none"
                style={styles.referenceInput}
              />
            </View>

            {/* Message Details Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Describe the issue</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Explain what happened (e.g. I was debited ₦1,000 for airtime but the recipient has not received it)..."
                placeholderTextColor={colors.inkMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={styles.messageInput}
              />
            </View>

            {/* Submit Button */}
            <Button
              title={submitting ? 'Submitting complaint…' : 'Submit Complaint'}
              disabled={submitting}
              onPress={handleSubmitComplaint}
              className="mt-4"
            />
          </View>

          {/* Quick Self-Help FAQs */}
          <Text style={[styles.sectionHeader, { marginTop: 24 }]}>Frequently Asked Questions</Text>
          <View style={styles.faqCard}>
            {FAQS.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              const isLast = idx === FAQS.length - 1;
              return (
                <View
                  key={idx}
                  style={[styles.faqItem, !isLast && styles.faqItemBorder]}
                >
                  <Pressable
                    onPress={() => setExpandedFaq(isExpanded ? null : idx)}
                    style={styles.faqQuestionRow}
                  >
                    <Text style={styles.faqQuestionText}>{faq.q}</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.inkMid}
                    />
                  </Pressable>
                  {isExpanded ? (
                    <Text style={styles.faqAnswerText}>{faq.a}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screenBg: {
    flex: 1,
    backgroundColor: '#0A1738',
  },
  gradientHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 280,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  navTitleGroup: {
    alignItems: 'center',
  },
  navTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 17,
    color: colors.white,
  },
  navSubtitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 1,
  },
  waHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(37, 211, 102, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.3)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 4,
  },
  sectionHeader: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 10,
    marginLeft: 2,
  },
  channelsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  channelCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.lineInput,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  channelIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  channelTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12.5,
    color: colors.ink,
  },
  channelDesc: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 2,
  },
  successTicketBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 14,
    marginBottom: 18,
  },
  successTicketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  successTicketTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: '#065F46',
  },
  successTicketSub: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: '#047857',
    marginTop: 1,
  },
  successTicketBold: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#065F46',
  },
  successTicketBody: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: '#065F46',
    marginTop: 6,
    lineHeight: 17,
  },
  complaintCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.lineInput,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  cardHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
    color: colors.ink,
  },
  cardHeaderSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 1,
  },
  fieldLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11.5,
    color: colors.inkMid,
    marginBottom: 8,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  categoryChipInactive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  categoryChipText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
  },
  categoryChipTextActive: {
    color: colors.white,
  },
  categoryChipTextInactive: {
    color: colors.ink,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pasteBadge: {
    backgroundColor: colors.chip,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pasteBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: colors.navy,
  },
  referenceInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: colors.ink,
    marginTop: 6,
  },
  messageInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: colors.ink,
    minHeight: 90,
  },
  faqCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.lineInput,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  faqItem: {
    paddingVertical: 14,
  },
  faqItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestionText: {
    flex: 1,
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: colors.ink,
    paddingRight: 10,
  },
  faqAnswerText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: colors.inkMid,
    lineHeight: 18,
    marginTop: 8,
  },
});
