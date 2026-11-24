const YANDEX_API_KEY = process.env.EXPO_PUBLIC_YANDEX_API_KEY;
const YANDEX_PROJECT = process.env.EXPO_PUBLIC_YANDEX_FOLDER_ID; // Odatda bu sizning project ID'ngiz

class YandexAgentService {
    async generateResponse(text, language = 'uz') {
        if (!YANDEX_API_KEY) {
            return "Kechirasiz, Yandex API kaliti (.env) topilmadi.";
        }

        const url = 'https://ai.api.cloud.yandex.net/v1/responses';
        const promptId = 'fvt5cpk30sr4kc7vatet'; // Siz yaratgan 'DIA AI' agentining Prompt ID'si

        try {
            console.log('[YandexAgent] Sending request to agent:', promptId);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    // Yandex OpenAI-compatible API usually accepts Bearer tokens 
                    // or sometimes Api-Key <TOKEN>. If Bearer fails, we can adjust.
                    'Authorization': `Bearer ${YANDEX_API_KEY}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Project': YANDEX_PROJECT
                },
                body: JSON.stringify({
                    prompt: {
                        id: promptId
                    },
                    input: text,
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error('[YandexAgent] Error Response:', errText);
                
                // Fallback attempt with Api-Key prefix instead of Bearer if it's 401
                if (response.status === 401) {
                    console.log('[YandexAgent] Retrying with Api-Key prefix...');
                    const retryResponse = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Api-Key ${YANDEX_API_KEY}`,
                            'Content-Type': 'application/json',
                            'OpenAI-Project': YANDEX_PROJECT
                        },
                        body: JSON.stringify({ prompt: { id: promptId }, input: text })
                    });
                    
                    if (!retryResponse.ok) {
                        const errText2 = await retryResponse.text();
                        console.error('[YandexAgent] Retry Error:', errText2);
                        return "API autentifikatsiyasida xatolik yuz berdi.";
                    }
                    const retryData = await retryResponse.json();
                    return retryData.output_text || retryData?.message?.content || retryData?.choices?.[0]?.message?.content || JSON.stringify(retryData);
                }
                
                return "Agentga ulanishda server xatoligi yuz berdi.";
            }

            const data = await response.json();
            console.log('[YandexAgent] Success response received.');
            
            // Muvaffaqiyatli javobni ajratib olish (SDK response.output_text qaytaradi, API da qanday kelsa shunday o'qiymiz)
            if (data.output_text) {
                return data.output_text;
            }
            if (data.choices && data.choices.length > 0) {
                return data.choices[0].message.content;
            }
            if (data.message && data.message.content) {
                return data.message.content;
            }

            // Agar noma'lum format bo'lsa
            return JSON.stringify(data);
        } catch (error) {
            console.error('[YandexAgent] Fetch error:', error);
            return "Kechirasiz, internetga ulanishda xatolik yuz berdi.";
        }
    }
}

export default new YandexAgentService();
