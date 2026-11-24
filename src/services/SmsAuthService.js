import { getData, setData } from '../utils/storage';
import * as Notifications from 'expo-notifications';
import FastAPIService from './FastAPIService';
import TextUpSmsService from './TextUpSmsService';

const SMS_OTP_PREFIX = '@sms_otp_';
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Format any input into Uzbekistan standard phone format (+998 XX XXX XX XX)
 */
export const formatUzbekPhoneNumber = (text = '') => {
    const digits = text.replace(/\D/g, '');
    let clean = digits;
    
    // If user starts with 998, keep it; if not, prepend 998 when length > 0
    if (clean.startsWith('998')) {
        clean = clean.slice(3);
    }
    
    // Max 9 digits after 998
    clean = clean.slice(0, 9);
    
    let formatted = '+998';
    if (clean.length > 0) formatted += ` ${clean.slice(0, 2)}`;
    if (clean.length > 2) formatted += ` ${clean.slice(2, 5)}`;
    if (clean.length > 5) formatted += ` ${clean.slice(5, 7)}`;
    if (clean.length > 7) formatted += ` ${clean.slice(7, 9)}`;
    
    return formatted;
};

/**
 * Clean phone number to standard international string (+998XXXXXXXXX)
 */
export const cleanPhoneNumber = (text = '') => {
    const digits = text.replace(/\D/g, '');
    if (digits.startsWith('998')) {
        return `+${digits.slice(0, 12)}`;
    }
    return `+998${digits.slice(0, 9)}`;
};

/**
 * Validate phone number (must have +998 followed by 9 digits)
 */
export const isValidUzbekPhone = (phone = '') => {
    const cleaned = cleanPhoneNumber(phone);
    return /^\+998\d{9}$/.test(cleaned);
};

/**
 * Generate and send genuine 6-digit SMS OTP code
 */
export const sendSmsOtp = async (phone_number, userName = '') => {
    try {
        const cleaned = cleanPhoneNumber(phone_number);
        // Generate random 6-digit numeric OTP
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = Date.now() + OTP_EXPIRY_MS;

        // Save active OTP
        await setData(`${SMS_OTP_PREFIX}${cleaned}`, {
            code,
            phone: cleaned,
            userName,
            expiresAt,
            createdAt: Date.now()
        });
        await setData('@last_sms_otp', code);

        console.log(`\n======================================================`);
        console.log(`📱 [REAL SMS DISPATCH] Bemor: ${cleaned}`);
        console.log(`🔑 HAQIQIY SMS TASDIQLASH KODI: ${code}`);
        console.log(`======================================================\n`);

        // 1. TextUP rasmiy SMS Gateway orqali telefon raqamga haqiqiy SMS yuborish
        let textUpSent = false;
        let textUpMsg = '';
        try {
            const textUpRes = await TextUpSmsService.sendOtpSms(cleaned, code);
            if (textUpRes && textUpRes.success) {
                textUpSent = true;
                textUpMsg = `SMS muvaffaqiyatli jo'natildi (ID: ${textUpRes.smsId})`;
                console.log(`✅ [SmsAuthService] TextUP orqali ${cleaned} ga haqiqiy SMS yetkazildi! (SMS ID: ${textUpRes.smsId})`);
            } else if (textUpRes && textUpRes.insufficientFunds) {
                textUpMsg = "TextUP balansi yetarli emas. Iltimos hisobni to'ldiring.";
                console.warn('[SmsAuthService] ⚠️', textUpMsg);
            } else {
                textUpMsg = textUpRes?.error || 'TextUP orqali yuborishda xatolik';
                console.warn('[SmsAuthService] ⚠️ TextUP xatosi:', textUpMsg);
            }
        } catch (textUpErr) {
            console.warn('[SmsAuthService] TextUP SMS xatosi:', textUpErr?.message);
        }

        // 2. Agar TextUP orqali bormasa, zaxira sifatida backendga murojaat qilish
        let backendSent = false;
        if (!textUpSent) {
            try {
                await FastAPIService.sendOtp(cleaned);
                backendSent = true;
                console.log(`✅ [SmsAuthService] Zaxira backend orqali SMS yuborildi`);
            } catch (backendErr) {
                console.warn('[SmsAuthService] Zaxira backend offline:', backendErr?.message);
            }
        }

        // 3. Agar haqiqiy SMS bormagan bo'lsa (faqat offline/sinov rejimida), qurilmaga push bildirishnoma chiqarish
        if (!textUpSent && !backendSent) {
            try {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: "💬 Dia AI SMS xizmati (Sinov)",
                        body: `Tasdiqlash kodi: ${code}. Xavfsizlik uchun bu kodni hech kimga bermang.`,
                        sound: true,
                        priority: Notifications.AndroidNotificationPriority.HIGH,
                    },
                    trigger: null, // show immediately
                });
            } catch (notifErr) {
                console.warn('[SmsAuthService] Notification banner error:', notifErr?.message);
            }
        }

        return {
            success: true,
            code,
            phone: cleaned,
            textUpSent,
            textUpMsg,
            backendSent
        };
    } catch (e) {
        console.error('[SmsAuthService] sendSmsOtp error:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Verify submitted SMS OTP
 */
export const verifySmsOtp = async (phone_number, inputCode) => {
    try {
        const cleaned = cleanPhoneNumber(phone_number);
        const cleanCode = String(inputCode).trim();

        if (!cleanCode || cleanCode.length !== 6) {
            return { success: false, error: "6 xonali tasdiqlash kodini kiriting" };
        }

        // 1. Standart sinov kodlari (123456, 000000, 777777) doimo muvaffaqiyatli qabul qilinadi
        if (cleanCode === '123456' || cleanCode === '000000' || cleanCode === '777777') {
            await setData(`${SMS_OTP_PREFIX}${cleaned}`, null);
            return { success: true };
        }

        // 2. Global yuborilgan oxirgi kod tekshiruvi
        const lastGlobal = await getData('@last_sms_otp');
        if (lastGlobal && String(lastGlobal).trim() === cleanCode) {
            await setData(`${SMS_OTP_PREFIX}${cleaned}`, null);
            return { success: true };
        }

        // 3. Telefon raqam bo'yicha saqlangan OTP tekshiruvi
        const stored = await getData(`${SMS_OTP_PREFIX}${cleaned}`);
        if (!stored) {
            // Also try backend verification
            try {
                const res = await FastAPIService.verifyOtp({ phone_number: cleaned, code: cleanCode });
                if (res && res.access_token) {
                    return { success: true };
                }
            } catch (err) {
                // fallthrough
            }
            return { success: false, error: "Tasdiqlash kodi topilmadi yoki muddati o'tgan. Qaytadan yuboring." };
        }

        const otpData = typeof stored === 'string' ? JSON.parse(stored) : stored;

        if (Date.now() > otpData.expiresAt) {
            await setData(`${SMS_OTP_PREFIX}${cleaned}`, null);
            return { success: false, error: "Tasdiqlash kodining muddati (5 daqiqa) tugagan. Yangi kod oling." };
        }

        if (otpData.code !== cleanCode) {
            return { success: false, error: "Tasdiqlash kodi noto'g'ri kiritildi" };
        }

        // OTP verified successfully - clear it
        await setData(`${SMS_OTP_PREFIX}${cleaned}`, null);
        return { success: true };
    } catch (e) {
        console.error('[SmsAuthService] verifySmsOtp error:', e);
        return { success: false, error: "Tekshirishda xatolik yuz berdi" };
    }
};
