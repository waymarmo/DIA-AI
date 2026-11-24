import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

const YANDEX_API_KEY = process.env.EXPO_PUBLIC_YANDEX_API_KEY;
const FOLDER_ID = process.env.EXPO_PUBLIC_YANDEX_FOLDER_ID;

class SpeechKitService {
    static sound = null;

    static async speak(text, language = 'uz') {
        if (!text) return;

        // Agar gapirayotgan bo'lsa, to'xtatamiz
        if (this.sound) {
            try { await this.sound.unloadAsync(); } catch (e) {}
            this.sound = null;
        }
        try { Speech.stop(); } catch (e) {}

        if (!YANDEX_API_KEY || !FOLDER_ID) {
            try {
                Speech.speak(text, { language: language === 'ru' ? 'ru-RU' : 'uz-UZ' });
            } catch (e) {
                console.warn('[Speech] Native fallback error:', e);
            }
            return;
        }

        try {
            // Yandex TTS v1 API parametrlar. O'zbekcha yozuvni ham rus TTS o'qiydi (talaffuz bilan).
            // Keyinchalik v3 API ga o'tilsa "Brand Voice" modeli ishlatiladi.
            const voice = language === 'ru' ? 'jane' : 'zahar'; 
            const langParam = 'ru-RU'; // O'zbekcha so'zlarni ham shu parametr orqali o'qita olamiz
            
            const formData = new URLSearchParams();
            formData.append('text', text);
            formData.append('voice', voice);
            formData.append('lang', langParam);
            formData.append('format', 'mp3');
            formData.append('folderId', FOLDER_ID);

            const url = 'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize';

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Api-Key ${YANDEX_API_KEY}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString()
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText);
            }

            // Ovoz faylini o'qish va keshga saqlash
            const arrayBuffer = await response.arrayBuffer();
            const base64 = btoa(
                new Uint8Array(arrayBuffer)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );

            const fileUri = FileSystem.cacheDirectory + 'speech_output.mp3';
            await FileSystem.writeAsStringAsync(fileUri, base64, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // Faylni o'ynatish
            const { sound } = await Audio.Sound.createAsync(
                { uri: fileUri },
                { shouldPlay: true }
            );
            this.sound = sound;

        } catch (e) {
            console.warn('SpeechKit Yandex Error, falling back to native Speech:', e?.message);
            try {
                Speech.speak(text, { language: language === 'ru' ? 'ru-RU' : 'uz-UZ' });
            } catch (err) {}
        }
    }

    static async stop() {
        if (this.sound) {
            try { await this.sound.stopAsync(); } catch (e) {}
            try { await this.sound.unloadAsync(); } catch (e) {}
            this.sound = null;
        }
        try { Speech.stop(); } catch (e) {}
    }
}

export default SpeechKitService;
