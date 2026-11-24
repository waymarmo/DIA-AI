import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase JS SDK v11 — React Native / Expo uchun
 * ─────────────────────────────────────────────────
 * .env fayliga quyidagilarni qo'shing:
 *
 *   EXPO_PUBLIC_FIREBASE_API_KEY=...
 *   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
 *   EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
 *   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
 *   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
 *   EXPO_PUBLIC_FIREBASE_APP_ID=...
 *
 * Firebase Console → Project Settings → Your apps → </> (Web) dan oling.
 *
 * NOTE: persistentLocalCache / persistentMultipleTabManager web-only —
 *       React Native da AsyncStorage orqali offline kesh amalga oshiriladi.
 */

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Barcha zaruriy kalitlar to'ldirilganligini tekshir
const isConfigured = Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId &&
    firebaseConfig.apiKey !== 'undefined' &&
    firebaseConfig.projectId !== 'undefined' &&
    !String(firebaseConfig.apiKey).startsWith('your_')
);

let app = null;
let db = null;

if (isConfigured) {
    try {
        app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        db = getFirestore(app);
        console.log('✅ Firebase Firestore initialized');
    } catch (err) {
        console.warn('⚠️ Firebase initialization failed:', err.message);
    }
} else {
    console.warn('⚠️ Firebase kalitlari topilmadi — local-only rejim faol.');
}

export { db };
export const isFirebaseReady = Boolean(db);
export default app;
