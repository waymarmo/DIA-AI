import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    Animated, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../context/ThemeContext';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { useTranslation } from 'react-i18next';
import { getData, setData, setOnboardingCompleted } from '../utils/storage';
import { sendSmsOtp, verifySmsOtp, formatUzbekPhoneNumber } from '../services/SmsAuthService';

const SMS_CODE_LENGTH = 6;

const SmsVerificationScreen = ({ navigation, route }) => {
    const { colors, isDark } = useTheme();
    const { i18n } = useTranslation();
    const isRu = i18n?.language === 'ru';
    const isEn = i18n?.language === 'en';
    const GREEN = colors.primary || '#00E676';

    const params = route.params || {};
    const phone = params.phone || '+998 90 123 45 67';
    const formattedPhone = formatUzbekPhoneNumber(phone);

    const [code, setCode] = useState('');
    const codeRef = useRef('');
    const [error, setError] = useState('');
    const [resendCountdown, setResendCountdown] = useState(59);
    const [canResend, setCanResend] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const inputRef = useRef(null);

    const applyAutoFillCode = useCallback((incomingCode) => {
        if (!incomingCode) return;
        const cleaned = String(incomingCode).replace(/[^0-9]/g, '').slice(0, SMS_CODE_LENGTH);
        if (cleaned.length === SMS_CODE_LENGTH) {
            setCode(cleaned);
            codeRef.current = cleaned;
            setError('');
            // 6 xonali kod to'ldirilganda avtomatik tasdiqlash
            setTimeout(() => {
                handleVerify(cleaned);
            }, 250);
        }
    }, [phone, params]);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();

        // 1. SMS yuborilganda maydonni avtomatik to'ldirish (yuqorida kod ko'rsatmasdan)
        const initialCode = params.sentCode;
        if (initialCode) {
            const timer = setTimeout(() => {
                applyAutoFillCode(initialCode);
            }, 600);
            return () => clearTimeout(timer);
        } else {
            getData('@last_sms_otp').then(val => {
                if (val) {
                    setTimeout(() => {
                        applyAutoFillCode(val);
                    }, 600);
                }
            });
        }
    }, [applyAutoFillCode]);

    // 2. Haqiqiy SMS kelganda (push notification orqali) avtomatik to'ldirish
    useEffect(() => {
        let sub = null;
        try {
            sub = Notifications.addNotificationReceivedListener(notification => {
                const body = notification?.request?.content?.body || '';
                const match = body.match(/\b\d{6}\b/);
                if (match && match[0]) {
                    applyAutoFillCode(match[0]);
                }
            });
        } catch (e) {
            console.warn('[SmsVerification] Notification listener error:', e);
        }
        return () => {
            if (sub && typeof sub.remove === 'function') sub.remove();
        };
    }, [applyAutoFillCode]);

    // Countdown timer
    useEffect(() => {
        if (resendCountdown <= 0) {
            setCanResend(true);
            return;
        }
        const timer = setTimeout(() => {
            setResendCountdown(prev => prev - 1);
        }, 1000);
        return () => clearTimeout(timer);
    }, [resendCountdown]);

    const handleVerify = async (manualCode) => {
        const targetCode = String(typeof manualCode === 'string' ? manualCode : codeRef.current || code).trim();
        if (targetCode.length < SMS_CODE_LENGTH) {
            setError(
                isEn ? 'Enter 6-digit code' : (isRu ? 'Введите 6-значный код' : '6 xonali kodni kiriting')
            );
            return;
        }

        setVerifying(true);
        setError('');

        try {
            const res = await verifySmsOtp(phone, targetCode);
            if (!res.success) {
                setError(res.error || (isEn ? 'Incorrect code' : (isRu ? 'Неверный код' : "Tasdiqlash kodi noto'g'ri")));
                setVerifying(false);
                return;
            }

            const cleanName = (params.name || '').trim();
            const parts = cleanName.split(' ');
            const firstName = parts[0] || 'Bemor';
            const lastName = parts.slice(1).join(' ');

            // Save verified user session
            await Promise.all([
                setData('userPhone', phone),
                setData('firstName', firstName),
                setData('lastName', lastName),
                setData('fullName', cleanName || firstName),
                setData('userName', cleanName || firstName),
                setData('userPassword', params.password || '123456'),
                setData('userToken', `sms_auth_token_${Date.now()}`),
                setData(`user_account_${phone}`, {
                    phone,
                    name: cleanName || firstName,
                    password: params.password || '123456',
                    createdAt: new Date().toISOString()
                }),
                setOnboardingCompleted()
            ]);

            navigation.reset({
                index: 0,
                routes: [{ name: 'DiseaseNavigatorIntro' }],
            });
        } catch (err) {
            console.warn('[SmsVerification] OTP error:', err?.message);
            setError(isEn ? 'Verification error' : (isRu ? 'Ошибка проверки' : "Tasdiqlashda xatolik yuz berdi"));
        } finally {
            setVerifying(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;
        setCanResend(false);
        setCode('');
        codeRef.current = '';
        setError('');
        setResendCountdown(59);

        try {
            const res = await sendSmsOtp(phone, params.name);
            if (res && res.code) {
                // Yangi SMS kelganda maydonni avtomatik to'ldirish
                setTimeout(() => {
                    applyAutoFillCode(res.code);
                }, 600);
            }
        } catch (e) {
            console.warn('Resend error:', e);
            setError(isEn ? 'Failed to resend' : (isRu ? 'Ошибка повторной отправки' : "Kodni qayta yuborishda xatolik"));
        }
    };

    const handleCodeChange = (text) => {
        const cleaned = text.replace(/[^0-9]/g, '');
        if (cleaned.length <= SMS_CODE_LENGTH) {
            setCode(cleaned);
            codeRef.current = cleaned;
            setError('');
            if (cleaned.length === SMS_CODE_LENGTH) {
                // Avtomatik to'g'ri qiymat bilan tekshirish (stale closure'siz)
                setTimeout(() => {
                    handleVerify(cleaned);
                }, 100);
            }
        }
    };

    const digits = Array(SMS_CODE_LENGTH).fill(0).map((_, i) => code[i] || '');

    return (
        <LinearGradient
            colors={isDark ? [colors.background, '#0a1f14'] : ['#f0fdf4', '#dcfce7']}
            style={styles.container}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <Animated.View
                        style={[
                            styles.content,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            }
                        ]}
                    >
                        {/* Icon */}
                        <View style={[styles.iconContainer, { backgroundColor: `${GREEN}20` }]}>
                            <Ionicons name="chatbubble-ellipses-outline" size={48} color={GREEN} />
                        </View>

                        {/* Title */}
                        <Text style={[styles.title, { color: colors.text }]}>
                            {isEn ? 'SMS Verification' : (isRu ? 'SMS Подтверждение' : 'SMS Tasdiqlash')}
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            {isEn
                                ? `A 6-digit confirmation code has been sent to`
                                : (isRu
                                    ? `6-значный код подтверждения отправлен на номер`
                                    : '6 xonali tasdiqlash kodi quyidagi raqamga yuborildi')}
                        </Text>
                        <Text style={[styles.phoneNumber, { color: GREEN }]}>{formattedPhone}</Text>

                        {/* Error */}
                        {Boolean(error) && (
                            <View style={styles.errorBox}>
                                <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}

                        {/* OTP Boxes (SMS kelganda avtomatik to'ldiriladi) */}
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={() => inputRef.current?.focus()}
                            style={styles.boxesContainer}
                        >
                            {digits.map((digit, index) => {
                                const isCurrent = index === code.length;
                                const isFilled = Boolean(digit);
                                return (
                                    <View
                                        key={index}
                                        style={[
                                            styles.box,
                                            {
                                                backgroundColor: colors.card,
                                                borderColor: isCurrent
                                                    ? GREEN
                                                    : isFilled
                                                        ? `${GREEN}80`
                                                        : isDark
                                                            ? 'rgba(255,255,255,0.1)'
                                                            : 'rgba(0,0,0,0.1)',
                                                borderWidth: isCurrent ? 2 : 1.5,
                                            }
                                        ]}
                                    >
                                        <Text style={[styles.boxText, { color: colors.text }]}>
                                            {digit}
                                        </Text>
                                    </View>
                                );
                            })}
                        </TouchableOpacity>

                        {/* Hidden Input */}
                        <TextInput
                            ref={inputRef}
                            value={code}
                            onChangeText={handleCodeChange}
                            keyboardType="number-pad"
                            maxLength={SMS_CODE_LENGTH}
                            style={styles.hiddenInput}
                            autoFocus
                        />

                        {/* Verify Button */}
                        <TouchableOpacity
                            style={[
                                styles.verifyBtn,
                                {
                                    backgroundColor: code.length === SMS_CODE_LENGTH ? GREEN : isDark ? '#1a3a28' : '#bbf7d0',
                                }
                            ]}
                            onPress={handleVerify}
                            disabled={verifying || code.length < SMS_CODE_LENGTH}
                            activeOpacity={0.85}
                        >
                            {verifying ? (
                                <ActivityIndicator size="small" color="#000" />
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={[
                                        styles.verifyText,
                                        { color: code.length === SMS_CODE_LENGTH ? '#000' : colors.textSecondary }
                                    ]}>
                                        {isEn ? 'Verify & Continue' : (isRu ? 'Подтвердить' : 'Tasdiqlash')}
                                    </Text>
                                    <Ionicons
                                        name="checkmark-circle"
                                        size={20}
                                        color={code.length === SMS_CODE_LENGTH ? '#000' : colors.textSecondary}
                                    />
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Resend */}
                        <View style={styles.resendContainer}>
                            <Text style={[styles.resendLabel, { color: colors.textSecondary }]}>
                                {isEn ? "Didn't receive the code?" : (isRu ? 'Не получили код?' : 'Kodni olmadingizmi?')}
                            </Text>
                            {canResend ? (
                                <TouchableOpacity onPress={handleResend}>
                                    <Text style={[styles.resendBtn, { color: GREEN }]}>
                                        {isEn ? ' Resend SMS' : (isRu ? ' Отправить снова' : ' Qayta yuborish')}
                                    </Text>
                                </TouchableOpacity>
                            ) : (
                                <Text style={[styles.countdown, { color: colors.textSecondary }]}>
                                    {` (${resendCountdown}s)`}
                                </Text>
                            )}
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: SPACING.xl,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    backBtn: {
        padding: 8,
        borderRadius: RADIUS.round,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingTop: SPACING.lg,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    title: {
        fontFamily: FONTS.bold,
        fontSize: 26,
        textAlign: 'center',
        marginBottom: SPACING.xs,
    },
    subtitle: {
        fontFamily: FONTS.regular,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    phoneNumber: {
        fontFamily: FONTS.bold,
        fontSize: 16,
        marginTop: 4,
        marginBottom: SPACING.lg,
        letterSpacing: 1,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEE2E2',
        borderWidth: 1,
        borderColor: '#EF4444',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: RADIUS.md,
        marginBottom: 16,
        width: '100%',
    },
    errorText: {
        color: '#B91C1C',
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    boxesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: SPACING.xl,
        gap: 8,
    },
    box: {
        flex: 1,
        height: 56,
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    boxText: {
        fontFamily: FONTS.bold,
        fontSize: 22,
    },
    hiddenInput: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
    },
    verifyBtn: {
        width: '100%',
        height: 52,
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
        elevation: 3,
        shadowColor: '#00E676',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    verifyText: {
        fontFamily: FONTS.bold,
        fontSize: 16,
    },
    resendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    smsHintBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(0, 230, 118, 0.25)',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: RADIUS.md,
        marginBottom: 16,
        gap: 6,
    },
    smsHintText: {
        fontSize: 13,
        fontWeight: '500',
    },
    resendLabel: {
        fontFamily: FONTS.regular,
        fontSize: 14,
    },
    resendBtn: {
        fontFamily: FONTS.bold,
        fontSize: 14,
    },
    countdown: {
        fontFamily: FONTS.medium,
        fontSize: 14,
    },
});

export default SmsVerificationScreen;
