import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { db, isFirebaseReady } from '../config/firebase';
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    collection,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    arrayUnion,
    arrayRemove,
    onSnapshot,
} from 'firebase/firestore';

/**
 * ═══════════════════════════════════════════════════════════════
 *  Dia AI — Firebase Service (Offline-First Architecture)
 * ═══════════════════════════════════════════════════════════════
 *
 *  Strategiya: "Local-first, Cloud-sync"
 *  ┌─────────────────────────────────────────────────────────┐
 *  │  WRITE: AsyncStorage (darhol) → Firestore (async)      │
 *  │  READ:  AsyncStorage (kesh)   → Firestore (fallback)   │
 *  │  OFFLINE: Pending queue → online bo'lganda sinxron     │
 *  └─────────────────────────────────────────────────────────┘
 *
 *  Firebase yo'q bo'lsa → to'liq AsyncStorage rejimda ishlaydi
 */

// ─── Konstantalar ──────────────────────────────────────────────
const PENDING_QUEUE_KEY = '@fs_pending_queue';

// ─── Yordamchi: Firestore xavfsiz operatsiya ──────────────────
const safeFirestore = async (operation) => {
    if (!isFirebaseReady || !db) return null;
    try {
        return await operation();
    } catch (err) {
        console.warn('[Firestore]', err.code || err.message);
        return null;
    }
};

// ─── Pending Queue (offline yozuvlar uchun) ─────────────────────
const pendingQueue = {
    async add(path, data, type = 'set') {
        try {
            const queue = await this.getAll();
            queue.push({ path, data, type, id: `pq_${Date.now()}` });
            await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue));
        } catch (_) {}
    },
    async getAll() {
        try {
            const raw = await AsyncStorage.getItem(PENDING_QUEUE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (_) {
            return [];
        }
    },
    async clear() {
        await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify([]));
    },
    async flush() {
        if (!isFirebaseReady || !db) return;
        const queue = await this.getAll();
        if (!queue || !Array.isArray(queue) || !queue.length) return;

        const failed = [];
        for (const item of queue) {
            try {
                if (!item || !item.path || typeof item.path !== 'string') continue;
                const parts = item.path.split('/');
                const ref = parts.length === 2
                    ? doc(db, parts[0], parts[1])
                    : (parts.length === 4 ? doc(db, parts[0], parts[1], parts[2], parts[3]) : null);

                if (!ref) continue;

                const result = await safeFirestore(() =>
                    item.type === 'delete'
                        ? deleteDoc(ref)
                        : setDoc(ref, { ...(item.data || {}), updatedAt: serverTimestamp() }, { merge: true })
                );
                if (result === null && item.type !== 'delete') failed.push(item);
            } catch (err) {
                console.warn('[PendingQueue] Item sync error:', err?.message);
            }
        }

        await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(failed));
        if (queue.length > failed.length) {
            console.log(`✅ Pending queue: ${queue.length - failed.length} ta yozuv bulutga sinxron qilindi`);
        }
    },
};

// ─── Network Listener ──────────────────────────────────────────
let _isOnline = false;
NetInfo.addEventListener(state => {
    const wasOffline = !_isOnline;
    _isOnline = Boolean(state.isConnected);
    if (wasOffline && _isOnline) {
        console.log('🌐 Internet tiklandi — pending queue tozalanmoqda...');
        pendingQueue.flush().catch(err => {
            console.warn('[PendingQueue] Flush error:', err?.message);
        });
    }
});

// ─── Core Write / Read ─────────────────────────────────────────
/**
 * Lokal saqlash + Firestore async (offline queuega tushiradi)
 */
