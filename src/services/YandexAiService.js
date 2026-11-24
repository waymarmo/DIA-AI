import icd10Database from '../data/icd10_database.json';

const possibleDiseases = icd10Database.map(d => `${d.icd_code} - ${d.name_uz}`).join(', ');

const YANDEX_API_KEY = process.env.EXPO_PUBLIC_YANDEX_API_KEY;
const FOLDER_ID = process.env.EXPO_PUBLIC_YANDEX_FOLDER_ID;

class YandexAiService {
    static async generateChatResponse(prompt, language = 'uz') {
        if (!YANDEX_API_KEY || !FOLDER_ID) {
            console.error('Yandex API keys are missing in .env!');
            return "Kechirasiz, tizimda vaqtinchalik muammo bor (API kalit topilmadi).";
        }

        const systemPrompt = language === 'ru' 
            ? `Вы профессиональный врач-эндокринолог из Узбекистана. Вы помогаете пациентам. Давайте точные, безопасные и короткие советы. 
Если пациент описывает медицинские симптомы, вы ДОЛЖНЫ добавить в конце своего ответа JSON: {"action": "medical_navigator", "icd_code": "КОД_ИЗ_БАЗЫ"}. Выберите КОД из списка: ${possibleDiseases}.`
            : `Siz qandli diabet va salomatlik bo'yicha O'zbekistonlik professional shifokorsiz.
QAT'IY QOIDA 1: SIZ FAQAT VA FAQAT O'ZBEK TILIDA (LOTIN ALIFBOSIDA) JAVOB BERISHINGIZ SHART! Rus yoki boshqa tilda umuman yozmang.
QAT'IY QOIDA 2: Agar bemor biror xastalik (masalan kamqonlik, og'riq, isitma) haqida yozsa, maslahatingizdan so'ng xabarning ENG OXIRIDA ushbu JSON ni qo'shing (boshqa gaplarsiz):
{"action": "medical_navigator", "icd_code": "KOD"}
Bunda KOD ni ushbu ro'yxatdan oling: ${possibleDiseases}. Agar ro'yxatda yo'q bo'lsa JSON yozmang.`;

        const url = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
        const data = {
            modelUri: `gpt://${FOLDER_ID}/yandexgpt/latest`,
            completionOptions: {
                stream: false,
                temperature: 0.6,
                maxTokens: "2000"
            },
            messages: [
                { role: "system", text: systemPrompt },
                { role: "user", text: prompt }
            ]
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Api-Key ${YANDEX_API_KEY}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (result.error) {
                console.error("Yandex API Error:", result.error);
                throw new Error(result.error.message);
            }

            return result.result.alternatives[0].message.text;
        } catch (error) {
            console.error("YandexAiService generateChatResponse error:", error);
            throw error;
        }
    }

    static async analyzeSymptoms(symptoms) {
        if (!YANDEX_API_KEY || !FOLDER_ID) return null;
        const url = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
        
        const possibleDiseases = icd10Database.map(d => `${d.icd_code} - ${d.name_uz}`).join(', ');
        const prompt = `Foydalanuvchi quyidagi shikoyatlarni yozdi: "${symptoms}".
Iltimos, ushbu ma'lumotlar bazasidagi eng to'g'ri keluvchi kasallikning FAQAT 'icd_code' qismini (masalan, I10 yoki E11) yozing. Hech qanday boshqa so'z qo'shmang. Agar hech qaysisiga to'g'ri kelmasa 'UNKNOWN' deb qaytaring.
Baza:
${possibleDiseases}`;

        const data = {
            modelUri: `gpt://${FOLDER_ID}/yandexgpt/latest`,
            completionOptions: {
                stream: false,
                temperature: 0.1,
                maxTokens: "10"
            },
            messages: [
                { role: "system", text: "Sen faqat kodlarni qaytaradigan aniq tizimsan." },
                { role: "user", text: prompt }
            ]
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Api-Key ${YANDEX_API_KEY}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.error) throw new Error(result.error.message);
            
            const rawCode = result.result.alternatives[0].message.text.trim();
            const found = icd10Database.find(d => rawCode.includes(d.icd_code));
            return found || null;
        } catch (error) {
            console.error("YandexAiService analyzeSymptoms error:", error);
            return null;
        }
    }
}

export default YandexAiService;
