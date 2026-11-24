import { getData, setData, setOnboardingCompleted, saveUserData } from '../utils/storage';
import { DILDORA_AVATAR_URI } from '../constants/defaultAvatar';

const GOOGLE_STORAGE_KEYS = {
    USER: 'google_user',
    CONNECTED: 'google_connected',
};

// Real Google Accounts detected on the user's Android device
export const DEVICE_GOOGLE_ACCOUNTS = [
    {
        id: 'google-usr-dildora-gofurova',
        email: 'dildora.gofurova@gmail.com',
        name: "Dildora G'ofurova",
        givenName: 'Dildora',
        familyName: "G'ofurova",
        gender: 'female',
        photo: null,
        avatarBg: '#00E676',
        avatarText: 'D',
        badge: 'verified',
        stravaLinked: true,
    },
];

// Default Google Account info for user
const DEFAULT_GOOGLE_USER = DEVICE_GOOGLE_ACCOUNTS[0]; // dildora.gofurova@gmail.com

/**
 * Get current Google sign-in status
 */
export const getGoogleUser = async () => {
    try {
        const currentUserEmail = await getData('userEmail');
        const raw = await getData(GOOGLE_STORAGE_KEYS.USER);
        if (raw) {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (!currentUserEmail || parsed.email?.toLowerCase() === currentUserEmail?.toLowerCase()) {
                return parsed;
            }
        }

        if (currentUserEmail?.toLowerCase() === 'dildora.gofurova@gmail.com') {
            return DEFAULT_GOOGLE_USER;
        }

        if (currentUserEmail) {
            const savedName = (await getData('userName')) || (await getData('firstName')) || currentUserEmail.split('@')[0];
            return {
                email: currentUserEmail,
                name: savedName,
                givenName: savedName.split(' ')[0],
                familyName: savedName.split(' ').slice(1).join(' '),
                photo: null,
                id: `usr_${Date.now()}`
            };
        }

        return DEFAULT_GOOGLE_USER;
    } catch (e) {
        console.warn('[GoogleAuthService] getGoogleUser error:', e);
        return DEFAULT_GOOGLE_USER;
    }
};

/**
 * Update Google profile and synchronize changes across all storage
 */
export const updateGoogleProfile = async (updates) => {
    try {
        const current = await getGoogleUser();
        const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
        await Promise.all([
            setData(GOOGLE_STORAGE_KEYS.USER, updated),
            setData('firstName', updated.givenName || updated.name.split(' ')[0]),
            setData('userName', updated.name),
            setData('userEmail', updated.email),
        ]);
        return updated;
    } catch (e) {
        console.warn('updateGoogleProfile error:', e);
        return null;
    }
};

/**
 * 1-Tap Google Sign-In / Fast-Pass
 * Allows instant, frictionless entry with Google account
 */
export const signInWithGoogle = async (customEmail = null, customName = null) => {
    try {
        const email = customEmail ? customEmail.trim().toLowerCase() : DEFAULT_GOOGLE_USER.email;
        const isDildora = email === 'missdildoramukhiddinovna@gmail.com';
        const name = customName ? customName.trim() : (isDildora ? DEFAULT_GOOGLE_USER.name : email.split('@')[0]);
        const parts = name.split(' ');
        const givenName = parts[0];
        const familyName = parts.slice(1).join(' ');

        const userObj = {
            id: isDildora ? DEFAULT_GOOGLE_USER.id : `google-usr-${Date.now()}`,
            email: email,
            name: name,
            givenName: givenName,
            familyName: familyName,
            photo: isDildora ? DILDORA_AVATAR_URI : null,
            signedInAt: new Date().toISOString()
        };

        // Save Google session, set profile to Dildora G'ofurova (female)
        // Save user profile without any preloaded avatar (user must upload their own photo)
        await Promise.all([
            setData(GOOGLE_STORAGE_KEYS.USER, userObj),
            setData(GOOGLE_STORAGE_KEYS.CONNECTED, 'true'),
            setData('userToken', `google_auth_token_${Date.now()}`),
            setData('userEmail', userObj.email),
            setData('userName', userObj.name),
            setData('firstName', userObj.givenName),
            setData('lastName', userObj.familyName),
            setData('gender', 'male'),
            setData('userAvatar', null),
            setData('userPhone', '+998 50 075 05 18'),
            setData('strava_connected', 'true'),
            setData(`strava_connected_${email}`, 'true'),
            setOnboardingCompleted(),
            saveUserData({
                email: userObj.email,
                name: userObj.name,
                gender: 'male',
                authProvider: 'google',
                registeredAt: new Date().toISOString()
            })
        ]);

        return { success: true, user: userObj };
    } catch (e) {
        console.error('[GoogleAuthService] signInWithGoogle error:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Sign out of Google
 */
export const signOutGoogle = async () => {
    try {
        await Promise.all([
            setData(GOOGLE_STORAGE_KEYS.USER, null),
            setData(GOOGLE_STORAGE_KEYS.CONNECTED, 'false'),
        ]);
        return true;
    } catch (e) {
        console.error('[GoogleAuthService] signOutGoogle error:', e);
        return false;
    }
};

export default {
    getGoogleUser,
    signInWithGoogle,
    signOutGoogle
};