const write = async (localKey, firestorePath, data) => {
    const payload = { ...data, updatedAt: new Date().toISOString() };

    // 1. AsyncStorage — darhol
    await AsyncStorage.setItem(localKey, JSON.stringify(payload));

    // 2. Firestore — async (internet bo'lsa)
    if (isFirebaseReady) {
        if (_isOnline) {
            const parts = firestorePath.split('/');
            const ref = parts.length === 2
                ? doc(db, parts[0], parts[1])
                : doc(db, parts[0], parts[1], parts[2], parts[3]);

            const ok = await safeFirestore(() =>
                setDoc(ref, { ...payload, updatedAt: serverTimestamp() }, { merge: true })
            );
            if (ok === null) {
                await pendingQueue.add(firestorePath, payload);
            }
        } else {
            await pendingQueue.add(firestorePath, payload);
        }
    }

    return true;
};

/**
 * AsyncStorage → agar null bo'lsa Firestore dan o'qib keshga yozadi
 */
const read = async (localKey, firestorePath) => {
    // 1. Local kesh
    try {
        const cached = await AsyncStorage.getItem(localKey);
        if (cached) return JSON.parse(cached);
    } catch (_) {}

    // 2. Firestore fallback
    if (isFirebaseReady && _isOnline) {
        const parts = firestorePath.split('/');
        const ref = parts.length === 2
            ? doc(db, parts[0], parts[1])
            : doc(db, parts[0], parts[1], parts[2], parts[3]);

        const snap = await safeFirestore(() => getDoc(ref));
        if (snap && snap.exists()) {
            const data = snap.data();
            await AsyncStorage.setItem(localKey, JSON.stringify(data));
            return data;
        }
    }

    return null;
};

// ═══════════════════════════════════════════════════════════════
//  Listener & Polling Manager
// ═══════════════════════════════════════════════════════════════
class ListenerManager {
    constructor() {
        this._listeners = new Map(); // uid → unsubscribe fn
        this._polls = new Map();     // uid → intervalId
    }

    subscribe(uid, callback) {
        if (!isFirebaseReady || !db) return;
        this.unsubscribe(uid);

        const ref = doc(db, 'users', uid);
        const unsub = onSnapshot(ref,
            (snap) => {
                if (snap.exists()) callback(snap.data());
            },
            (err) => console.warn('[Firestore] onSnapshot error:', err.message)
        );
        this._listeners.set(uid, unsub);
    }

    unsubscribe(uid) {
        const unsub = this._listeners.get(uid);
        if (unsub) { unsub(); this._listeners.delete(uid); }

        const interval = this._polls.get(uid);
        if (interval) { clearInterval(interval); this._polls.delete(uid); }
    }

    unsubscribeAll() {
        this._listeners.forEach(unsub => unsub());
        this._listeners.clear();
        this._polls.forEach(id => clearInterval(id));
        this._polls.clear();
    }
}

const listenerManager = new ListenerManager();

// ═══════════════════════════════════════════════════════════════
//  FirebaseService — Public API
// ═══════════════════════════════════════════════════════════════
class FirebaseService {

    // ─── Profil ────────────────────────────────────────────────
    async updateUserProfile(userId, profileData) {
        await write(
            `@user_profile_${userId}`,
            `users/${userId}`,
            profileData
        );
    }

    async getUserProfile(userId) {
        return read(
            `@user_profile_${userId}`,
            `users/${userId}`
        );
    }

    // ─── Sog'liq ko'rsatkichlari ───────────────────────────────
    async updateHealthMetrics(userId, metrics) {
        await write(
            `@health_metrics_${userId}`,
            `users/${userId}/data/health`,
            metrics
        );
    }

    async getHealthMetrics(userId) {
        return read(
            `@health_metrics_${userId}`,
            `users/${userId}/data/health`
        );
    }

    // ─── Ovqat kundaligi ───────────────────────────────────────
    async logDailyMeal(userId, date, mealData) {
        const key = `@meal_${userId}_${date}`;
        const path = `users/${userId}/meals/${date}`;
        await write(key, path, mealData);
    }

    async getDailyMeal(userId, date) {
        return read(
            `@meal_${userId}_${date}`,
            `users/${userId}/meals/${date}`
        );
    }

