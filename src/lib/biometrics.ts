import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_TOKEN_KEY = 'gutter_app_biometric_token';
const SAVED_LOGIN_ID_KEY = 'gutter_app_saved_login_id';

export type BiometricKind = 'face' | 'fingerprint' | 'iris' | 'none';

export interface BiometricStatus {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  biometricType: BiometricKind;
  label: string;
}

export async function checkBiometricStatus(): Promise<BiometricStatus> {
  if (Platform.OS === 'web') {
    return {
      isAvailable: false,
      hasHardware: false,
      isEnrolled: false,
      biometricType: 'none',
      label: 'Use Biometrics',
    };
  }

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometricType: BiometricKind = 'none';
    let label = 'Use Biometrics';

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'face';
      label = Platform.OS === 'ios' ? 'Use Face ID' : 'Use Face Unlock';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = 'fingerprint';
      label = Platform.OS === 'ios' ? 'Use Touch ID' : 'Use Fingerprint';
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometricType = 'iris';
      label = 'Use Iris Unlock';
    }

    return {
      isAvailable: hasHardware && isEnrolled,
      hasHardware,
      isEnrolled,
      biometricType,
      label,
    };
  } catch (err) {
    return {
      isAvailable: false,
      hasHardware: false,
      isEnrolled: false,
      biometricType: 'none',
      label: 'Use Biometrics',
    };
  }
}

export async function promptBiometricAuth(promptMessage = 'Log in to your Gutter account'): Promise<{
  success: boolean;
  error?: string;
}> {
  if (Platform.OS === 'web') {
    return { success: false, error: 'Biometrics not supported on web.' };
  }

  try {
    const status = await checkBiometricStatus();
    if (!status.hasHardware) {
      return { success: false, error: 'Your device does not support biometric authentication.' };
    }
    if (!status.isEnrolled) {
      return {
        success: false,
        error: 'No biometric credentials enrolled. Please enable Face ID or Fingerprint in device settings.',
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use Password',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }

    return {
      success: false,
      error: result.error ? `Biometric authentication failed: ${result.error}` : 'Authentication cancelled',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Biometric authentication failed.',
    };
  }
}

const BIOMETRIC_ENABLED_KEY = 'gutter_app_biometric_enabled';

// Secure storage helpers for biometric token & remembered login
export async function hasSavedBiometricSession(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' && !!localStorage.getItem(BIOMETRIC_TOKEN_KEY);
  }
  try {
    const flag = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return flag === 'true';
  } catch {
    return false;
  }
}

export async function getSavedBiometricToken(
  promptMessage = 'Scan to authenticate with Gutter'
): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(BIOMETRIC_TOKEN_KEY) : null;
  }

  try {
    // Attempt hardware-authenticated retrieval from Secure Enclave / Keystore
    const token = await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY, {
      requireAuthentication: true,
      authenticationPrompt: promptMessage,
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return token;
  } catch (err) {
    // Fallback if hardware-level prompt encounters platform exception
    try {
      return await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);
    } catch {
      return null;
    }
  }
}

export async function saveBiometricSession(token: string, loginId?: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(BIOMETRIC_TOKEN_KEY, token);
      localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      if (loginId) localStorage.setItem(SAVED_LOGIN_ID_KEY, loginId);
    }
    return;
  }

  // 1. Store presence flag (does not require biometrics to query)
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true', {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  // 2. Store token in Secure Enclave with device-only hardware restriction
  try {
    await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      requireAuthentication: true,
    });
  } catch {
    // If requireAuthentication is not supported on this platform/simulator, store with device-only key
    await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  // 3. Store remembered login identifier (email or phone)
  if (loginId) {
    await SecureStore.setItemAsync(SAVED_LOGIN_ID_KEY, loginId, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
}

export async function clearBiometricSession(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(BIOMETRIC_TOKEN_KEY);
      localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
    }
    return;
  }
  await Promise.all([
    SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY).catch(() => {}),
  ]);
}

export async function getSavedLoginId(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(SAVED_LOGIN_ID_KEY) : null;
  }
  return SecureStore.getItemAsync(SAVED_LOGIN_ID_KEY);
}

export async function saveLoginId(loginId: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SAVED_LOGIN_ID_KEY, loginId);
    }
    return;
  }
  await SecureStore.setItemAsync(SAVED_LOGIN_ID_KEY, loginId, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearSavedLoginId(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SAVED_LOGIN_ID_KEY);
    }
    return;
  }
  await SecureStore.deleteItemAsync(SAVED_LOGIN_ID_KEY);
}
