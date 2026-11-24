import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { firebaseService } from '../services/firebaseService';

export const AuthContext = createContext();

// Storage keys
const USER_KEY = '@user';
const SESSION_KEY = '@session';
const USER_BACKUP_KEY = '@user_backup';

/**
 * Custom hook to use Auth Context
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

/**
 * Auth Provider Component
 * Robust local authentication with session management, persistence, and recovery
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [initializing, setInitializing] = useState(true);
    const [error, setError] = useState(null);
    const appState = useRef(AppState.currentState);

    // ------ Session Helpers ------

    /**
     * Persist user data with backup for integrity
     */
    const persistUser = useCallback(async (userData) => {
        try {
            const serialized = JSON.stringify(userData);
            await AsyncStorage.setItem(USER_KEY, serialized);

            // Verify write
            const readBack = await AsyncStorage.getItem(USER_KEY);
            if (readBack !== serialized) {
                console.warn('User data write verification failed, retrying...');
                await AsyncStorage.setItem(USER_KEY, serialized);
            }

            // Save backup
            await AsyncStorage.setItem(USER_BACKUP_KEY, serialized);

            // Update session metadata
            await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
                lastActive: new Date().toISOString(),
                userId: userData.uid,
            }));

            return true;
        } catch (err) {
            console.error('persistUser error:', err);
            return false;
        }
    }, []);

    /**
     * Load user from storage with backup recovery
     */
    const loadUserFromStorage = useCallback(async () => {
        try {
            let rawData = await AsyncStorage.getItem(USER_KEY);

            // Try backup if primary is missing or corrupt
            if (!rawData) {
                const backup = await AsyncStorage.getItem(USER_BACKUP_KEY);
                if (backup) {
                    console.log('⚡ Recovered user session from backup');
                    await AsyncStorage.setItem(USER_KEY, backup);
                    rawData = backup;
                }
            }

            if (rawData) {
                try {
                    const userData = JSON.parse(rawData);
                    // Validate basic structure
                    if (userData && userData.uid) {
                        return userData;
                    }
                } catch (parseErr) {
                    console.warn('JSON parsing failed for main user data:', parseErr);
                }
                console.warn('Invalid user data structure, clearing');
                await AsyncStorage.multiRemove([USER_KEY, USER_BACKUP_KEY, SESSION_KEY]);
            }

            return null;
        } catch (err) {
            console.error('loadUserFromStorage error:', err);
            // Attempt backup recovery on parse error
            try {
                const backup = await AsyncStorage.getItem(USER_BACKUP_KEY);
                if (backup) {
                    try {
                        const userData = JSON.parse(backup);
                        if (userData && userData.uid) {
                            await AsyncStorage.setItem(USER_KEY, backup);
                            return userData;
                        }
                    } catch (backupParseErr) {
                        console.warn('JSON parsing failed for backup user data:', backupParseErr);
                    }
                }
            } catch (backupErr) {
                console.error('Backup recovery also failed:', backupErr);
            }
            return null;
        }
    }, []);

    // ------ Initialize on Mount ------
    useEffect(() => {
        const initAuth = async () => {
            try {
                const userData = await loadUserFromStorage();
                if (userData) {
                    setUser(userData);
                    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
                        lastActive: new Date().toISOString(),
                        userId: userData.uid,
                    }));
                    console.log('✅ Session restored for user:', userData.uid);

                    // Firestore da ma'lumot bor-yo'qligini tekshir (background)
                    const { isOnline, firebaseReady } = firebaseService.getStatus();
                    if (firebaseReady && isOnline) {
                        // Lokal ma'lumot yo'q bo'lsa bulutdan tiklash
                        const localProfile = await AsyncStorage.getItem(`@user_profile_${userData.uid}`);
                        if (!localProfile) {
                            console.log('🔄 Firestore dan ma\'lumot tiklanmoqda...');
                            await firebaseService.recoverUserData(userData.uid);
                        } else {
                            // Lokal ma'lumotlarni Firestorega yuklash (birinchi ulashda)
                            const alreadyMigrated = await AsyncStorage.getItem(`@migrated_${userData.uid}`);
                            if (!alreadyMigrated) {
                                firebaseService.migrateLocalDataToFirestore(userData.uid).then(async (ok) => {
                                    if (ok) await AsyncStorage.setItem(`@migrated_${userData.uid}`, '1');
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Auth initialization error:', err);
                setError('Sessiyani yuklashda xatolik');
            } finally {
                setInitializing(false);
                setLoading(false);
            }
        };
        initAuth();
    }, [loadUserFromStorage]);

    // ------ App State Tracking for Session Persistence ------
    useEffect(() => {
        const subscription = AppState.addEventListener('change', async (nextAppState) => {
            if (
                appState.current.match(/active/) &&
                nextAppState.match(/inactive|background/)
            ) {
                // Going to background — persist session timestamp
                if (user) {
                    try {
                        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
                            lastActive: new Date().toISOString(),
                            userId: user.uid,
                        }));
                    } catch (err) {
                        console.warn('Failed to update session on background:', err);
                    }
                }
            }
            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, [user]);

    // ------ Auth Methods ------

    /**
     * Sign in anonymously (local)
     * UID bir marta yaratiladi va saqlanadi — keyingi kirishlarda o'sha UID ishlatiladi
     */
    const signInAnonymously = async () => {
        try {
            setLoading(true);
            setError(null);

            // Mavjud anonim UID ni tekshir — agar bor bo'lsa o'sha ishlatiladi
            let stableUid = await AsyncStorage.getItem('@anon_uid');
            if (!stableUid) {
                stableUid = 'local_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now();
                await AsyncStorage.setItem('@anon_uid', stableUid);
                console.log('🆕 New anonymous UID created:', stableUid);
            } else {
                console.log('♻️ Reusing existing anonymous UID:', stableUid);
            }

            const anonymousUser = {
                uid: stableUid,
                isAnonymous: true,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
            };

            const persisted = await persistUser(anonymousUser);
            if (!persisted) {
                throw new Error('Failed to persist user data');
            }

            setUser(anonymousUser);
            console.log('✅ Local anonymous sign in successful');
            return anonymousUser;
        } catch (err) {
            console.error('Error signing in locally:', err);
            setError('Kirish amalga oshmadi');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Sign in with phone number — deterministik UID (telefon raqamdan)
     * Bir xil raqam = har doim bir xil UID = ma'lumotlar yo'qolmaydi
     */
    const signInWithPhone = async (phoneNumber) => {
        try {
            setLoading(true);
            setError(null);

            // Telefon raqamdan barqaror UID — faqat raqamlar
            const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
            const stableUid = 'phone_' + cleanPhone;

            // Mavjud foydalanuvchi ma'lumotlarini tekshir (createdAt ni saqlash uchun)
            const existingKey = `@user_profile_${stableUid}`;
            let existingProfile = null;
            try {
                const raw = await AsyncStorage.getItem(existingKey);
                if (raw) existingProfile = JSON.parse(raw);
            } catch (_) {}

            const phoneUser = {
                uid: stableUid,
                phoneNumber: phoneNumber,
                isAnonymous: false,
                createdAt: existingProfile?.createdAt || new Date().toISOString(),
                lastLogin: new Date().toISOString(),
            };

            const persisted = await persistUser(phoneUser);
            if (!persisted) {
                throw new Error('Failed to persist user data');
            }

            setUser(phoneUser);
            console.log('✅ Local phone sign in successful, UID:', stableUid);
            return { confirm: async () => phoneUser };
        } catch (err) {
            console.error('Error signing in with phone:', err);
            setError('Telefon raqami orqali kirish amalga oshmadi');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Confirm phone verification code (mock)
     */
    const confirmCode = async (confirmation, code) => {
        try {
            setLoading(true);
            setError(null);
            return confirmation;
        } catch (err) {
            console.error('Error confirming code:', err);
            setError('Kodni tasdiqlash amalga oshmadi');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Sign out — clears all session data
     */
    const signOut = async () => {
        try {
            setLoading(true);
            setError(null);
            await AsyncStorage.multiRemove([USER_KEY, USER_BACKUP_KEY, SESSION_KEY]);
            setUser(null);
            console.log('✅ Signed out successfully');
        } catch (err) {
            console.error('Error signing out:', err);
            setError('Chiqishda xatolik');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Clear any displayed error
     */
    const clearError = useCallback(() => setError(null), []);

    const value = {
        user,
        loading,
        initializing,
        error,
        clearError,
        signInAnonymously,
        signInWithPhone,
        confirmCode,
        signOut,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
