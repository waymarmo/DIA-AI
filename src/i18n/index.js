import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uz from './translations/uz.json';
import ru from './translations/ru.json';
import en from './translations/en.json';

const LANGUAGE_KEY = '@selectedLanguage';

const languageDetector = {
    type: 'languageDetector',
    async: true,
    detect: async (callback) => {
        try {
            const language = await AsyncStorage.getItem(LANGUAGE_KEY);
            callback(language || 'uz');
        } catch (error) {
            callback('uz');
        }
    },
    init: () => { },
    cacheUserLanguage: async (language) => {
        try {
            await AsyncStorage.setItem(LANGUAGE_KEY, language);
        } catch (error) {
            console.error('Error saving language:', error);
        }
    },
};

i18n
    .use(languageDetector)
    .use(initReactI18next)
    .init({
        compatibilityJSON: 'v3',
        resources: {
            uz: { translation: uz },
            ru: { translation: ru },
            en: { translation: en },
        },
        fallbackLng: 'uz',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
