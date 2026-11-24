import * as Speech from 'expo-speech';
import i18n from '../i18n';
import icd10Database from '../data/icd10_database.json';
import { getDiseaseConfig } from '../utils/diseaseConfig';

const possibleDiseases = icd10Database.map(d => `${d.icd_code} - ${d.name_uz}`).join(', ');

// API Key should be stored in .env file (EXPO_PUBLIC_GEMINI_API_KEY)
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

const MODELS = {
    PRO:     'gemini-2.5-pro',
    DEFAULT: 'gemini-2.5-flash',
    LITE:    'gemini-2.5-flash-lite',
};

const MODEL_CANDIDATES = [
    process.env.EXPO_PUBLIC_GEMINI_MODEL,
    MODELS.PRO,
    MODELS.DEFAULT,
    'gemini-2.0-flash',
    MODELS.LITE,
    'gemini-2.0-flash-lite',
    'gemini-flash-latest',
].filter(Boolean);

const MODELS_CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 25000;

if (!GEMINI_API_KEY) {
    console.error('[DiaAI] GEMINI_API_KEY is missing! Check your .env file (EXPO_PUBLIC_GEMINI_API_KEY).');
}

// Retry config
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1500;
const RETRY_JITTER_MS = 1000;

const getSystemPrompt = (language = 'uz', diseaseName = 'Diabet') => {
    const diseaseConf = getDiseaseConfig(diseaseName);
    const diseaseTitle = diseaseConf?.title || diseaseName || 'Surunkali kasalliklar';
    const focus = diseaseConf?.aiContext?.focusArea || "salomatlik, to'g'ri ovqatlanish va jismoniy mashqlar";
    const rules = diseaseConf?.aiContext?.specialRules || "Me'yorni saqlash va shifokor bilan maslahatlashishni eslat.";

    const prompts = {
        uz: `Sen Dia AI / MediNav, bemorlar uchun mehribon va shaxsiy tibbiy AI yordamchisan.
Bemorning hozirgi asosiy tashxisi: ${diseaseTitle}.
Asosiy yo'nalishing: ${focus}.
Maxsus qoidalar: ${rules}.

Vazifang:
1. ${diseaseTitle} kasalligini boshqarishda yordam berish.
2. Ovqatlanish, kasallikka mos jismoniy mashqlar va sog'lom turmush tarzi bo'yicha qisqa, tushunarli maslahat berish.
3. Tashxisga mos retseptlar topish va tavsiya qilish.
4. Ushbu kasallik bo'yicha DORILAR va qabul qoidalari haqida tushuntirish berish (doimo shifokor tavsiyasini eslat).
5. Agar foydalanuvchi salomlashsa yoki kimligini so'rasa, aynan shunday javob ber: "Salom! Men Dia AI yordamchingizman. Qanday yordam bera olaman?". Boshqa murakkab ta'riflar ishlatma.
6. Xabarlarda keraksiz qavslar, markdown belgilari ishlatma.
7. Agar foydalanuvchi "Meni [ekran]ga olib bor" desa, tahlil qiling: {"action": "navigate", "target": "[ekran]"}. Ekranlar: Dashboard, Reports, Recipes, FoodScanner, Settings, Medications, Exercises.
8. Retsept so'rasa: {"action": "save_recipe", "recipe": {"title": "...", "ingredients": ["..."], "instructions": "...", "calories": 100, "sugar": 5, "carbs": 10, "protein": 5, "fat": 2, "time": 20}}.
9. Har doim toza o'zbek tilida, qisqa va londa javob ber. Tibbiy TASHXIS qo'yma, lekin dori va davolash haqida umumiy ma'lumot ber.
10. Agar bemor biror xastalik (masalan kamqonlik, og'riq, isitma) haqida yozsa, maslahatingizdan so'ng xabarning ENG OXIRIDA ushbu JSON ni qo'shing (boshqa gaplarsiz): {"action": "medical_navigator", "icd_code": "KOD"}. Bunda KOD ni ushbu ro'yxatdan oling: ${possibleDiseases}. Agar ro'yxatda yo'q bo'lsa JSON yozmang.`,

        ru: `Вы Dia AI / MediNav, персональный медицинский ИИ-помощник.
Основной диагноз пациента: ${diseaseConf?.titleRu || diseaseTitle}.
Фокус внимания: ${focus}.
Особые правила: ${rules}.

Ваша задача:
1. Помогать в контроле и ведении заболевания (${diseaseTitle}).
2. Советовать по питанию, лечебной гимнастике и образу жизни.
3. Находить полезные рецепты.
4. Давать информацию о профильных ЛЕКАРСТВАХ (всегда напоминая: "Дозировку назначает только врач").
5. Ответы краткие и четкие. Если здороваются, говорите точно: "Здравствуйте! Я ваш помощник Dia AI. Чем могу помочь?".
6. Если просят перейти на экран: {"action": "navigate", "target": "[экран]"}. Экраны: Dashboard, Reports, Recipes, FoodScanner, Settings, Medications, Exercises.
7. Если рецепт: {"action": "save_recipe", "recipe": {"title": "...", "ingredients": ["..."], "instructions": "...", "calories": 100, "sugar": 5, "carbs": 10, "protein": 5, "fat": 2, "time": 20}}.
8. Если пациент описывает медицинские симптомы (анемия, боль, температура), ДОЛЖНЫ добавить в конце ответа JSON: {"action": "medical_navigator", "icd_code": "КОД_ИЗ_БАЗЫ"}. Выберите КОД из списка: ${possibleDiseases}.
Не ставьте диагнозы. Всегда отвечайте на русском языке.`,

        en: `You are Dia AI / MediNav, an empathetic personal medical AI assistant.
Patient's primary condition: ${diseaseTitle}.
Key focus: ${focus}.
Special guidance: ${rules}.

Your task:
1. Help manage ${diseaseTitle}.
2. Advise on tailored nutrition, condition-safe exercises, and lifestyle.
3. Recommend healthy recipes.
4. Provide medication information (always remind: "Consult your doctor for dosage").
5. Keep answers concise. If greeted, reply: "Hello! I am your Dia AI assistant. How can I help you?".
6. If "Take me to [screen]": {"action": "navigate", "target": "[screen]"}. Screens: Dashboard, Reports, Recipes, FoodScanner, Settings, Medications, Exercises.
7. If recipe: {"action": "save_recipe", "recipe": {"title": "...", "ingredients": ["..."], "instructions": "...", "calories": 100, "sugar": 5, "carbs": 10, "protein": 5, "fat": 2, "time": 20}}.
Do not diagnose. Always respond in English.`
    };
    return prompts[language] || prompts.uz;
};


