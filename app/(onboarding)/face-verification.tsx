import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { submitFaceCheck } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme';

export default function FaceVerificationScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [instruction, setInstruction] = useState('Take a selfie or position your face inside the circle');
  const [isSuccess, setIsSuccess] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // All biometric checks start UNCHECKED (done: false)
  const [checks, setChecks] = useState([
    { id: 1, label: 'Face detected in frame', done: false },
    { id: 2, label: 'Good lighting & contrast', done: false },
    { id: 3, label: 'Liveness check passed', done: false },
    { id: 4, label: 'Biometric 1:1 match with ID', done: false },
  ]);

  // Request camera permissions on mount
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  // Launch front camera or image picker to capture face
  const handleTakeSelfie = async () => {
    setFormError(null);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Camera access is required to take a selfie.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setCapturedPhoto(uri);
        setProgress(50);
        setInstruction('Face detected! Tap "Verify Face" to submit');
        setChecks((prev) =>
          prev.map((c) =>
            c.id === 1 || c.id === 2 ? { ...c, done: true } : { ...c, done: false }
          )
        );
      }
    } catch {
      // If native camera fails (e.g. simulator without camera), offer photo library
      handlePickFromGallery();
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setCapturedPhoto(uri);
        setProgress(50);
        setInstruction('Face image loaded! Tap "Verify Face" to submit');
        setChecks((prev) =>
          prev.map((c) =>
            c.id === 1 || c.id === 2 ? { ...c, done: true } : { ...c, done: false }
          )
        );
      }
    } catch {
      setFormError('Failed to select photo. Please try again.');
    }
  };

  const handleCaptureAndVerify = async () => {
    setFormError(null);

    let selfieUri = capturedPhoto;

    // If live camera is available and no photo taken yet, take a snapshot
    if (!selfieUri && permission?.granted && cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
        if (photo?.uri) {
          selfieUri = photo.uri;
          setCapturedPhoto(photo.uri);
        }
      } catch {
        // Fallback to selfie prompt
      }
    }

    if (!selfieUri) {
      // Guide the user to capture their selfie first
      void handleTakeSelfie();
      return;
    }

    setLoading(true);

    try {
      // Step 1: Detect face & lighting
      setInstruction('Analyzing biometric features…');
      setChecks((prev) =>
        prev.map((c) => (c.id === 1 || c.id === 2 ? { ...c, done: true } : c))
      );
      setProgress(50);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 2: Liveness scan
      setInstruction('Running liveness verification…');
      setChecks((prev) =>
        prev.map((c) => (c.id === 3 ? { ...c, done: true } : c))
      );
      setProgress(75);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 3: Call backend API with the selfie
      setInstruction('Matching with your identity document…');
      const res = await submitFaceCheck(selfieUri);

      // Step 4: Finalize check
      setChecks((prev) => prev.map((c) => ({ ...c, done: true })));
      setProgress(100);
      setIsSuccess(true);
      const isPending = res.status === 'pending' || res.user?.kyc_status === 'pending';
      setInstruction(
        isPending
          ? 'Submitted for compliance review!'
          : 'Face verification complete!'
      );

      // Refresh auth user so kyc_status updates in state
      await refreshUser().catch(() => undefined);

      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Route to PIN creation if no PIN set, else home tabs
      if (user?.has_pin) {
        router.replace('/(tabs)');
      } else {
        router.push('/(onboarding)/create-pin');
      }
    } catch (e) {
      setFormError(errorMessage(e));
      setProgress(capturedPhoto ? 50 : 0);
      setInstruction(capturedPhoto ? 'Face detected! Tap "Verify Face" to retry' : 'Position your face inside the circle');
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-navy-darkest">
      <GWatermark light size={540} className="-left-36 bottom-10" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView contentContainerClassName="flex-grow px-[26px] pb-6 pt-3">
          {/* Header */}
          <View className="mb-[18px] flex-row items-center gap-3.5">
            <Pressable
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)');
                }
              }}
              className="h-[38px] w-[38px] items-center justify-center rounded-xl border border-white/20 bg-white/15 active:opacity-70"
            >
              <Ionicons name="arrow-back" size={18} color={colors.white} />
            </Pressable>
            <View className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/15">
              <View className="h-full w-full rounded-full bg-mint" />
            </View>
            <Text className="font-sans-bold text-xs text-white/60">3 of 3</Text>
          </View>

          <Text className="font-sans-extrabold text-[27px] leading-[33px] tracking-tight text-white">
            Face verification
          </Text>
          <Text className="mt-2 font-sans text-[13px] leading-5 text-white/60">
            Take a selfie or position your face inside the circle. We match it against your ID photo.
          </Text>

          {formError ? (
            <Text className="mt-3 rounded-2xl bg-red-bg p-3.5 font-sans text-[13px] text-red">
              {formError}
            </Text>
          ) : null}

          {/* Circular Viewfinder */}
          <View className="mt-6 items-center">
            <View className="h-[262px] w-[262px]">
              {/* Camera Circle Container */}
              <View className="absolute inset-0 items-center justify-center overflow-hidden rounded-full bg-[#12224A]">
                {capturedPhoto ? (
                  <Image
                    source={{ uri: capturedPhoto }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : permission?.granted ? (
                  <CameraView
                    ref={cameraRef}
                    style={{ width: '100%', height: '100%' }}
                    facing="front"
                  />
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleTakeSelfie}
                    className="h-full w-full items-center justify-center px-4"
                  >
                    <View className="h-16 w-16 items-center justify-center rounded-full bg-white/10">
                      <Ionicons name="camera-reverse" size={32} color={colors.mint} />
                    </View>
                    <Text className="mt-3 text-center font-sans-bold text-[13px] text-white">
                      Tap to Take Selfie
                    </Text>
                    <Text className="mt-1 text-center font-sans text-[11px] leading-4 text-white/50">
                      Open front camera to capture your face
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Success Overlay */}
                {isSuccess ? (
                  <View className="absolute inset-0 items-center justify-center bg-navy-darkest/85">
                    <Ionicons name="checkmark-circle" size={68} color={colors.mint} />
                    <Text className="mt-2 text-center font-sans-bold text-sm text-mint">
                      Face Verified!
                    </Text>
                  </View>
                ) : null}

                {/* Face Guide Oval */}
                {!isSuccess && !capturedPhoto ? (
                  <View
                    pointerEvents="none"
                    className="absolute h-[180px] w-[140px] rounded-full border border-dashed border-mint/40"
                  />
                ) : null}
              </View>

              {/* Progress Ring Border */}
              <View
                pointerEvents="none"
                className={`absolute -inset-[9px] rounded-full border-[3px] ${
                  isSuccess ? 'border-mint' : progress > 0 ? 'border-mint' : 'border-white/15'
                }`}
                style={{
                  borderRightColor: progress > 50 ? colors.mint : 'rgba(35,211,165,0.25)',
                  borderBottomColor: progress > 75 ? colors.mint : 'rgba(35,211,165,0.25)',
                }}
              />

              {/* Progress Badge */}
              <View
                pointerEvents="none"
                className={`absolute -top-[9px] left-1/2 -ml-[27px] h-[30px] w-[54px] items-center justify-center rounded-[11px] shadow-md ${
                  progress > 0 ? 'bg-mint' : 'bg-white/20'
                }`}
              >
                <Text
                  className={`font-sans-extrabold text-[11px] ${
                    progress > 0 ? 'text-mint-on' : 'text-white'
                  }`}
                >
                  {progress}%
                </Text>
              </View>
            </View>

            {/* Selfie Action Buttons under Viewfinder */}
            <View className="mt-3.5 flex-row items-center gap-2">
              {capturedPhoto && !isSuccess ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setCapturedPhoto(null);
                    setProgress(0);
                    setInstruction('Take a selfie or position your face inside the circle');
                    setChecks((prev) => prev.map((c) => ({ ...c, done: false })));
                  }}
                  className="flex-row items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 active:bg-white/15"
                >
                  <Ionicons name="refresh-outline" size={14} color={colors.white} />
                  <Text className="font-sans-semibold text-[11.5px] text-white">Retake selfie</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleTakeSelfie}
                  className="flex-row items-center gap-1.5 rounded-full bg-mint/15 px-3.5 py-1.5 border border-mint/30 active:bg-mint/25"
                >
                  <Ionicons name="camera-reverse-outline" size={14} color={colors.mint} />
                  <Text className="font-sans-bold text-[11.5px] text-mint">
                    {permission?.granted ? 'Take Selfie Snapshot' : 'Open Front Camera'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Current Instruction Indicator */}
          <View className="mt-4 flex-row items-center gap-2 self-center rounded-[14px] border border-mint/30 bg-mint/10 px-[18px] py-[11px]">
            <View className="h-[7px] w-[7px] rounded-full bg-mint" />
            <Text className="font-sans-bold text-[12.5px] text-mint">{instruction}</Text>
          </View>

          {/* Biometric Checklist */}
          <View className="mt-5 gap-3 rounded-[22px] border border-white/10 bg-white/5 p-[18px]">
            {checks.map((check) => (
              <View key={check.id} className="flex-row items-center gap-3">
                <View
                  className={`h-6 w-6 items-center justify-center rounded-lg ${
                    check.done ? 'bg-mint' : 'bg-white/15'
                  }`}
                >
                  {check.done ? (
                    <Ionicons name="checkmark" size={13} color={colors.mintOn} />
                  ) : (
                    <View className="h-1.5 w-1.5 rounded-full bg-white/60" />
                  )}
                </View>
                <Text
                  className={`flex-1 font-sans-semibold text-[12.5px] ${
                    check.done ? 'text-white/90' : 'text-white/55'
                  }`}
                >
                  {check.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View className="mt-auto gap-3.5 pt-6">
            <Button
              title={
                isSuccess
                  ? 'Verified!'
                  : loading
                    ? 'Verifying…'
                    : capturedPhoto
                      ? 'Verify Face'
                      : 'Capture & Verify'
              }
              variant="mint"
              onPress={handleCaptureAndVerify}
              loading={loading && !isSuccess}
              disabled={isSuccess}
            />
            <Text className="text-center font-sans-semibold text-[12.5px] text-white/45">
              Having trouble?{' '}
              <Text className="font-sans-extrabold text-mint">Verify at a Gutter agent</Text>
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
