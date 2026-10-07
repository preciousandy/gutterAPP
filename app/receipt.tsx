import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { colors, headerGradient } from '@/theme';
import type { Transaction } from '@/types';
import { formatDateTime, formatNaira, formatUsd } from '@/utils/format';
import { downloadReceiptPdf } from '@/utils/receiptPdf';
import { isBeneficiarySavedLocally, saveBeneficiary } from '@/api/beneficiaries';

const CARRIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  MTN: { bg: '#FEF9C3', text: '#854D0E', border: '#FDE047' },
  AIRTEL: { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' },
  GLO: { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' },
  '9MOBILE': { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
  ETISALAT: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
};

export default function ReceiptScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams<{ data?: string }>();

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [savingBeneficiary, setSavingBeneficiary] = useState(false);
  const [isBeneficiarySaved, setIsBeneficiarySaved] = useState(false);
  const [copiedReference, setCopiedReference] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const transaction = useMemo<Transaction | null>(() => {
    if (!data) return null;
    try {
      return JSON.parse(data) as Transaction;
    } catch {
      return null;
    }
  }, [data]);

  const electricityToken = useMemo(() => {
    if (transaction?.token) return String(transaction.token).trim();
    if (transaction?.subtitle) {
      const match = transaction.subtitle.match(/Token:\s*([0-9\-\s]{12,30})/i);
      if (match) return match[1].trim();
    }
    if (transaction?.description) {
      const match = transaction.description.match(/Token:\s*([0-9\-\s]{12,30})/i);
      if (match) return match[1].trim();
    }
    return null;
  }, [transaction]);

  const formattedToken = useMemo(() => {
    if (!electricityToken) return '';
    const digitsOnly = electricityToken.replace(/\D/g, '');
    if (digitsOnly.length === 20) {
      return digitsOnly.replace(/(\d{4})(?=\d)/g, '$1 - ');
    }
    return electricityToken;
  }, [electricityToken]);

  const handleCopyToken = async () => {
    if (!electricityToken) return;
    const clean = electricityToken.replace(/\D/g, '') || electricityToken;
    await Clipboard.setStringAsync(clean);
    setCopiedToken(true);
    setTimeout(() => {
      setCopiedToken(false);
    }, 2500);
  };

  const isElectricity = useMemo(() => {
    if (transaction?.token || electricityToken) return true;
    if (transaction?.title && /electric/i.test(transaction.title)) return true;
    if (transaction?.subtitle && /meter/i.test(transaction.subtitle)) return true;
    if (transaction?.counterparty && /electric|meter|disco/i.test(transaction.counterparty)) return true;
    return false;
  }, [transaction, electricityToken]);

  const isBetting = useMemo(() => {
    if (!transaction || isElectricity) return false;
    if (transaction.reference && transaction.reference.startsWith('BET_')) return true;
    if (transaction.title && /bet|sport|top-up|biller/i.test(transaction.title)) return true;
    if (
      transaction.counterparty_bank &&
      /sporty|bet9ja|1xbet|betway|betking|bangbet|merrybet|nairabet|msport|betting/i.test(
        transaction.counterparty_bank
      )
    ) {
      return true;
    }
    if (
      transaction.counterparty &&
      /sporty|bet9ja|1xbet|betway|betking|bangbet|merrybet|nairabet|msport|betting/i.test(
        transaction.counterparty
      )
    ) {
      return true;
    }
    if (transaction.description && /betting/i.test(transaction.description)) return true;
    return false;
  }, [transaction, isElectricity]);

  const isCable = useMemo(() => {
    if (!transaction || isElectricity || isBetting) return false;
    if (transaction.reference && transaction.reference.startsWith('CBL_')) return true;
    if (transaction.title && /cable|dstv|gotv|startimes|showmax/i.test(transaction.title)) return true;
    if (
      transaction.counterparty_bank &&
      /dstv|gotv|startimes|showmax/i.test(transaction.counterparty_bank)
    ) {
      return true;
    }
    if (
      transaction.counterparty &&
      /dstv|gotv|startimes|showmax/i.test(transaction.counterparty)
    ) {
      return true;
    }
    if (transaction.description && /dstv|gotv|startimes|showmax|cable tv/i.test(transaction.description)) return true;
    return false;
  }, [transaction, isElectricity, isBetting]);

  const isInflow = transaction?.direction === 'in';
  const isAirtime = transaction?.type === 'airtime' && !isElectricity && !isBetting && !isCable;

  // Extract carrier badge if airtime (MTN, AIRTEL, GLO, 9MOBILE)
  const carrierKey = useMemo(() => {
    if (!transaction || isElectricity || isBetting || isCable) return null;
    // Check counterparty e.g. "MTN · 08037446497"
    if (transaction.counterparty) {
      const match = transaction.counterparty.match(/^(MTN|AIRTEL|GLO|9MOBILE|ETISALAT)/i);
      if (match) return match[1].toUpperCase();
    }
    // Check title e.g. "MTN Airtime"
    if (transaction.title) {
      const match = transaction.title.match(/^(MTN|AIRTEL|GLO|9MOBILE|ETISALAT)/i);
      if (match) return match[1].toUpperCase();
    }
    // Check counterparty_bank if it is a real carrier and not an aggregator
    if (
      transaction.counterparty_bank &&
      !['BIGISUB', 'VTPASS'].includes(transaction.counterparty_bank.toUpperCase())
    ) {
      const match = transaction.counterparty_bank.match(/^(MTN|AIRTEL|GLO|9MOBILE|ETISALAT)/i);
      if (match) return match[1].toUpperCase();
      return transaction.counterparty_bank.toUpperCase();
    }
    // Check description e.g. "Recharged 080... with ₦100.00 MTN airtime"
    if (transaction.description) {
      const match = transaction.description.match(/\b(MTN|AIRTEL|GLO|9MOBILE|ETISALAT)\b/i);
      if (match) return match[1].toUpperCase();
    }
    return null;
  }, [transaction, isElectricity, isBetting, isCable]);

  const carrierStyle = carrierKey ? CARRIER_COLORS[carrierKey] : null;

  // Display name for the telecom network (always show actual carrier, never internal backend aggregator like Bigisub/VTpass)
  const networkProviderName = useMemo(() => {
    if (isElectricity) return transaction?.counterparty_bank || 'Electricity DISCO';
    if (isBetting || isCable) return '';
    if (!isAirtime) return transaction?.counterparty_bank || '';
    if (carrierKey) return carrierKey;
    if (
      transaction?.counterparty_bank &&
      !['BIGISUB', 'VTPASS'].includes(transaction.counterparty_bank.toUpperCase())
    ) {
      return transaction.counterparty_bank;
    }
    // Fallback: search title & description
    const text = `${transaction?.title || ''} ${transaction?.counterparty || ''} ${transaction?.description || ''}`;
    const match = text.match(/\b(MTN|Airtel|Glo|9mobile|Etisalat)\b/i);
    return match ? match[1].toUpperCase() : 'MTN';
  }, [isAirtime, isElectricity, isBetting, isCable, carrierKey, transaction]);

  // Display name for bookmaker platform
  const bookmakerName = useMemo(() => {
    if (!isBetting) return '';
    if (
      transaction?.counterparty_bank &&
      !['BIGISUB', 'VTPASS'].includes(transaction.counterparty_bank.toUpperCase())
    ) {
      return transaction.counterparty_bank;
    }
    if (transaction?.counterparty) {
      const match = transaction.counterparty.match(/^([a-zA-Z0-9\s]+)\s*[·-]/);
      if (match) return match[1].trim();
    }
    if (transaction?.title) {
      return transaction.title.replace(/\s*Top-up/i, '').trim();
    }
    return 'Betting Platform';
  }, [isBetting, transaction]);

  // Display name for cable TV provider
  const cableProviderName = useMemo(() => {
    if (!isCable) return '';
    if (
      transaction?.counterparty_bank &&
      !['BIGISUB', 'VTPASS'].includes(transaction.counterparty_bank.toUpperCase())
    ) {
      return transaction.counterparty_bank;
    }
    if (transaction?.counterparty) {
      const match = transaction.counterparty.match(/^([a-zA-Z0-9\s]+)\s*[·-]/);
      if (match) return match[1].trim();
    }
    if (transaction?.title) {
      const match = transaction.title.match(/(DStv|GOtv|StarTimes|Showmax)/i);
      if (match) return match[1];
    }
    return 'Cable TV Provider';
  }, [isCable, transaction]);

  // Clean phone number, meter number, betting account ID, or smartcard number without provider prefix if present
  const cleanRecipient = useMemo(() => {
    if (!transaction?.counterparty) return '';
    if (isElectricity || isBetting || isCable) {
      return transaction.counterparty.replace(/^[a-zA-Z0-9_\-\s]+\s*[·-]\s*/, '').trim();
    }
    if (isAirtime) {
      return transaction.counterparty.replace(/^[a-zA-Z0-9]+\s*[·-]\s*/, '').trim();
    }
    return transaction.counterparty;
  }, [transaction, isAirtime, isElectricity, isBetting, isCable]);

  // Clean description removing vendor/internal gateway mentions like VTpass or Bigisub
  const cleanDescription = useMemo(() => {
    if (!transaction?.description) return '';
    return transaction.description
      .replace(/\s*(via|from|through)\s+(VTpass|bigisub|bigi)\.?/gi, '.')
      .replace(/\s*\.\s*$/, '.')
      .trim();
  }, [transaction?.description]);

  // Check if beneficiary is already saved (bank transfers, betting accounts, or cable smartcards)
  useEffect(() => {
    if (!transaction || isInflow || isAirtime || isElectricity || !transaction.counterparty) return;
    let cancelled = false;
    const checkName = cleanRecipient || transaction.counterparty;
    const checkBank = isCable ? cableProviderName : isBetting ? bookmakerName : transaction.counterparty_bank;
    void isBeneficiarySavedLocally(checkName, checkBank).then((saved) => {
      if (!cancelled) setIsBeneficiarySaved(saved);
    });
    return () => {
      cancelled = true;
    };
  }, [transaction, isInflow, isAirtime, isElectricity, isBetting, isCable, cleanRecipient, bookmakerName, cableProviderName]);

  const handleClose = () => {
    router.replace('/(tabs)');
  };

  const handleCopyReference = async () => {
    if (!transaction?.reference) return;
    await Clipboard.setStringAsync(transaction.reference);
    setCopiedReference(true);
    setTimeout(() => {
      setCopiedReference(false);
    }, 2500);
  };

  const amountLabel = transaction
    ? transaction.currency === 'USD'
      ? formatUsd(Math.abs(transaction.amount))
      : formatNaira(Math.abs(transaction.amount), 2)
    : '';

  const statusConfig = useMemo(() => {
    const status = transaction?.status ?? 'successful';
    switch (status) {
      case 'pending':
        return {
          icon: 'time' as const,
          glowBg: 'rgba(217, 131, 25, 0.15)',
          circleBg: colors.btc,
          iconColor: colors.white,
          label: 'Payment Pending',
          pillBg: '#FEF3C7',
          pillText: '#B45309',
        };
      case 'failed':
        return {
          icon: 'close' as const,
          glowBg: 'rgba(214, 69, 95, 0.15)',
          circleBg: colors.red,
          iconColor: colors.white,
          label: 'Payment Failed',
          pillBg: '#FEE2E2',
          pillText: '#DC2626',
        };
      case 'successful':
      default:
        return {
          icon: 'checkmark' as const,
          glowBg: 'rgba(35, 211, 165, 0.20)',
          circleBg: colors.mint,
          iconColor: colors.mintOn,
          label: 'Payment Successful',
          pillBg: '#ECFDF5',
          pillText: '#059669',
        };
    }
  }, [transaction?.status]);

  const handleShare = async () => {
    if (!transaction) return;
    try {
      const shareMessage = [
        '🧾 GUTTER TRANSACTION RECEIPT',
        '--------------------------------',
        `Title: ${transaction.title}`,
        `Amount: ${amountLabel}`,
        `Status: ${transaction.status.toUpperCase()}`,
        electricityToken ? `Token: ${formattedToken || electricityToken}` : null,
        transaction.units ? `Units: ${transaction.units} kWh` : null,
        transaction.counterparty
          ? `${isInflow ? 'Sender' : isElectricity ? 'Meter Number' : isBetting ? 'Account / User ID' : isCable ? 'Smartcard / IUC' : isAirtime ? 'Phone' : 'Recipient'}: ${cleanRecipient || transaction.counterparty}`
          : null,
        (isCable ? cableProviderName : isBetting ? bookmakerName : isAirtime ? networkProviderName : transaction.counterparty_bank)
          ? `${isElectricity ? 'DISCO' : isBetting ? 'Bookmaker' : isCable ? 'Provider' : isAirtime ? 'Network' : 'Bank'}: ${isCable ? cableProviderName : isBetting ? bookmakerName : isAirtime ? networkProviderName : transaction.counterparty_bank}`
          : null,
        `Date: ${formatDateTime(transaction.created_at)}`,
        `Reference: ${transaction.reference}`,
        cleanDescription ? `Description: ${cleanDescription}` : null,
        '--------------------------------',
        'Powered by Gutter',
      ]
        .filter(Boolean)
        .join('\n');

      await Share.share({
        message: shareMessage,
        title: `Receipt - ${transaction.reference}`,
      });
    } catch {
      // Ignore dismissed share sheets
    }
  };

  const handleDownloadPdf = async () => {
    if (!transaction || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      await downloadReceiptPdf(transaction);
    } catch {
      Alert.alert(
        'Unable to Generate PDF',
        'Could not generate or share the PDF receipt. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSaveBeneficiary = async () => {
    if (!transaction || !transaction.counterparty || isBeneficiarySaved || savingBeneficiary) {
      return;
    }

    setSavingBeneficiary(true);
    try {
      if (isCable) {
        await saveBeneficiary({
          name: cleanRecipient || transaction.counterparty,
          bank_name: cableProviderName || transaction.counterparty_bank || 'Cable TV',
          account_number: cleanRecipient || null,
          category: 'cable',
        });
      } else if (isBetting) {
        await saveBeneficiary({
          name: cleanRecipient || transaction.counterparty,
          bank_name: bookmakerName || transaction.counterparty_bank || 'Betting',
          account_number: cleanRecipient || null,
          category: 'betting',
        });
      } else {
        await saveBeneficiary({
          name: transaction.counterparty,
          bank_name: transaction.counterparty_bank ?? 'Bank',
          account_number: null,
        });
      }

      setIsBeneficiarySaved(true);
      Alert.alert(
        'Beneficiary Saved',
        `${cleanRecipient || transaction.counterparty} has been successfully added to your saved beneficiaries.`,
        [{ text: 'OK' }]
      );
    } catch {
      Alert.alert('Error', 'Unable to save beneficiary right now. Please try again.', [
        { text: 'OK' },
      ]);
    } finally {
      setSavingBeneficiary(false);
    }
  };

  if (!transaction) {
    return (
      <View style={styles.screenBg}>
        <SafeAreaView style={styles.errorContainer} edges={['top', 'bottom']}>
          <View style={styles.errorIconBox}>
            <Ionicons name="receipt-outline" size={32} color={colors.inkSoft} />
          </View>
          <Text style={styles.errorTitle}>Transaction Details</Text>
          <Text style={styles.errorSubtitle}>
            The transaction information is unavailable or could not be loaded.
          </Text>
          <View style={{ marginTop: 24, width: '100%', maxWidth: 280 }}>
            <Button title="Go Back" onPress={handleClose} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screenBg}>
      {/* Background Gradient & Watermark */}
      <LinearGradient
        colors={[...headerGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={styles.gradientHeader}
      >
        <GWatermark light size={420} className="-bottom-20 -left-16 opacity-15" />
      </LinearGradient>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Top Navigation Row */}
        <View style={styles.topNav}>
          <View style={styles.navBrand}>
            <Ionicons name="sparkles" size={14} color="#23D3A5" />
            <Text style={styles.navBrandText}>GUTTER PAY</Text>
          </View>

          <Pressable onPress={handleClose} hitSlop={10} style={styles.closeBtn}>
            <Ionicons name="close" size={18} color={colors.white} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Status Section */}
          <View style={styles.heroSection}>
            {/* Glowing Icon Halo */}
            <View style={[styles.iconHalo, { backgroundColor: statusConfig.glowBg }]}>
              <View style={[styles.iconCircle, { backgroundColor: statusConfig.circleBg }]}>
                <Ionicons name={statusConfig.icon} size={32} color={statusConfig.iconColor} />
              </View>
            </View>

            <Text style={styles.heroTitle}>{statusConfig.label}</Text>
            <Text style={styles.heroAmount}>{amountLabel}</Text>

            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={13} color="rgba(255, 255, 255, 0.7)" />
              <Text style={styles.metaText}>{formatDateTime(transaction.created_at)}</Text>
            </View>
          </View>

          {/* Authentic Digital Receipt Ticket Card */}
          <View style={styles.ticketCard}>
            {/* Ticket Header */}
            <View style={styles.ticketHeader}>
              <View style={styles.ticketBrandBadge}>
                <Ionicons name="shield-checkmark" size={13} color={colors.mintDark} />
                <Text style={styles.ticketBrandText}>VERIFIED TRANSACTION</Text>
              </View>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>
                  {isElectricity
                    ? 'Electricity Recharge'
                    : isBetting
                      ? 'Betting Wallet Top-up'
                      : isCable
                        ? 'Cable TV Subscription'
                        : isAirtime
                          ? 'Airtime & Data'
                          : transaction.title}
                </Text>
              </View>
            </View>

            {/* Electricity Prepaid Meter Token Card (if available) */}
            {electricityToken ? (
              <View style={styles.tokenCard}>
                <View style={styles.tokenCardHeader}>
                  <View style={styles.tokenTag}>
                    <Ionicons name="flash" size={12} color="#D97706" />
                    <Text style={styles.tokenTagText}>PREPAID METER TOKEN</Text>
                  </View>
                  {transaction.units ? (
                    <View style={styles.unitsTag}>
                      <Text style={styles.unitsTagText}>{transaction.units} kWh</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.tokenCodeRow}>
                  <Text style={styles.tokenCodeText} selectable numberOfLines={1} adjustsFontSizeToFit>
                    {formattedToken || electricityToken}
                  </Text>
                  <Pressable
                    onPress={handleCopyToken}
                    hitSlop={8}
                    style={[styles.tokenCopyBtn, copiedToken && styles.tokenCopyBtnCopied]}
                  >
                    <Ionicons
                      name={copiedToken ? 'checkmark-circle' : 'copy-outline'}
                      size={14}
                      color={copiedToken ? '#059669' : colors.navy}
                    />
                    <Text
                      style={[
                        styles.tokenCopyBtnText,
                        copiedToken && styles.tokenCopyBtnTextCopied,
                      ]}
                    >
                      {copiedToken ? 'Copied' : 'Copy'}
                    </Text>
                  </Pressable>
                </View>
                <Text style={styles.tokenSubtext}>
                  Punch this 20-digit token into your prepaid meter keypad to credit units.
                </Text>
              </View>
            ) : null}

            {/* Upper Details Section */}
            <View style={styles.upperDetails}>
              {/* Recipient / Meter / Betting Account / Smartcard Row */}
              {transaction.counterparty ? (
                <View style={styles.detailRow}>
                  <Text style={styles.rowLabel}>
                    {isElectricity
                      ? 'Meter Number'
                      : isBetting
                        ? 'Account / User ID'
                        : isCable
                          ? 'Smartcard / IUC'
                          : isInflow
                            ? 'Sender'
                            : 'Recipient'}
                  </Text>
                  <View style={styles.recipientValueGroup}>
                    {isAirtime && carrierStyle ? (
                      <View
                        style={[
                          styles.carrierBadge,
                          { backgroundColor: carrierStyle.bg, borderColor: carrierStyle.border },
                        ]}
                      >
                        <Text style={[styles.carrierBadgeText, { color: carrierStyle.text }]}>
                          {carrierKey}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={styles.rowValueBold} numberOfLines={1}>
                      {cleanRecipient || transaction.counterparty}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Provider / DISCO / Bookmaker / Cable / Bank Row */}
              {(isCable ? cableProviderName : isAirtime ? networkProviderName : isBetting ? bookmakerName : transaction.counterparty_bank) ? (
                <View style={styles.detailRow}>
                  <Text style={styles.rowLabel}>
                    {isElectricity
                      ? 'Distribution Co. (DISCO)'
                      : isBetting
                        ? 'Bookmaker Platform'
                        : isCable
                          ? 'Cable TV Provider'
                          : isAirtime
                            ? 'Network Provider'
                            : isInflow
                              ? 'Sender Bank'
                              : 'Bank'}
                  </Text>
                  <View style={styles.valueWithIcon}>
                    <Ionicons
                      name={
                        isElectricity
                          ? 'flash-outline'
                          : isBetting
                            ? 'trophy-outline'
                            : isCable
                              ? 'tv-outline'
                              : isAirtime
                                ? 'cellular-outline'
                                : 'business-outline'
                      }
                      size={14}
                      color={colors.inkMid}
                    />
                    <Text style={styles.rowValueRegular}>
                      {isElectricity
                        ? (transaction.counterparty_bank || 'Electricity DISCO')
                        : isBetting
                          ? bookmakerName
                          : isCable
                            ? cableProviderName
                            : isAirtime
                              ? networkProviderName
                              : transaction.counterparty_bank}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Dedicated Meter Token Detail Row */}
              {electricityToken ? (
                <View style={styles.detailRow}>
                  <Text style={styles.rowLabel}>Meter Token</Text>
                  <View style={styles.tokenInlineContainer}>
                    <Text style={styles.tokenInlineCode} numberOfLines={1}>
                      {formattedToken || electricityToken}
                    </Text>
                    <Pressable
                      onPress={handleCopyToken}
                      hitSlop={6}
                      style={[styles.inlineCopyBtn, copiedToken && styles.inlineCopyBtnCopied]}
                    >
                      <Ionicons
                        name={copiedToken ? 'checkmark-circle' : 'copy-outline'}
                        size={12}
                        color={copiedToken ? '#059669' : colors.navy}
                      />
                      <Text style={[styles.inlineCopyBtnText, copiedToken && styles.inlineCopyBtnTextCopied]}>
                        {copiedToken ? 'Copied' : 'Copy'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {/* Units Row */}
              {transaction.units ? (
                <View style={styles.detailRow}>
                  <Text style={styles.rowLabel}>Purchased Energy</Text>
                  <View style={styles.unitsPill}>
                    <Text style={styles.unitsPillText}>{transaction.units} kWh</Text>
                  </View>
                </View>
              ) : null}

              {/* Payment Account Source */}
              <View style={styles.detailRow}>
                <Text style={styles.rowLabel}>{isInflow ? 'Credited To' : 'Paid From'}</Text>
                <View style={styles.valueWithIcon}>
                  <Ionicons name="wallet-outline" size={14} color={colors.inkMid} />
                  <Text style={styles.rowValueRegular}>
                    {transaction.currency === 'USD' ? 'USD Wallet' : 'Naira Wallet'}
                  </Text>
                </View>
              </View>

              {/* Transaction Fee */}
              <View style={styles.detailRow}>
                <Text style={styles.rowLabel}>Transaction Fee</Text>
                <View style={styles.feePill}>
                  <Text style={styles.feePillText}>
                    {transaction.fee && transaction.fee > 0
                      ? formatNaira(transaction.fee, 2)
                      : 'Free'}
                  </Text>
                </View>
              </View>

              {/* Narration / Description */}
              {cleanDescription ? (
                <View style={styles.narrationSection}>
                  <Text style={styles.rowLabel}>Narration / Remarks</Text>
                  <Text style={styles.narrationText}>{cleanDescription}</Text>
                </View>
              ) : null}
            </View>

            {/* Perforated Divider with Circular Notches */}
            <View style={styles.perforatedSection}>
              <View style={styles.notchLeft} />
              <View style={styles.dashedLine} />
              <View style={styles.notchRight} />
            </View>

            {/* Lower Audit & Security Section */}
            <View style={styles.lowerDetails}>
              {/* Reference Number with 1-Tap Copy */}
              <View style={styles.referenceContainer}>
                <View style={styles.referenceTextCol}>
                  <Text style={styles.auditLabel}>TRANSACTION REFERENCE</Text>
                  <Text style={styles.referenceNumber} numberOfLines={1} ellipsizeMode="middle">
                    {transaction.reference}
                  </Text>
                </View>

                <Pressable
                  onPress={handleCopyReference}
                  hitSlop={8}
                  style={[styles.copyBtn, copiedReference && styles.copyBtnCopied]}
                >
                  <Ionicons
                    name={copiedReference ? 'checkmark-circle' : 'copy-outline'}
                    size={14}
                    color={copiedReference ? '#059669' : colors.navy}
                  />
                  <Text style={[styles.copyBtnText, copiedReference && styles.copyBtnTextCopied]}>
                    {copiedReference ? 'Copied' : 'Copy'}
                  </Text>
                </Pressable>
              </View>

              {/* Payment Delivery Status Badge */}
              <View style={styles.auditStatusRow}>
                <Text style={styles.auditLabel}>STATUS</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.pillBg }]}>
                  <Ionicons name={statusConfig.icon} size={13} color={statusConfig.pillText} />
                  <Text style={[styles.statusBadgeText, { color: statusConfig.pillText }]}>
                    {transaction.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons: Share & PDF */}
          <View style={styles.actionRow}>
            <Pressable onPress={handleShare} style={styles.actionCardBtn}>
              <View style={styles.actionIconCircle}>
                <Ionicons name="share-social-outline" size={17} color={colors.navy} />
              </View>
              <Text style={styles.actionCardBtnText}>Share Receipt</Text>
            </Pressable>

            <Pressable
              onPress={handleDownloadPdf}
              disabled={downloadingPdf}
              style={styles.actionCardBtn}
            >
              <View style={styles.actionIconCircle}>
                {downloadingPdf ? (
                  <ActivityIndicator size="small" color={colors.navy} />
                ) : (
                  <Ionicons name="download-outline" size={17} color={colors.navy} />
                )}
              </View>
              <Text style={styles.actionCardBtnText}>
                {downloadingPdf ? 'Generating…' : 'Download PDF'}
              </Text>
            </Pressable>
          </View>

          {/* Primary Done Button */}
          <View style={styles.doneContainer}>
            <Button title="Done" onPress={handleClose} />

            {/* Contextual Beneficiary: ONLY shown for bank transfers & betting */}
            {!isInflow && !isAirtime && !isElectricity && transaction.counterparty ? (
              <Pressable
                onPress={handleSaveBeneficiary}
                disabled={isBeneficiarySaved || savingBeneficiary}
                style={styles.beneficiaryBtn}
              >
                {savingBeneficiary ? (
                  <ActivityIndicator size="small" color={colors.navy} />
                ) : (
                  <Ionicons
                    name={isBeneficiarySaved ? 'checkmark-circle' : 'person-add-outline'}
                    size={16}
                    color={isBeneficiarySaved ? colors.mintDark : colors.navy}
                  />
                )}
                <Text
                  style={[
                    styles.beneficiaryBtnText,
                    isBeneficiarySaved && { color: colors.mintDark },
                  ]}
                >
                  {isBeneficiarySaved
                    ? `${(cleanRecipient || transaction.counterparty).split(' ')[0]} saved as beneficiary`
                    : savingBeneficiary
                      ? 'Saving beneficiary…'
                      : `Save ${(cleanRecipient || transaction.counterparty).split(' ')[0]} as a beneficiary`}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
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
    height: 380,
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    bottom: -80,
    left: -60,
    opacity: 0.15,
  },
  safeArea: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 4,
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  navBrandText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.white,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 36,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconHalo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  heroTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.3,
  },
  heroAmount: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 32,
    color: colors.white,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  metaText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  ticketCard: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  ticketBrandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ticketBrandText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.inkMid,
  },
  categoryPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryPillText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: colors.navy,
  },
  tokenCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 14,
  },
  tokenCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tokenTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tokenTagText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10.5,
    color: '#B45309',
    letterSpacing: 0.8,
  },
  unitsTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  unitsTagText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: '#92400E',
  },
  tokenCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  tokenCodeText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: colors.navy,
    letterSpacing: 1.2,
    flex: 1,
  },
  tokenCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tokenCopyBtnCopied: {
    backgroundColor: '#ECFDF5',
  },
  tokenCopyBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: colors.navy,
  },
  tokenCopyBtnTextCopied: {
    color: '#059669',
  },
  tokenSubtext: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: '#78350F',
    marginTop: 8,
    lineHeight: 15,
  },
  tokenInlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    maxWidth: '65%',
    justifyContent: 'flex-end',
  },
  tokenInlineCode: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12.5,
    color: colors.navy,
    letterSpacing: 0.5,
  },
  inlineCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  inlineCopyBtnCopied: {
    backgroundColor: '#ECFDF5',
  },
  inlineCopyBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: colors.navy,
  },
  inlineCopyBtnTextCopied: {
    color: '#059669',
  },
  unitsPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  unitsPillText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: '#92400E',
  },
  upperDetails: {
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  rowLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
    color: colors.inkMuted,
  },
  recipientValueGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '65%',
  },
  carrierBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  carrierBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
  },
  rowValueBold: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.ink,
  },
  valueWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rowValueRegular: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: colors.ink,
  },
  feePill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  feePillText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: '#059669',
  },
  narrationSection: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  narrationText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12.5,
    color: colors.ink,
    marginTop: 4,
    lineHeight: 18,
  },
  perforatedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    marginHorizontal: -1,
  },
  notchLeft: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0A1738',
    marginLeft: -11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginHorizontal: 6,
  },
  notchRight: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0A1738',
    marginRight: -11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  lowerDetails: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#FAFAFD',
  },
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  referenceTextCol: {
    flex: 1,
    marginRight: 12,
  },
  auditLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.inkMuted,
    marginBottom: 3,
  },
  referenceNumber: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: colors.navy,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8E2F8',
  },
  copyBtnCopied: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  copyBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: colors.navy,
  },
  copyBtnTextCopied: {
    color: '#059669',
  },
  auditStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  actionCardBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 16,
    paddingVertical: 12,
  },
  actionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: colors.white,
  },
  doneContainer: {
    marginTop: 16,
    gap: 8,
  },
  beneficiaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  beneficiaryBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  errorTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    color: colors.white,
    marginTop: 16,
  },
  errorSubtitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
