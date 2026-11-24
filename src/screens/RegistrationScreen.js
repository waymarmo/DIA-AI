import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { getData } from '../utils/storage';
import { formatUzbekPhoneNumber, cleanPhoneNumber, isValidUzbekPhone, sendSmsOtp } from '../services/SmsAuthService';

const RegistrationScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const isRu = i18n?.language === 'ru';
  const isEn = i18n?.language === 'en';
  const GREEN = colors.primary || '#00E676';

  const [userDisplayName, setUserDisplayName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Ism avvalgi NameInputScreen dan avtomatik olinadi (2 marta so'ralmaydi)
  useEffect(() => {
    (async () => {
      const first = await getData('firstName');
      const last = await getData('lastName');
      const savedUser = await getData('userName');
      const combined = (first ? `${first} ${last || ''}`.trim() : savedUser) || '';
      setUserDisplayName(combined);
    })();
    setPhone('+998 ');
    setPassword('');
  }, []);

  const handlePhoneChange = (text) => {
    setError('');
    const formatted = formatUzbekPhoneNumber(text);
    setPhone(formatted);
  };

  // SMS orqali ro'yxatdan o'tish
  const handleCreateAccount = async () => {
    setError('');
    const cleanPhone = cleanPhoneNumber(phone);
    const cleanName = (userDisplayName || (await getData('userName')) || (await getData('firstName')) || 'Foydalanuvchi').trim();

    if (!isValidUzbekPhone(cleanPhone)) {
      setError(
        isEn ? 'Please enter a valid phone number (+998 90 123 45 67)' : (isRu ? 'Введите корректный номер телефона (+998 90 123 45 67)' : "To'g'ri telefon raqam kiriting (masalan: +998 90 123 45 67)")
      );
      return;
    }

    if (!password || password.length < 6) {
      setError(
        isEn ? 'Password must be at least 6 characters' : (isRu ? 'Пароль должен содержать минимум 6 символов' : "Parol kamida 6 ta belgidan iborat bo'lishi kerak")
      );
      return;
    }

    try {
      setLoading(true);

      // 1. Agar raqam avval ro'yxatdan o'tgan bo'lsa ham, SMS tasdiqlash orqali qayta kirish / parolni yangilash imkonini beramiz
      const existingUser = await getData(`user_account_${cleanPhone}`);
      if (existingUser) {
        console.log(`[Registration] '${cleanPhone}' uchun SMS orqali qayta tasdiqlash/yangilash jarayoni boshlanmoqda.`);
      }

      // 2. Haqiqiy 6 xonali SMS kodni telefon raqamga yuborish
      const otpRes = await sendSmsOtp(cleanPhone, cleanName);
      if (!otpRes.success) {
        setError(otpRes.error || (isEn ? 'Error sending SMS code' : "SMS kod yuborishda xatolik yuz berdi"));
        setLoading(false);
        return;
      }

      // 3. SMS Tasdiqlash ekraniga o'tish
      navigation.navigate('SmsVerification', {
        mode: 'sms_verification',
        phone: cleanPhone,
        name: cleanName,
        password: password,
        sentCode: otpRes.code || '123456',
      });
    } catch (e) {
      console.warn('SMS registration error:', e);
      setError(isEn ? 'Error sending verification code' : "Tasdiqlash kodini yuborishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={isDark ? [colors.background, '#0d2518'] : ['#f0fdf4', '#dcfce7']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.stepText, { color: GREEN }]}>
                {isRu ? 'Шаг 8 из 8' : (isEn ? 'Step 8 of 8' : 'Qadam 8/8')}
              </Text>
            </View>
          </View>

          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: `${GREEN}25` }]}>
              <Ionicons name="shield-checkmark-outline" size={48} color={GREEN} />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              {isEn ? 'Create Account' : (isRu ? 'Регистрация' : 'Ro\'yxatdan o\'tish')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {isEn
                ? 'Enter your phone number to receive a secure SMS verification code'
                : (isRu
                  ? 'Введите номер телефона для получения SMS-кода подтверждения'
                  : 'SMS orqali tasdiqlash uchun telefon raqamingizni kiriting')}
            </Text>

            {/* Error Message */}
            {Boolean(error) && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Avval kiritilgan ism ko'rsatilishi (2 marta so'ralmaydi) */}
            {Boolean(userDisplayName) && (
              <View style={styles.nameConfirmCard}>
                <View style={[styles.nameConfirmIcon, { backgroundColor: `${GREEN}18` }]}>
                  <Ionicons name="person" size={18} color={GREEN} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.nameConfirmLabel, { color: colors.textSecondary }]}>
                    {isEn ? 'Account for' : (isRu ? 'Владелец аккаунта' : 'Hisob egasi')}
                  </Text>
                  <Text style={[styles.nameConfirmValue, { color: colors.text }]}>
                    {userDisplayName}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={20} color={GREEN} />
              </View>
            )}

            {/* Phone Number Input */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {isEn ? 'Phone Number' : (isRu ? 'Номер телефона' : 'Telefon raqamingiz')}
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: `${colors.primary}33` }]}>
                <Ionicons name="call-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text, fontWeight: '700', letterSpacing: 1 }]}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  placeholder="+998 90 123 45 67"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={17}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {isEn ? 'Create Password' : (isRu ? 'Придумайте пароль' : 'Parol o\'ylab toping')}
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: `${colors.primary}33` }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={password}
                  onChangeText={(val) => { setPassword(val); setError(''); }}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 6 }}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: GREEN }]}
              onPress={handleCreateAccount}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Text style={styles.submitBtnText}>
                    {isEn ? 'Get SMS Code & Continue' : (isRu ? 'Получить SMS-код' : 'SMS kodni olish va davom etish')}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#000" />
                </View>
              )}
            </TouchableOpacity>

            {/* Already a member? Sign In */}
            <TouchableOpacity
              style={styles.signInLink}
              onPress={() => navigation.navigate('SignIn')}
              activeOpacity={0.7}
            >
              <Text style={[styles.signInLinkText, { color: colors.textSecondary }]}>
                {isEn ? 'Already have an account?' : (isRu ? 'Уже есть аккаунт?' : 'Akkauntingiz bormi?')}
                <Text style={{ color: GREEN, fontWeight: '800' }}>
                  {isEn ? ' Sign In' : (isRu ? ' Войти' : ' Kirish')}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  backBtn: {
    padding: 8,
    borderRadius: RADIUS.round,
  },
  stepText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
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
    marginBottom: SPACING.xl,
    lineHeight: 20,
    paddingHorizontal: 10,
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
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  fieldGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    paddingHorizontal: SPACING.md,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 16,
    height: '100%',
  },
  submitBtn: {
    borderRadius: RADIUS.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#000000',
    fontWeight: '700',
  },
  signInLink: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  signInLinkText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  nameConfirmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderColor: 'rgba(0, 230, 118, 0.25)',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: SPACING.lg,
    width: '100%',
    gap: 12,
  },
  nameConfirmIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameConfirmLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  nameConfirmValue: {
    fontSize: 15,
    fontWeight: '800',
  },
});

export default RegistrationScreen;
