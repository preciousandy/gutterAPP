import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme';

interface SplashScreenViewProps {
  onFinish?: () => void;
  duration?: number;
}

const { width, height } = Dimensions.get('window');

export function SplashScreenView({
  onFinish,
  duration = 1800,
}: SplashScreenViewProps) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const logoFade = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(14)).current;
  const glowPulse = useRef(new Animated.Value(0.85)).current;
  const watermarkFade = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const footerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Ambient glow pulsing loop
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.85,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    glowLoop.start();

    // 2. Coordinated entrance animation
    Animated.parallel([
      Animated.timing(watermarkFade, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(logoFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 600,
        delay: 180,
        useNativeDriver: true,
      }),
      Animated.spring(contentSlide, {
        toValue: 0,
        friction: 8,
        tension: 45,
        delay: 180,
        useNativeDriver: true,
      }),
      Animated.timing(footerFade, {
        toValue: 1,
        duration: 600,
        delay: 280,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration,
        useNativeDriver: false,
      }),
    ]).start();

    // 3. Smooth exit transition into main app
    const exitTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 340,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1.05,
          duration: 340,
          useNativeDriver: true,
        }),
      ]).start(() => {
        glowLoop.stop();
        onFinish?.();
      });
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      glowLoop.stop();
    };
  }, [duration, fadeAnim, footerFade, glowPulse, logoFade, logoScale, contentFade, contentSlide, onFinish, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar style="light" />

      {/* Deep Navy Brand Gradient (matches native #0E2050 splash seamlessly) */}
      <LinearGradient
        colors={['#0E2050', '#0A1738', '#08122E']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient Mint Radial Glow Halo behind Logo */}
      <Animated.View
        style={[
          styles.glowHalo,
          {
            transform: [{ scale: glowPulse }],
          },
        ]}
        pointerEvents="none"
      />

      {/* Giant Semi-Transparent Watermark 'G' with smooth fade */}
      <Animated.View
        style={[styles.watermarkContainer, { opacity: watermarkFade }]}
        pointerEvents="none"
      >
        <Text style={styles.watermarkText}>G</Text>
      </Animated.View>

      {/* Center Hero Branding Block */}
      <View style={styles.centerContent}>
        {/* App Emblem with Glass Rim & Deep Drop Shadow */}
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              opacity: logoFade,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <View style={styles.iconCard}>
            <LinearGradient
              colors={['#172F6E', '#0D1B43']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Subtle inner top-edge glass rim highlight */}
            <View style={styles.iconHighlight} />

            <View style={styles.emblemRow}>
              <Text style={styles.emblemLetter}>G</Text>
              <View style={styles.emblemMintDot} />
            </View>
          </View>
        </Animated.View>

        {/* Brand Typography & Tagline */}
        <Animated.View
          style={[
            styles.textBlock,
            {
              opacity: contentFade,
              transform: [{ translateY: contentSlide }],
            },
          ]}
        >
          <View style={styles.titleRow}>
            <Text style={styles.brandTitle}>Gutter</Text>
            <View style={styles.brandDot} />
          </View>
          <Text style={styles.brandTagline}>Smart banking. Better future.</Text>
        </Animated.View>
      </View>

      {/* Standard Fintech Security & Trust Footer */}
      <Animated.View style={[styles.bottomSection, { opacity: footerFade }]}>
        {/* Sleek Minimal Progress Sweep */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressWidth,
              },
            ]}
          />
        </View>

        {/* Bank-Grade Security Assurance Badge */}
        <View style={styles.securityRow}>
          <Ionicons name="shield-checkmark" size={13} color={colors.mint} />
          <Text style={styles.securityText}>Bank-Grade 256-Bit Encryption</Text>
        </View>

        {/* Compliance / Version Footnote */}
        <Text style={styles.complianceText}>
          Licensed & Regulated Digital Banking
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0E2050',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  glowHalo: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(35, 211, 165, 0.09)',
    alignSelf: 'center',
    top: height * 0.33 - 50,
  },
  watermarkContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watermarkText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: Math.min(width * 1.35, 560),
    lineHeight: Math.min(width * 1.35, 560),
    color: 'rgba(255, 255, 255, 0.02)',
    fontWeight: '800',
    transform: [{ translateX: -width * 0.04 }, { translateY: height * 0.02 }],
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
  },
  iconWrapper: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 14,
  },
  iconCard: {
    width: 104,
    height: 104,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    overflow: 'hidden',
    backgroundColor: '#0E2050',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  emblemRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  emblemLetter: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 56,
    lineHeight: 62,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  emblemMintDot: {
    width: 9.5,
    height: 9.5,
    borderRadius: 4.75,
    backgroundColor: colors.mint,
    marginLeft: 3,
    marginBottom: 8,
  },
  textBlock: {
    alignItems: 'center',
    marginTop: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  brandTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  brandDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.mint,
    marginLeft: 3,
    marginBottom: 4,
  },
  brandTagline: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13.5,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.68)',
    marginTop: 6,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  progressTrack: {
    width: 110,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.mint,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.55)',
    letterSpacing: 0.2,
  },
  complianceText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.32)',
    marginTop: 5,
    letterSpacing: 0.3,
  },
});
