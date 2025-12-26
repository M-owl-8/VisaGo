/**
 * Device ID Utility
 * Generates and stores a unique device identifier for session tracking
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DEVICE_ID_STORAGE_KEY = '@visabuddy_device_id';

/**
 * Generate a unique device ID
 */
const generateDeviceId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${Platform.OS}-${timestamp}-${random}`;
};

/**
 * Get or create a unique device ID
 * This ID persists across app restarts
 */
export const getDeviceId = async (): Promise<string> => {
  try {
    // Try to get existing device ID
    const existingId = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existingId) {
      return existingId;
    }

    // Generate new device ID
    const newId = generateDeviceId();
    await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, newId);
    return newId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    // Fallback to generating a temporary ID
    return generateDeviceId();
  }
};

