/**
 * TextUP SMS Gateway Service (DIA AI Mobile)
 * O'zbekiston TextUP rasmiy SMS provayderi integratsiyasi.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const TEXTUP_AUTH_URL = 'https://api-auth.textup.uz/v1/login';
const TEXTUP_SEND_URL = 'https://sms-api.textup.uz/v1/send';

const TEXTUP_EMAIL = process.env.EXPO_PUBLIC_TEXTUP_EMAIL || '';
const TEXTUP_PASSWORD = process.env.EXPO_PUBLIC_TEXTUP_PASSWORD || '';
const TEXTUP_USER_ID = process.env.EXPO_PUBLIC_TEXTUP_USER_ID || '8c51566b-4b54-4024-b495-22da2f6d22ff';
const TEXTUP_TEMPLATE_ID = process.env.EXPO_PUBLIC_TEXTUP_TEMPLATE_ID || '0adc9a32-d390-4315-b92e-f008e19674b5';

const TOKEN_KEY = '@textup_access_token';

class TextUpSmsService {
    /**
     * TextUP JWT tokenini oladi yoki yangilaydi
     */
    static async getAccessToken(forceRefresh = false) {
        try {
            if (!forceRefresh) {
                const cached = await AsyncStorage.getItem(TOKEN_KEY);
                if (cached) return cached;
            }

            const response = await fetch(TEXTUP_AUTH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: TEXTUP_EMAIL,
                    password: TEXTUP_PASSWORD,
                }),
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error('[TextUP] Login xatosi:', response.status, errText);
                return null;
            }

            const data = await response.json();
            const token = data.accessToken;
            if (token) {
                await AsyncStorage.setItem(TOKEN_KEY, token);
                return token;
            }
            return null;
        } catch (e) {
            console.error('[TextUP] getAccessToken ulanish xatosi:', e?.message);
            return null;
        }
    }

    /**
     * Foydalanuvchi telefoniga tasdiqlangan 'DIA AI' shabloni bo'yicha haqiqiy SMS yuborish
     * Shablon: 'DIA AI ilovasida telefon raqamini tasdiqlash kodi: {CODE}'
     */
    static async sendOtpSms(phone, code) {
        // Telefon raqamni tozalash (+998XXXXXXXXX)
        let cleaned = String(phone).replace(/\D/g, '');
        if (!cleaned.startsWith('998')) {
            cleaned = `998${cleaned}`;
        }
        const fullPhone = `+${cleaned.slice(0, 12)}`;

        const messageText = `DIA AI ilovasida telefon raqamini tasdiqlash kodi: ${code}`;

        const payload = {
            message: messageText,
            userId: TEXTUP_USER_ID,
            templateId: TEXTUP_TEMPLATE_ID,
            name: 'DIA AI OTP',
            recipients: [fullPhone],
        };

        const trySend = async (token) => {
            const resp = await fetch(TEXTUP_SEND_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            return resp;
        };

        try {
            let token = await this.getAccessToken();
            if (!token) {
                return { success: false, error: "TextUP serveriga ulanib bo'lmadi" };
            }

            let resp = await trySend(token);

            // Agar token muddati o'tgan bo'lsa (401), qayta login qilib urinish
            if (resp.status === 401) {
                console.log('[TextUP] Token muddati o\'tgan, yangilanmoqda...');
                token = await this.getAccessToken(true);
                if (token) {
                    resp = await trySend(token);
                }
            }

            if (resp.ok) {
                const data = await resp.json();
                console.log('✅ [TextUP] SMS muvaffaqiyatli yuborildi:', data);
                return { success: true, smsId: data.smsId || data.id };
            } else {
                const errText = await resp.text();
                console.warn('[TextUP] SMS yuborish rad etildi:', resp.status, errText);

                if (resp.status === 400 && errText.toLowerCase().includes('insufficient')) {
                    return {
                        success: false,
                        insufficientFunds: true,
                        error: "TextUP balansingiz 0 so'm. Haqiqiy SMS yuborish uchun TextUP hisobingizni to'ldiring.",
                    };
                }
                return { success: false, error: errText };
            }
        } catch (e) {
            console.error('[TextUP] sendOtpSms xatolik:', e?.message);
            return { success: false, error: e?.message };
        }
    }
}

export default TextUpSmsService;
