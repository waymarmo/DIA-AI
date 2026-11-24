import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Data Migration Utility (Local-only - Firebase removed)
 * Manages data within AsyncStorage only
 */

/**
 * Migrate user data within AsyncStorage (no cloud sync)
 */
export const migrateToFirestore = async (userId) => {
    try {
        console.log('💾 Data migration (local-only mode)');
        await AsyncStorage.setItem('migrationComplete', 'true');
        await AsyncStorage.setItem('migratedUserId', userId);
        return true;
    } catch (error) {
        console.error('Error during migration:', error);
        return false;
    }
};

/**
 * Check if migration has been completed
 */
export const isMigrationComplete = async (userId) => {
    try {
        const migrationComplete = await AsyncStorage.getItem('migrationComplete');
        const migratedUserId = await AsyncStorage.getItem('migratedUserId');
        return migrationComplete === 'true' && migratedUserId === userId;
    } catch (error) {
        console.error('Error checking migration status:', error);
        return false;
    }
};

/**
 * Sync data from local storage (no cloud)
 */
export const syncFromFirestore = async (userId) => {
    try {
        console.log('ℹ️ Local-only mode - no cloud sync');
        return true;
    } catch (error) {
        console.error('Error syncing:', error);
        return false;
    }
};
