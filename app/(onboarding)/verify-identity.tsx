import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Button } from '@/components/Button';
import { GWatermark } from '@/components/GWatermark';
import { submitKyc, type KycDocumentType } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme';

interface AttachedDocument {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
}

const DOCUMENTS: {
  type: KycDocumentType;
  badge: string;
  title: string;
  subtitle: string;
  numberLabel: string;
  placeholder: string;
}[] = [
  {
    type: 'nin',
    badge: 'NIN',
    title: 'National Identity Number',
    subtitle: 'Fastest · verified instantly',
    numberLabel: 'NIN number',
    placeholder: '1234 5678 901',
  },
  {
    type: 'bvn',
    badge: 'BVN',
    title: 'Bank Verification Number',
    subtitle: '11 digits · dial *565*0#',
    numberLabel: 'BVN number',
    placeholder: '12345678901',
  },
  {
    type: 'pvc',
    badge: 'VIN',
    title: "Voter's Card (PVC)",
    subtitle: 'Upload front and back',
    numberLabel: 'VIN number',
    placeholder: '90F5B1234567890123',
  },
  {
    type: 'passport',
    badge: 'PAS',
    title: 'International Passport',
    subtitle: 'Data page only',
    numberLabel: 'Passport number',
    placeholder: 'A01234567',
  },
];

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VerifyIdentityScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [documentType, setDocumentType] = useState<KycDocumentType>('nin');
  const [documentNumber, setDocumentNumber] = useState('');
  const [attachedDoc, setAttachedDoc] = useState<AttachedDocument | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const selected = DOCUMENTS.find((d) => d.type === documentType)!;

  const handleSelectDocType = (type: KycDocumentType) => {
    setDocumentType(type);
    setFormError(null);
  };

  const handlePickFromCamera = async () => {
    setUploadModalOpen(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Camera access is required to take photos of documents.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAttachedDoc({
          uri: asset.uri,
          name: asset.fileName || `${selected.badge}_photo.jpg`,
          size: asset.fileSize,
          mimeType: asset.mimeType || 'image/jpeg',
        });
        setFormError(null);
      }
    } catch (e) {
      setFormError('Failed to capture photo. Please try again.');
    }
  };

  const handlePickFromGallery = async () => {
    setUploadModalOpen(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Photo library access is required to upload document images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAttachedDoc({
          uri: asset.uri,
          name: asset.fileName || `${selected.badge}_document.jpg`,
          size: asset.fileSize,
          mimeType: asset.mimeType || 'image/jpeg',
        });
        setFormError(null);
      }
    } catch (e) {
      setFormError('Failed to pick image from gallery.');
    }
  };

  const handlePickFromFile = async () => {
    setUploadModalOpen(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAttachedDoc({
          uri: asset.uri,
          name: asset.name || `${selected.badge}_document.pdf`,
          size: asset.size,
          mimeType: asset.mimeType || 'application/pdf',
        });
        setFormError(null);
      }
    } catch (e) {
      setFormError('Failed to select document file.');
    }
  };

  const handleContinue = async () => {
    setFormError(null);
    const cleanNumber = documentNumber.replace(/[\s-]/g, '').trim();

    if (!cleanNumber) {
      setFormError(`Please enter your ${selected.numberLabel}.`);
      return;
    }

    if (documentType === 'nin' && cleanNumber.length !== 11 && cleanNumber.length !== 16) {
      setFormError('NIN must be 11 numeric digits (or a 16-character virtual NIN).');
      return;
    }

    if (documentType === 'bvn' && cleanNumber.length !== 11) {
      setFormError('BVN must be exactly 11 digits.');
      return;
    }

    if (!attachedDoc?.uri) {
      setFormError(`Please upload a photo or document copy of your ${selected.title}.`);
      return;
    }

    setLoading(true);
    try {
      await submitKyc({
        document_type: documentType,
        document_number: cleanNumber,
        document_image: attachedDoc.uri,
      });
      await refreshUser().catch(() => undefined);
      router.push('/(onboarding)/face-verification');
    } catch (e) {
      setFormError(errorMessage(e));
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-page">
      <GWatermark size={500} className="-bottom-10 -right-40" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          contentContainerClassName="flex-grow px-[22px] pb-6 pt-3"
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Navigation */}
          <View className="mb-2.5 flex-row items-center gap-3.5">
            <Pressable
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)');
                }
              }}
              className="h-[38px] w-[38px] items-center justify-center rounded-xl border border-line-input bg-surface active:opacity-70"
            >
              <Ionicons name="arrow-back" size={18} color={colors.ink} />
            </Pressable>
            <View className="h-[5px] flex-1 overflow-hidden rounded-full bg-line-input">
              <View className="h-full w-[70%] rounded-full bg-mint" />
            </View>
            <Text className="font-sans-bold text-xs text-ink-muted">2 of 3</Text>
          </View>

          <Text className="font-sans-extrabold text-[27px] leading-[32px] tracking-tight text-ink">
            Verify your identity
          </Text>
          <Text className="mt-1.5 font-sans text-[13px] leading-5 text-ink-muted">
            Required before you can transfer, trade or hold a card. Choose one document.
          </Text>

          {formError ? (
            <Text className="mt-3 rounded-2xl bg-red-bg p-3.5 font-sans text-[13px] text-red">
              {formError}
            </Text>
          ) : null}

          {/* Document Types List */}
          <Text className="mb-2 mt-4 font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-muted">
            Document type
          </Text>
          <View className="gap-2.5">
            {DOCUMENTS.map((doc) => {
              const active = doc.type === documentType;
              return (
                <TouchableOpacity
                  key={doc.type}
                  activeOpacity={0.7}
                  onPress={() => handleSelectDocType(doc.type)}
                  className="h-14 flex-row items-center gap-3 rounded-[18px] bg-surface px-4"
                  style={{
                    borderColor: active ? colors.navy : colors.line,
                    borderWidth: active ? 1.5 : 1,
                  }}
                >
                  <View
                    pointerEvents="none"
                    className={`h-9 w-9 items-center justify-center rounded-xl ${
                      active ? 'bg-chip' : 'bg-page'
                    }`}
                  >
                    <Text
                      className={`font-sans-bold text-[11px] ${active ? 'text-navy' : 'text-ink-mid'}`}
                    >
                      {doc.badge}
                    </Text>
                  </View>
                  <View pointerEvents="none" className="flex-1">
                    <Text className="font-sans-bold text-[13px] text-ink">{doc.title}</Text>
                    <Text className="mt-0.5 font-sans text-[10.5px] text-ink-soft">
                      {doc.subtitle}
                    </Text>
                  </View>
                  <View pointerEvents="none">
                    {active ? (
                      <View className="h-5 w-5 items-center justify-center rounded-full bg-navy">
                        <Ionicons name="checkmark" size={12} color={colors.white} />
                      </View>
                    ) : (
                      <View className="h-5 w-5 rounded-full border-2 border-[#D6DCE8]" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Document Number Input */}
          <Text className="mb-2 mt-4 font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-muted">
            {selected.numberLabel}
          </Text>
          <View className="h-[54px] flex-row items-center rounded-2xl border border-line-input bg-surface px-4">
            <NumberInput
              value={documentNumber}
              onChangeText={setDocumentNumber}
              placeholder={selected.placeholder}
              keyboardType={documentType === 'passport' ? 'default' : 'number-pad'}
            />
          </View>

          {/* Upload Document File Picker */}
          <View className="mb-2 mt-4 flex-row items-center justify-between">
            <Text className="font-sans-bold text-[11px] uppercase tracking-[1.5px] text-ink-muted">
              Upload document <Text className="text-red">*</Text>
            </Text>
            <View className="rounded-md border border-red/20 bg-red-bg px-2 py-0.5">
              <Text className="font-sans-bold text-[9.5px] uppercase tracking-wider text-red">
                Required
              </Text>
            </View>
          </View>

          {attachedDoc ? (
            <View className="flex-row items-center gap-3 rounded-[18px] border border-mint/40 bg-mint-bg p-3.5">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-mint">
                <Ionicons
                  name={attachedDoc.mimeType?.includes('pdf') ? 'document-text' : 'image'}
                  size={18}
                  color={colors.navy}
                />
              </View>
              <View className="flex-1">
                <Text numberOfLines={1} className="font-sans-bold text-[13px] text-ink">
                  {attachedDoc.name}
                </Text>
                <Text className="mt-0.5 font-sans text-[11px] text-ink-soft">
                  {formatBytes(attachedDoc.size) || 'Ready to submit'} · Attached
                </Text>
              </View>
              <Pressable
                onPress={() => setAttachedDoc(null)}
                hitSlop={8}
                className="h-8 w-8 items-center justify-center rounded-lg bg-surface active:opacity-70"
              >
                <Ionicons name="trash-outline" size={16} color={colors.red} />
              </Pressable>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setUploadModalOpen(true)}
              className={`h-[84px] items-center justify-center gap-1.5 rounded-[18px] border-[1.5px] border-dashed ${
                formError?.toLowerCase().includes('upload')
                  ? 'border-red bg-red-bg/30'
                  : 'border-[#C3CFE3] bg-[#FBFCFE]'
              }`}
            >
              <View className="h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-chip">
                <Ionicons name="arrow-up" size={16} color={colors.navy} />
              </View>
              <Text className="font-sans-bold text-[12.5px] text-ink">
                Take a photo or upload a file
              </Text>
              <Text className="font-sans text-[10.5px] text-ink-faint">
                JPG, PNG or PDF · max 5 MB (Required)
              </Text>
            </TouchableOpacity>
          )}

          {/* Regulatory security disclaimer */}
          <View className="mt-4 flex-row items-start gap-3 rounded-2xl bg-chip p-3.5">
            <View className="h-5 w-5 items-center justify-center rounded-md bg-navy">
              <Ionicons name="lock-closed" size={11} color={colors.white} />
            </View>
            <Text className="flex-1 font-sans text-[11px] leading-4 text-ink-slate">
              Your details are encrypted and used only for regulatory verification. Document images
              are deleted after approval.
            </Text>
          </View>

          {/* Submit Action */}
          <View className="mt-auto pt-5">
            <Button
              title="Continue to face check"
              onPress={handleContinue}
              loading={loading}
              disabled={!documentNumber.trim() || !attachedDoc}
            />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Upload Choice Action Sheet Modal */}
      <Modal
        visible={uploadModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setUploadModalOpen(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-navy-darkest/60"
          onPress={() => setUploadModalOpen(false)}
        >
          <Pressable
            className="rounded-t-[32px] bg-surface px-6 pb-9 pt-3 shadow-2xl"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <View className="items-center pb-3">
              <View className="h-1 w-11 rounded-full bg-line-input" />
            </View>

            <View className="flex-row items-center justify-between pb-3 pt-1">
              <Text className="font-sans-extrabold text-[18px] text-ink">Upload document</Text>
              <Pressable
                onPress={() => setUploadModalOpen(false)}
                hitSlop={10}
                className="h-7 w-7 items-center justify-center rounded-full bg-page"
              >
                <Ionicons name="close" size={16} color={colors.inkMuted} />
              </Pressable>
            </View>
            <Text className="font-sans text-[12.5px] leading-5 text-ink-muted">
              Choose how you would like to provide your {selected.title}.
            </Text>

            <View className="mt-4 gap-2.5">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handlePickFromCamera}
                className="h-14 flex-row items-center gap-3.5 rounded-2xl border border-line-input bg-page px-4"
              >
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-chip">
                  <Ionicons name="camera-outline" size={18} color={colors.navy} />
                </View>
                <View className="flex-1">
                  <Text className="font-sans-bold text-[13.5px] text-ink">Take a photo</Text>
                  <Text className="font-sans text-[11px] text-ink-muted">Use your camera</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handlePickFromGallery}
                className="h-14 flex-row items-center gap-3.5 rounded-2xl border border-line-input bg-page px-4"
              >
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-chip">
                  <Ionicons name="images-outline" size={18} color={colors.navy} />
                </View>
                <View className="flex-1">
                  <Text className="font-sans-bold text-[13.5px] text-ink">Photo library</Text>
                  <Text className="font-sans text-[11px] text-ink-muted">Choose from gallery</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handlePickFromFile}
                className="h-14 flex-row items-center gap-3.5 rounded-2xl border border-line-input bg-page px-4"
              >
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-chip">
                  <Ionicons name="folder-outline" size={18} color={colors.navy} />
                </View>
                <View className="flex-1">
                  <Text className="font-sans-bold text-[13.5px] text-ink">Browse files</Text>
                  <Text className="font-sans text-[11px] text-ink-muted">Upload PDF or image file</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
              </TouchableOpacity>
            </View>

            <Pressable
              onPress={() => setUploadModalOpen(false)}
              className="mt-4 h-11 items-center justify-center rounded-xl active:bg-page"
            >
              <Text className="font-sans-semibold text-[13px] text-ink-muted">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function NumberInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.inkFaint}
      autoCapitalize="characters"
      autoCorrect={false}
      spellCheck={false}
      autoComplete="off"
      textContentType="none"
      className="h-full flex-1 font-grotesk text-base tracking-widest text-ink"
      {...props}
    />
  );
}
