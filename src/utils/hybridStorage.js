import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

/**
 * Hybrid Storage Utility (Local-only - Firebase removed)
 * Uses AsyncStorage for all data persistence.
 *
 * NOTE: storage.js va hybridStorage.js ikkalasida ham saveData/getData bor.
 * Import chalkashuvi bo'lmasligi uchun:
 *   import { saveHybrid, getHybrid } from '../utils/hybridStorage';
 * yoki to'liq yo'l bilan import qiling.
 */

/**
 * Save data to local storage (auto JSON-stringify for objects/arrays)
 */
export const saveData = async (key, value, userId = null) => {
    try {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        await AsyncStorage.setItem(key, serialized);
        console.log(`💾 Saved locally: ${key}`);
        return true;
    } catch (error) {
        console.error('Error in saveData:', error);
        return false;
    }
};

/**
 * Get data from local storage (auto JSON-parse if possible)
 */
export const getData = async (key, userId = null) => {
    try {
        const value = await AsyncStorage.getItem(key);
        if (value === null) return null;
        try {
            return JSON.parse(value);
        } catch (_) {
            return value; // String edi, shundayligicha qaytaramiz
        }
    } catch (error) {
        console.error('Error in getData:', error);
        return null;
    }
};

/**
 * Remove data from local storage
 */
export const removeData = async (key, userId = null) => {
    try {
        await AsyncStorage.removeItem(key);
        console.log(`🗑️ Removed locally: ${key}`);
    } catch (error) {
        console.error('Error removing data:', error);
    }
};

/**
 * Process sync queue (no-op - Firebase removed)
 */
export const processSyncQueue = async (userId) => {
    // No-op: Firebase sync disabled
};

/**
 * Setup network listener (simplified)
 */
export const setupNetworkListener = (userId) => {
    const unsubscribe = NetInfo.addEventListener(state => {
        console.log('Network status:', state.isConnected ? 'Online' : 'Offline');
    });
    return unsubscribe;
};

// Chalkashuvni oldini olish uchun aniq aliaslar
export const saveHybrid = saveData;
export const getHybrid = getData;
export const removeHybrid = removeData;