    async getMealHistory(userId, limit = 30) {
        const localKey = `@meal_history_${userId}`;
        try {
            const cached = await AsyncStorage.getItem(localKey);
            if (cached) return JSON.parse(cached);
        } catch (_) {}

        if (isFirebaseReady && db && _isOnline) {
            const colRef = collection(db, 'users', userId, 'meals');
            const q = query(colRef, orderBy('date', 'desc'));
            const snap = await safeFirestore(() => getDocs(q));
            if (snap) {
                const meals = snap.docs.map(d => ({ date: d.id, ...d.data() }));
                await AsyncStorage.setItem(localKey, JSON.stringify(meals));
                return meals;
            }
        }
        return [];
    }

    // ─── Sevimlilar ────────────────────────────────────────────
    async getFavoriteRecipes(userId) {
        return read(
            `@favorites_${userId}`,
            `users/${userId}/data/favorites`
        );
    }

    async addToFavorites(userId, recipeId) {
        const current = (await this.getFavoriteRecipes(userId)) || { items: [] };
        const updated = { items: [...new Set([...current.items, recipeId])] };
        await write(
            `@favorites_${userId}`,
            `users/${userId}/data/favorites`,
            updated
        );

        // Firestore da atomic arrayUnion
        if (isFirebaseReady && db && _isOnline) {
            await safeFirestore(() =>
                updateDoc(doc(db, 'users', userId, 'data', 'favorites'), {
                    items: arrayUnion(recipeId),
                    updatedAt: serverTimestamp(),
                })
            );
        }
    }

    async removeFromFavorites(userId, recipeId) {
        const current = (await this.getFavoriteRecipes(userId)) || { items: [] };
        const updated = { items: current.items.filter(id => id !== recipeId) };
        await write(
            `@favorites_${userId}`,
            `users/${userId}/data/favorites`,
            updated
        );

        if (isFirebaseReady && db && _isOnline) {
            await safeFirestore(() =>
                updateDoc(doc(db, 'users', userId, 'data', 'favorites'), {
                    items: arrayRemove(recipeId),
                    updatedAt: serverTimestamp(),
                })
            );
        }
    }

    // ─── Maxsus retseptlar ─────────────────────────────────────
    async saveCustomRecipe(userId, recipe) {
        const recipeId = recipe.id || `recipe_${Date.now()}`;
        const finalRecipe = { ...recipe, id: recipeId };

        // Lokal ro'yxat
        const existing = (await this.getCustomRecipes(userId)) || [];
        const updated = [...existing.filter(r => r.id !== recipeId), finalRecipe];
        await AsyncStorage.setItem(`@custom_recipes_${userId}`, JSON.stringify(updated));

        // Firestore
        await write(
            `@custom_recipe_${userId}_${recipeId}`,
            `users/${userId}/recipes/${recipeId}`,
            finalRecipe
        );
        return recipeId;
    }

    async getCustomRecipes(userId) {
        try {
            const cached = await AsyncStorage.getItem(`@custom_recipes_${userId}`);
            if (cached) return JSON.parse(cached);
        } catch (_) {}

        if (isFirebaseReady && db && _isOnline) {
            const colRef = collection(db, 'users', userId, 'recipes');
            const snap = await safeFirestore(() => getDocs(colRef));
            if (snap) {
                const recipes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                await AsyncStorage.setItem(`@custom_recipes_${userId}`, JSON.stringify(recipes));
                return recipes;
            }
        }
        return [];
    }

    async deleteCustomRecipe(userId, recipeId) {
        // Lokal
        const existing = (await this.getCustomRecipes(userId)) || [];
        const updated = existing.filter(r => r.id !== recipeId);
        await AsyncStorage.setItem(`@custom_recipes_${userId}`, JSON.stringify(updated));
        await AsyncStorage.removeItem(`@custom_recipe_${userId}_${recipeId}`);

        // Firestore
        if (isFirebaseReady && db && _isOnline) {
            await safeFirestore(() =>
                deleteDoc(doc(db, 'users', userId, 'recipes', recipeId))
            );
        } else if (isFirebaseReady) {
            await pendingQueue.add(`users/${userId}/recipes/${recipeId}`, {}, 'delete');
        }
    }