const getErrorMessage = (language = 'uz', isQuotaError = false) => {
    if (isQuotaError) {
        const quotaMessages = {
            uz: "Kechirasiz, bepul AI so'rovlari limiti tugadi. Iltimos, birozdan keyin qayta urinib ko'ring.",
            ru: "Извините, бесплатный лимит запросов к ИИ исчерпан. Пожалуйста, попробуйте позже.",
            en: "Sorry, the free AI request quota has been exceeded. Please try again in a moment."
        };
        return quotaMessages[language] || quotaMessages.uz;
    }
    const messages = {
        uz: 'Kechirasiz, hozirda javob berishda xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.',
        ru: 'Извините, произошла ошибка при ответе. Пожалуйста, попробуйте ещё раз.',
        en: 'Sorry, an error occurred while generating a response. Please try again.'
    };
    return messages[language] || messages.uz;
};

class DiaAIService {
    constructor() {
        this.isSpeaking = false;
        this.modelsCache = [];
        this.modelsCacheAt = 0;
        this.enableLiveModelDiscovery = true;
        this._requestChain = Promise.resolve();
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async _fetchAvailableModels() {
        const now = Date.now();
        if (this.modelsCache.length > 0 && (now - this.modelsCacheAt) < MODELS_CACHE_TTL_MS) {
            return this.modelsCache;
        }
        try {
            if (!this.enableLiveModelDiscovery) return [];
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
            const data = await response.json();
            if (data.error) return [];
            const supported = (data.models || [])
                .filter((model) => (model.supportedGenerationMethods || []).includes('generateContent'))
                .map((model) => (model.name || '').replace(/^models\//, ''))
                .filter(Boolean);
            const prioritized = [
                ...supported.filter((m) => m.includes('flash')),
                ...supported.filter((m) => !m.includes('flash')),
            ];
            this.modelsCache = [...new Set(prioritized)];
            this.modelsCacheAt = now;
            return this.modelsCache;
        } catch (error) {
            return [];
        }
    }

    async _getModelCandidates() {
        const liveModels = await this._fetchAvailableModels();
        const combined = [...MODEL_CANDIDATES, ...liveModels];
        return [...new Set(combined)].filter(Boolean);
    }

    _enqueue(task) {
        const run = () => Promise.resolve().then(task);
        this._requestChain = this._requestChain.then(run, run);
        return this._requestChain;
    }

    async _generateResponseInternal(text, imageBase64 = null, language = 'uz', options = {}) {
        const modelCandidates = await this._getModelCandidates();
        if (modelCandidates.length === 0) return getErrorMessage(language);

        const systemPrompt = getSystemPrompt(language, options.disease);
        const contents = [];

        const audioBase64 = options.audioBase64;
        const audioMimeType = options.audioMimeType || 'audio/mp4';

        if (audioBase64) {
            contents.push({
                parts: [
                    { text: text || (language === 'ru' ? "Ответьте на это голосовое сообщение." : "Ushbu ovozli xabarga javob bering.") },
                    { inline_data: { mime_type: audioMimeType, data: audioBase64 } }
                ]
            });
        } else if (options.pdfBase64) {
            contents.push({
                parts: [
                    { text: text || "Analyze this clinical medical report (PDF)." },
                    { inline_data: { mime_type: "application/pdf", data: options.pdfBase64 } }
                ]
            });
        } else if (imageBase64) {
            contents.push({
                parts: [
                    { text: text || "Analyze this food image." },
                    { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }
                ]
            });
        } else {
            contents.push({ parts: [{ text: text }] });
        }

        const requestBody = {
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: contents,
            generationConfig: {
                temperature: typeof options.temperature === 'number' ? options.temperature : 0.8,
                topK: 64,
                topP: 0.97,
                maxOutputTokens: typeof options.maxOutputTokens === 'number' ? options.maxOutputTokens : (imageBase64 ? 2048 : 1280),
                ...(options.jsonMode ? { response_mime_type: "application/json" } : {}),
            },
        };

        let lastError = null;

        for (const currentModel of modelCandidates) {
            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                try {
                    if (attempt > 0) {
                        const jitter = Math.floor(Math.random() * RETRY_JITTER_MS);
                        await this._delay(BASE_RETRY_DELAY_MS * attempt + jitter);
                    }

                    console.log(`[DiaAI] Attempting ${currentModel} (Attempt ${attempt+1})`);
                    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                    const timeoutId = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
                    
                    let response;
                    try {
                        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${GEMINI_API_KEY}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(requestBody),
                            ...(controller ? { signal: controller.signal } : {}),
                        });
                    } finally {
                        if (timeoutId) clearTimeout(timeoutId);
                    }

                    const result = await response.json();

                    if (result.error) {
                        console.log(`[DiaAI] Gemini API Attempt Error on ${currentModel}: ${result.error.message}`);
                        lastError = new Error(result.error.message);
                        // Switch priority to fallback model on high load errors
                        if (result.error.code === 429 || result.error.code === 503) {
                            console.warn(`[DiaAI] ${currentModel} overloaded. Potential wait or fallback needed.`);
                        }
                        
                        if (result.error.code === 401 || result.error.code === 403) break;
                        if (result.error.code === 404 || result.error.status === 'NOT_FOUND') {
                            this.enableLiveModelDiscovery = true;
                            break;
                        }
                        continue;
                    }

                    if (result.candidates && result.candidates.length > 0) {
                        const aiResponse = result.candidates[0].content?.parts?.[0]?.text;
                        if (aiResponse) {
                            console.log(`[DiaAI] Success: ${aiResponse.length} chars`);
                            return aiResponse;
                        }
                    }

                    if (result.promptFeedback?.blockReason) {
                        console.warn('[DiaAI] Blocked:', result.promptFeedback.blockReason);
                        return i18n.t('chat.blocked', { defaultValue: 'Kechirasiz, bu mavzuda gaplasha olmaymiz.' });
                    }

                    lastError = new Error('No valid response content');
                } catch (error) {
                    lastError = error;
                    console.log(`[DiaAI] Model ${currentModel} attempt failed:`, error.message);
                }
            }
        }

        console.error('[DiaAI] All attempts failed:', lastError?.message);
        const isQuota = lastError?.message && (
            lastError.message.toLowerCase().includes('quota') || 
            lastError.message.toLowerCase().includes('limit') || 
            lastError.message.toLowerCase().includes('rate') || 
            lastError.message.toLowerCase().includes('429')
        );
        return getErrorMessage(language, isQuota);
    }

    async generateResponse(text, imageBase64 = null, language = 'uz', options = {}) {
        return this._enqueue(() => this._generateResponseInternal(text, imageBase64, language, options));
    }

    async speak(text, languageCode = 'uz') {
        if (this.isSpeaking) await Speech.stop();
        let textToSpeak = text;
        try {
            textToSpeak = text.replace(/\{[\s\S]*?\}/g, '').trim();
            textToSpeak = textToSpeak.replace(/[*_#`]/g, '').trim();
        } catch (e) {}
        if (!textToSpeak) return;
        const languageMap = { 'uz': 'uz-UZ', 'ru': 'ru-RU', 'en': 'en-US' };
        const locale = languageMap[languageCode] || 'uz-UZ';
        this.isSpeaking = true;
        Speech.speak(textToSpeak, {
            language: locale,
            pitch: 1.0,
            rate: 0.9,
            onDone: () => { this.isSpeaking = false; },
            onStopped: () => { this.isSpeaking = false; },
            onError: () => { this.isSpeaking = false; }
        });
    }

    async stopSpeaking() {
        await Speech.stop();
        this.isSpeaking = false;
    }
}

export default new DiaAIService();
