import { Alert, Platform } from 'react-native';
import {
  Contact,
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-contacts';

export interface SelectedContactPhone {
  name: string;
  phone: string;
}

/**
 * Normalizes a phone number to standard Nigerian 11-digit format (e.g. 08012345678).
 * Handles:
 * - "+234 801 234 5678" -> "08012345678"
 * - "2348012345678" -> "08012345678"
 * - "8012345678" -> "08012345678"
 * - "08012345678" -> "08012345678"
 */
export function normalizeNigerianPhone(raw: string): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');

  if (digits.startsWith('234') && digits.length >= 13) {
    digits = '0' + digits.slice(3);
  } else if (digits.length === 10 && !digits.startsWith('0')) {
    digits = '0' + digits;
  }

  // Keep first 11 digits if standard Nigerian phone
  if (digits.length > 11 && digits.startsWith('0')) {
    digits = digits.slice(0, 11);
  }

  return digits;
}

/**
 * Opens native device contact picker and returns the selected phone number.
 * Supports single and multiple phone numbers per contact.
 */
export async function pickContactPhoneNumber(
  onSelect: (result: SelectedContactPhone) => void
): Promise<void> {
  try {
    // 1. Check & request permission where applicable
    try {
      const { status } = await getPermissionsAsync();
      if (status !== 'granted') {
        const req = await requestPermissionsAsync();
        if (req.status !== 'granted' && Platform.OS === 'android') {
          Alert.alert(
            'Contacts Permission',
            'Please allow contacts permission in your settings to select phone numbers directly from your contacts.'
          );
          return;
        }
      }
    } catch {
      // On modern iOS, out-of-process contact picker may function without full access
    }

    // 2. Present native contact picker
    const contact = await Contact.presentPicker();
    if (!contact) {
      // User cancelled picker
      return;
    }

    const fullName = (await contact.getFullName()) || 'Contact';
    const phones = (await contact.getPhones()) || [];

    const validPhones = phones
      .map((p) => ({
        label: p.label || 'mobile',
        raw: p.number || '',
        normalized: normalizeNigerianPhone(p.number || ''),
      }))
      .filter((p) => p.normalized.length >= 10);

    if (validPhones.length === 0) {
      Alert.alert(
        'No Phone Number',
        `No valid phone number found for ${fullName}.`
      );
      return;
    }

    // 3. If single phone number, select immediately
    if (validPhones.length === 1) {
      onSelect({
        name: fullName,
        phone: validPhones[0].normalized,
      });
      return;
    }

    // 4. If multiple phone numbers, prompt user to choose
    Alert.alert(
      fullName,
      'Select which phone number to use:',
      [
        ...validPhones.map((p) => ({
          text: `${p.label.toUpperCase()}: ${p.normalized}`,
          onPress: () => {
            onSelect({
              name: fullName,
              phone: p.normalized,
            });
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
      { cancelable: true }
    );
  } catch (err: any) {
    console.error('Error selecting contact:', err);
    Alert.alert(
      'Unable to Open Contacts',
      'Could not open your contacts. Please ensure permissions are enabled in your device settings.'
    );
  }
}
