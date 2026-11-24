import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
    USER_DATA: '@user_data',
    ONBOARDING_COMPLETED: '@onboarding_completed',
    MEALS: '@meals',
    SETTINGS: '@settings',
    LANGUAGE: '@selectedLanguage',
};

// Safe JSON parser to prevent startup crashes when storage gets corrupted
const safeJsonParse = (str, fallback) => {
    try {
        return JSON.parse(str);
    } catch (e) {
        console.warn('JSON parsing error in AsyncStorage fallback triggered:', e);
        return fallback;
    }
};

// User Data
export const saveUserData = async (userData) => {
    try {
        await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(userData));
        return true;
    } catch (error) {
        console.error('Error saving user data:', error);
        return false;
    }
};

// Custom Recipes
export const saveCustomRecipe = async (recipe) => {
    try {
        const storedRecipes = await getCustomRecipes();
        const newRecipe = {
            ...recipe,
            id: recipe.id || `recipe-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            isCustom: true,
            timestamp: new Date().toISOString()
        };
        const updatedRecipes = [...storedRecipes, newRecipe];
        await AsyncStorage.setItem('@custom_recipes', JSON.stringify(updatedRecipes));
        return true;
    } catch (error) {
        console.error('Error saving custom recipe:', error);
        return false;
    }
};

export const getCustomRecipes = async () => {
    try {
        const data = await AsyncStorage.getItem('@custom_recipes');
        return data ? safeJsonParse(data, []) : [];
    } catch (error) {
        console.error('Error getting custom recipes:', error);
        return [];
    }
};

export const getUserData = async () => {
    try {
        const data = await AsyncStorage.getItem(KEYS.USER_DATA);
        return data ? safeJsonParse(data, null) : null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
};

// Onboarding
export const setOnboardingCompleted = async () => {
    try {
        await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETED, 'true');
        return true;
    } catch (error) {
        console.error('Error setting onboarding:', error);
        return false;
    }
};

export const isOnboardingCompleted = async () => {
    try {
        const value = await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETED);
        return value === 'true';
    } catch (error) {
        console.error('Error checking onboarding:', error);
        return false;
    }
};

export const saveMeal = async (meal) => {
    try {
        const meals = await getMeals() || [];
        const mealId = meal.id || `meal-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const updatedMeals = [
            ...meals,
            {
                ...meal,
                id: mealId,
                timestamp: meal.timestamp || new Date().toISOString(),
            }
        ];
        await AsyncStorage.setItem(KEYS.MEALS, JSON.stringify(updatedMeals));
        return true;
    } catch (error) {
        console.error('Error saving meal:', error);
        return false;
    }
};

export const getMeals = async () => {
    try {
        const data = await AsyncStorage.getItem(KEYS.MEALS);
        return data ? safeJsonParse(data, []) : [];
    } catch (error) {
        console.error('Error getting meals:', error);
        return [];
    }
};

export const markMealAsCompleted = async (mealId) => {
    try {
        const data = await AsyncStorage.getItem(KEYS.MEALS);
        const meals = data ? safeJsonParse(data, []) : [];
        const updatedMeals = (meals || []).map(m => 
            m.id === mealId ? { ...m, completed: true } : m
        );
        await AsyncStorage.setItem(KEYS.MEALS, JSON.stringify(updatedMeals));
        return true;
    } catch (error) {
        console.error('Error marking meal as completed:', error);
        return false;
    }
};

// Settings
export const saveSettings = async (settings) => {
    try {
        await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
        return true;
    } catch (error) {
        console.error('Error saving settings:', error);
        return false;
    }
};

export const getSettings = async () => {
    try {
        const data = await AsyncStorage.getItem(KEYS.SETTINGS);
        return data ? safeJsonParse(data, {
            notifications: true,
            language: 'uz',
            theme: 'dark',
        }) : {
            notifications: true,
            language: 'uz',
            theme: 'dark',
        };
    } catch (error) {
        console.error('Error getting settings:', error);
        return {
            notifications: true,
            language: 'uz',
            theme: 'dark',
        };
    }
};

// Language
export const saveLanguage = async (language) => {
    try {
        await AsyncStorage.setItem(KEYS.LANGUAGE, language);
        return true;
    } catch (error) {
        console.error('Error saving language:', error);
        return false;
    }
};

// --- Disease History / Archiving Logic ---
export const getDiseaseHistory = async () => {
    try {
        const data = await AsyncStorage.getItem('@disease_history');
        return data ? safeJsonParse(data, []) : [];
    } catch (e) {
        return [];
    }
};

export const archiveCurrentDisease = async (endDate = new Date().toISOString()) => {
    try {
        const primaryDisease = await getData('primaryDisease');
        if (!primaryDisease) return false;

        const meals = await getMeals() || [];
        const aiSchedule = await getData('ai_custom_schedule') || [];
        const history = await getDiseaseHistory();

        const archiveRecord = {
            id: `hist-${Date.now()}`,
            disease: primaryDisease,
            endDate,
            meals,
            aiSchedule,
        };

        history.push(archiveRecord);
        await AsyncStorage.setItem('@disease_history', JSON.stringify(history));

        // Clear current active data to start fresh for the new disease
        await setData('meals', []);
        await setData('ai_custom_schedule', []);
        await setData('ai_critical_alert', null);

        return true;
    } catch (error) {
        console.error('Error archiving disease:', error);
        return false;
    }
};

export const getLanguage = async () => {
    try {
        const language = await AsyncStorage.getItem(KEYS.LANGUAGE);
        return language || 'uz';
    } catch (error) {
        console.error('Error getting language:', error);
        return 'uz';
    }
};

// Export aliases for backward compatibility
export const markOnboardingComplete = setOnboardingCompleted;
export const checkOnboardingComplete = isOnboardingCompleted;

// Generic getData function (for ProfileScreen compatibility)
export const getData = async (key) => {
    try {
        const cleanKey = key.startsWith('@') ? key : `@${key}`;
        const value = await AsyncStorage.getItem(cleanKey);
        if (value === 'null' || value === 'undefined' || value === null) return null;
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    } catch (error) {
        console.error(`Error getting ${key}:`, error);
        return null;
    }
};

// Generic setData function
export const setData = async (key, value) => {
    try {
        const cleanKey = key.startsWith('@') ? key : `@${key}`;
        if (value === null || value === undefined) {
            await AsyncStorage.removeItem(cleanKey);
            return true;
        }
        await AsyncStorage.setItem(cleanKey, typeof value === 'string' ? value : JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Error setting ${key}:`, error);
        return false;
    }
};

// Alias for setData (used by HeightInputScreen, AgeInputScreen, ActivityLevelScreen)
export const saveData = setData;

// Clear all data
export const clearAllData = async () => {
    try {
        await AsyncStorage.clear();
        return true;
    } catch (error) {
        console.error('Error clearing data:', error);
        return false;
    }
};

// Sessiyadan xavfsiz chiqish (Autofill va foydalanuvchi qulayligi uchun telefon, ism va til saqlanib qoladi)
export const logoutUser = async () => {
    try {
        const sessionKeys = [
            KEYS.USER_DATA,
            KEYS.ONBOARDING_COMPLETED,
            '@user',
            '@session',
            '@user_backup',
            '@userToken'
        ];
        await AsyncStorage.multiRemove(sessionKeys);
        return true;
    } catch (error) {
        console.error('Error logging out user:', error);
        return false;
    }
};

// Alias for clearAll
export const clearAll = clearAllData;

// ─── Shaxsiy Dorilar Kabineti (User Medications CRUD) ──────────────────────────
const DEFAULT_USER_MEDICATIONS = [
    {
        id: 'med-default-1',
        name: 'Metformin',
        dosage: '500 mg',
        timeOfDay: 'ertalab_kechqurun',
        timeOfDayLabel: 'Ertalab va kechqurun',
        relationToMeal: 'ovqatdan_keyin',
        relationLabel: 'Ovqatdan keyin',
        notes: 'Shifokor tavsiyasiga ko\'ra, qon shakarini nazorat qilish uchun',
        color: '#4A9EFF',
        createdAt: new Date().toISOString()
    },
    {
        id: 'med-default-2',
        name: 'Glimepirid',
        dosage: '2 mg',
        timeOfDay: 'ertalab',
        timeOfDayLabel: 'Ertalab nonushtada',
        relationToMeal: 'ovqatdan_oldin',
        relationLabel: 'Nonushtadan 15 daqiqa oldin',
        notes: 'Kuniga 1 mahal',
        color: '#00E676',
        createdAt: new Date().toISOString()
    }
];

export const getUserMedications = async () => {
    try {
        const raw = await AsyncStorage.getItem('@user_medications');
        if (!raw) {
            await AsyncStorage.setItem('@user_medications', JSON.stringify(DEFAULT_USER_MEDICATIONS));
            return DEFAULT_USER_MEDICATIONS;
        }
        return safeJsonParse(raw, DEFAULT_USER_MEDICATIONS);
    } catch (e) {
        console.error('Error getting user medications:', e);
        return DEFAULT_USER_MEDICATIONS;
    }
};

export const saveUserMedication = async (medication) => {
    try {
        const meds = await getUserMedications();
        const id = medication.id || `user-med-${Date.now()}`;
        const existingIndex = meds.findIndex(m => m.id === id);
        
        let updated;
        if (existingIndex >= 0) {
            updated = [...meds];
            updated[existingIndex] = { ...meds[existingIndex], ...medication, updatedAt: new Date().toISOString() };
        } else {
            const newMed = {
                ...medication,
                id,
                createdAt: new Date().toISOString()
            };
            updated = [newMed, ...meds];
        }
        await AsyncStorage.setItem('@user_medications', JSON.stringify(updated));
        return true;
    } catch (e) {
        console.error('Error saving user medication:', e);
        return false;
    }
};

export const deleteUserMedication = async (id) => {
    try {
        const meds = await getUserMedications();
        const filtered = meds.filter(m => m.id !== id);
        await AsyncStorage.setItem('@user_medications', JSON.stringify(filtered));
        return true;
    } catch (e) {
        console.error('Error deleting user medication:', e);
        return false;
    }
};

export const getTodayMedicationsStatus = async () => {
    try {
        const todayKey = `@med_taken_${new Date().toISOString().slice(0, 10)}`;
        const raw = await AsyncStorage.getItem(todayKey);
        return raw ? safeJsonParse(raw, {}) : {};
    } catch (e) {
        console.error('Error getting today medications status:', e);
        return {};
    }
};

export const toggleMedicationTakenToday = async (medId) => {
    try {
        const todayKey = `@med_taken_${new Date().toISOString().slice(0, 10)}`;
        const status = await getTodayMedicationsStatus();
        status[medId] = !status[medId];
        await AsyncStorage.setItem(todayKey, JSON.stringify(status));
        return status;
    } catch (e) {
        console.error('Error toggling medication taken status:', e);
        return {};
    }
};