    // ─── Sozlamalar ────────────────────────────────────────────
    async saveSettings(userId, settings) {
        await write(
            `@settings_${userId}`,
            `users/${userId}/data/settings`,
            settings
        );
    }

    async getSettings(userId) {
        return read(
            `@settings_${userId}`,
            `users/${userId}/data/settings`
        );
    }

    // ─── Foydalanuvchini bulutdan qaytarish (yangi qurilma) ────
    async recoverUserData(userId) {
        if (!isFirebaseReady || !db || !_isOnline) return null;
        try {
            const userSnap = await safeFirestore(() => getDoc(doc(db, 'users', userId)));
            if (!userSnap || !userSnap.exists()) return null;

            const profile = userSnap.data();
            await AsyncStorage.setItem(`@user_profile_${userId}`, JSON.stringify(profile));

            // Health metrics
            const healthSnap = await safeFirestore(() =>
                getDoc(doc(db, 'users', userId, 'data', 'health'))
            );
            if (healthSnap && healthSnap.exists()) {
                await AsyncStorage.setItem(
                    `@health_metrics_${userId}`,
                    JSON.stringify(healthSnap.data())
                );
            }

            // Settings
            const settingsSnap = await safeFirestore(() =>
                getDoc(doc(db, 'users', userId, 'data', 'settings'))
            );
            if (settingsSnap && settingsSnap.exists()) {
                await AsyncStorage.setItem(
                    `@settings_${userId}`,
                    JSON.stringify(settingsSnap.data())
                );
            }

            console.log('✅ Foydalanuvchi ma\'lumotlari bulutdan tiklandi:', userId);
            return profile;
        } catch (err) {
            console.warn('⚠️ Ma\'lumotlarni tiklashda xato:', err.message);
            return null;
        }
    }

    // ─── Real-time tinglash ────────────────────────────────────
    subscribeToUserData(userId, callback) {
        listenerManager.subscribe(userId, callback);
        // Cleanup funksiyasini qaytaradi
        return () => listenerManager.unsubscribe(userId);
    }

    unsubscribeAll() {
        listenerManager.unsubscribeAll();
    }

    // ─── Lokal ma'lumotlarni Firestorega ko'chirish ──────────
    async migrateLocalDataToFirestore(userId) {
        if (!isFirebaseReady || !_isOnline) {
            console.warn('Migration: Firebase yo\'q yoki offline');
            return false;
        }
        try {
            console.log('🔄 Lokal ma\'lumotlarni Firestorega ko\'chirish boshlandi...');

            const keys = [
                { local: `@user_profile_${userId}`, path: `users/${userId}` },
                { local: `@health_metrics_${userId}`, path: `users/${userId}/data/health` },
                { local: `@settings_${userId}`, path: `users/${userId}/data/settings` },
                { local: `@favorites_${userId}`, path: `users/${userId}/data/favorites` },
            ];

            let migrated = 0;
            for (const { local, path } of keys) {
                const raw = await AsyncStorage.getItem(local);
                if (raw) {
                    const data = JSON.parse(raw);
                    const parts = path.split('/');
                    const ref = parts.length === 2
                        ? doc(db, parts[0], parts[1])
                        : doc(db, parts[0], parts[1], parts[2], parts[3]);
                    await safeFirestore(() =>
                        setDoc(ref, { ...data, migratedAt: serverTimestamp() }, { merge: true })
                    );
                    migrated++;
                }
            }

            // Pending queueni ham yuborish
            await pendingQueue.flush();

            console.log(`✅ Migration: ${migrated} ta ma\'lumot Firestorega ko\'chirildi`);
            return true;
        } catch (err) {
            console.error('❌ Migration failed:', err.message);
            return false;
        }
    }

    // ─── Holat ─────────────────────────────────────────────────
    getStatus() {
        return {
            firebaseReady: isFirebaseReady,
            isOnline: _isOnline,
            mode: isFirebaseReady ? (_isOnline ? 'cloud-sync' : 'offline-cache') : 'local-only',
        };
    }
}

export const firebaseService = new FirebaseService();
export default firebaseService;
