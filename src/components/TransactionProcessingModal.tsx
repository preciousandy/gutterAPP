import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GWatermark } from './GWatermark';
import { Button } from './Button';
import { colors } from '@/theme';

interface TransactionProcessingModalProps {
  visible: boolean;
  amountLabel?: string;
  title?: string;
  onTimeoutAction?: () => void;
  timeoutSeconds?: number;
}

const { width } = Dimensions.get('window');

export function TransactionProcessingModal({
  visible,
  amountLabel,
  title = 'Processing Transaction',
  onTimeoutAction,
  timeoutSeconds = 25,
}: TransactionProcessingModalProps) {
  const [elapsed, setElapsed] = useState(0);
  const [isTimedOut, setIsTimedOut] = useState(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.5)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0.3)).current;

  // Reset state when visibility changes
  useEffect(() => {
    if (!visible) {
      setElapsed(0);
      setIsTimedOut(false);
      return;
    }

    setElapsed(0);
    setIsTimedOut(false);

    // Elapsed timer to progress messages & trigger safety timeout
    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= timeoutSeconds) {
          setIsTimedOut(true);
        }
        return next;
      });
    }, 1000);

    // Continuous pulse & breathing animation on Gutter emblem
    const breatheAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.97,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    breatheAnimation.start();

    // Concentric expanding mint rings
    const ring1Animation = Animated.loop(
      Animated.parallel([
        Animated.timing(ring1Scale, {
          toValue: 1.7,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(ring1Opacity, {
            toValue: 0.45,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(ring1Opacity, {
            toValue: 0,
            duration: 1400,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    ring1Animation.start();

    const ring2Animation = Animated.loop(
      Animated.sequence([
        Animated.delay(450),
        Animated.parallel([
          Animated.timing(ring2Scale, {
            toValue: 2.1,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(ring2Opacity, {
              toValue: 0.35,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(ring2Opacity, {
              toValue: 0,
              duration: 1400,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ])
    );
    ring2Animation.start();

    return () => {
      clearInterval(interval);
      breatheAnimation.stop();
      ring1Animation.stop();
      ring2Animation.stop();
    };
  }, [visible, timeoutSeconds, pulseAnim, ring1Opacity, ring1Scale, ring2Opacity, ring2Scale]);

  // Progressive status message based on elapsed seconds
  const getStatusMessage = () => {
    if (elapsed < 3) return 'Verifying 4-digit security PIN…';
    if (elapsed < 8) return 'Broadcasting transaction to network…';
    if (elapsed < 16) return 'Confirming settlement with provider…';
    return 'Finalizing transaction records…';
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        {/* Deep Navy Gradient Backdrop */}
        <LinearGradient
          colors={['#0A1A3F', '#081432', '#050D21']}
          style={StyleSheet.absoluteFill}
        />

        {/* Ambient Watermark */}
        <GWatermark light size={440} className="-right-32 top-16" />

        <View className="w-full max-w-[340px] items-center px-6">
          {!isTimedOut ? (
            <>
              {/* Animated Rings & Logo Emblem */}
              <View className="relative mb-8 h-40 w-40 items-center justify-center">
                {/* Outer Ring */}
                <Animated.View
                  style={[
                    styles.pulseRing,
                    {
                      transform: [{ scale: ring2Scale }],
                      opacity: ring2Opacity,
                    },
                  ]}
                />
                {/* Inner Ring */}
                <Animated.View
                  style={[
                    styles.pulseRing,
                    {
                      transform: [{ scale: ring1Scale }],
                      opacity: ring1Opacity,
                    },
                  ]}
                />

                {/* Central Glassmorphic Gutter Emblem */}
                <Animated.View
                  style={[
                    styles.emblemCard,
                    {
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                >
                  <View className="flex-row items-end justify-center">
                    <Text style={styles.logoLetter}>G</Text>
                    <View style={styles.logoMintDot} />
                  </View>
                </Animated.View>
              </View>

              {/* Title & Amount */}
              <Text className="text-center font-sans-extrabold text-[20px] tracking-tight text-white">
                {title}
              </Text>
              {amountLabel ? (
                <Text className="mt-2 text-center font-grotesk-bold text-[28px] text-white">
                  {amountLabel}
                </Text>
              ) : null}

              {/* Progressive Status Message Card */}
              <View className="mt-6 w-full flex-row items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <View className="h-2 w-2 rounded-full bg-mint" />
                <Text className="font-sans-medium text-[13px] text-white/80">
                  {getStatusMessage()}
                </Text>
              </View>

              <Text className="mt-4 text-center font-sans text-xs text-white/40">
                Please keep the app open while we confirm your transaction.
              </Text>
            </>
          ) : (
            /* Safe Timeout Resolution Card (Never leaves user stranded or double-charged) */
            <View className="w-full items-center rounded-[28px] border border-white/15 bg-white/10 p-6 shadow-2xl">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-amber-bg border border-amber-line">
                <Ionicons name="time-outline" size={32} color={colors.btc} />
              </View>

              <Text className="text-center font-sans-extrabold text-[18px] text-white">
                Network Taking Longer
              </Text>

              <Text className="mt-2.5 text-center font-sans text-[12.5px] leading-5 text-white/70">
                Your request has been submitted, but the network is responding slowly. To avoid
                duplicate charges, please do not retry immediately.
              </Text>

              <View className="mt-4 w-full rounded-xl bg-white/5 p-3">
                <Text className="text-center font-sans-semibold text-[11.5px] text-mint">
                  ✓ Your funds are secure while the network confirms.
                </Text>
              </View>

              <View className="mt-6 w-full">
                <Button
                  title="Check Recent Activity"
                  onPress={() => onTimeoutAction?.()}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 2,
    borderColor: colors.mint,
    backgroundColor: 'rgba(35, 211, 165, 0.08)',
  },
  emblemCard: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  logoLetter: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 52,
    lineHeight: 56,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  logoMintDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.mint,
    marginBottom: 7,
    marginLeft: 2,
  },
});
