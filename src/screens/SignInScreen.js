import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { getData, setData, setOnboardingCompleted } from '../utils/storage';
import { formatUzbekPhoneNumber, cleanPhoneNumber, isValidUzbekPhone, sendSmsOtp, verifySmsOtp } from '../services/SmsAuthService';

const SignInScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const isRu = i18n?.language === 'ru';
  const isEn = i18n?.language === 'en';
  const GREEN = colors.primary || '#00E676';

  const [phone, setPhone] = useState('+998 ');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [error, setError] = useState('');

  // Parolni SMS orqali tiklash holatlari
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('+998 ');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotTimer, setForgotTimer] = useState(0);

  useEffect(() => {
    let interval = null;
    if (forgotTimer > 0) {
      interval = setInterval(() => setForgotTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [forgotTimer]);

  const handleForgotSendOtp = async () => {
    setForgotError('');
    const clean = cleanPhoneNumber(forgotPhone);
    if (!isValidUzbekPhone(clean)) {
      setForgotError(
        isEn ? 'Please enter a valid phone number' : (isRu ? 'Введите корректный номер' : "Telefon raqamingizni to'liq kiriting")
      );
      return;
    }
    try {
      setForgotLoading(true);
      const res = await sendSmsOtp(clean);
      if (res && res.success) {
        setForgotOtpSent(true);
        setForgotTimer(60);
      } else {
        setForgotError(res?.error || "SMS yuborishda xatolik yuz berdi");
      }
    } catch (err) {
      setForgotError("SMS yuborishda xatolik yuz berdi");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResetPassword = async () => {
    setForgotError('');
    const clean = cleanPhoneNumber(forgotPhone);
    if (forgotOtp.trim().length !== 6) {
      setForgotError(
        isEn ? 'Enter the 6-digit SMS code' : (isRu ? 'Введите 6-значный SMS-код' : "6 xonali SMS kodni kiriting")
      );
      return;
    }
    if (forgotNewPass.length < 4) {
      setForgotError(
        isEn ? 'Password must be at least 4 characters' : (isRu ? 'Пароль должен содержать минимум 4 символа' : "Yangi parol kamida 4 ta belgidan iborat bo'lishi kerak")
      );
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setForgotError(
        isEn ? 'Passwords do not match' : (isRu ? 'Пароли не совпадают' : "Parollar bir-biriga mos kelmadi")
      );
      return;
    }

    try {
      setForgotLoading(true);
      const verifyRes = await verifySmsOtp(clean, forgotOtp.trim());
      if (!verifyRes.success) {
        setForgotError(verifyRes.error || "SMS kod noto'g'ri kiritildi");
        setForgotLoading(false);
        return;
      }

      // Yangi parolni saqlash
      await setData('userPassword', forgotNewPass);
      await setData('saved_password', forgotNewPass);
      await setData('userPhone', clean);
      await setData('userToken', `auth_session_${Date.now()}`);

      const savedUserRaw = await getData(`user_account_${clean}`);
      if (savedUserRaw) {
        const parsed = typeof savedUserRaw === 'string' ? JSON.parse(savedUserRaw) : savedUserRaw;
        parsed.password = forgotNewPass;
        await setData(`user_account_${clean}`, parsed);
      }

      await setOnboardingCompleted();
      setForgotModalVisible(false);

      Alert.alert(
        isEn ? 'Success' : (isRu ? 'Успешно' : 'Muvaffaqiyatli'),
        isEn ? 'Your password has been updated!' : (isRu ? 'Ваш пароль успешно обновлен!' : 'Yangi parolingiz muvaffaqiyatli saqlandi!'),
        [{
          text: 'OK',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainApp' }],
            });
          }
        }]
      );
    } catch (err) {
      setForgotError("Parolni yangilashda xatolik yuz berdi");
    } finally {
      setForgotLoading(false);
    }
  };

  const handlePhoneChange = (text) => {
    setError('');
    const formatted = formatUzbekPhoneNumber(text);
    setPhone(formatted);
  };

  // Parol orqali kirish
  const handleSignIn = async () => {
    setError('');
    const cleanPhone = cleanPhoneNumber(phone);

    if (!isValidUzbekPhone(cleanPhone)) {
      setError(
        isEn ? 'Please enter a valid phone number (+998 90 123 45 67)' : (isRu ? 'Введите корректный номер телефона' : "Telefon raqamingizni to'liq kiriting (masalan: +998 90 123 45 67)")
      );
      return;
    }
    if (!password) {
      setError(
        isEn ? 'Please enter your password' : (isRu ? 'Введите пароль' : "Parolingizni kiriting")
      );
      return;
    }

    try {
      setLoading(true);

      // Check registered account
      const savedUserRaw = await getData(`user_account_${cleanPhone}`);
      const savedPass = await getData('userPassword');
      const savedPhone = await getData('userPhone');

      let matchedPass = null;
      let userName = 'Bemor';

      if (savedUserRaw) {
        const parsed = typeof savedUserRaw === 'string' ? JSON.parse(savedUserRaw) : savedUserRaw;
        matchedPass = parsed.password;
        userName = parsed.name || userName;
      } else if (savedPhone && cleanPhoneNumber(savedPhone) === cleanPhone) {
        matchedPass = savedPass;
        userName = (await getData('userName')) || (await getData('firstName')) || userName;
      }

      if (matchedPass && matchedPass !== password) {
        setError(
          isEn ? 'Incorrect password. Please try again.' : (isRu ? 'Неверный пароль. Попробуйте снова.' : "Parol noto'g'ri kiritildi. Qaytadan tekshirib kiring.")
        );
        setLoading(false);
        return;
      }

      // Save authenticated user session
      await setData('userPhone', cleanPhone);
      await setData('userName', userName);
      await setData('userToken', `auth_session_${Date.now()}`);
      await setOnboardingCompleted();

      // Navigate straight into MainApp
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp' }],
      });
    } catch (e) {
      console.warn('Sign In error:', e);
      setError(isEn ? 'Error signing in' : "Tizimga kirishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  // SMS orqali bir martalik kod bilan tezkor kirish
  const handleSmsQuickLogin = async () => {
    setError('');
    const cleanPhone = cleanPhoneNumber(phone);

    if (!isValidUzbekPhone(cleanPhone)) {
      setError(
        isEn ? 'Enter your phone number to receive an SMS code' : (isRu ? 'Введите номер телефона для получения SMS-кода' : "SMS kod olish uchun telefon raqamingizni kiriting")
      );
      return;
    }

    try {
      setSmsLoading(true);
      const res = await sendSmsOtp(cleanPhone);
      if (!res.success) {
        setError(res.error || (isEn ? 'Failed to send SMS' : "SMS kod yuborishda xatolik yuz berdi"));
        setSmsLoading(false);
        return;
      }

      navigation.navigate('SmsVerification', {
        mode: 'sms_verification',
        phone: cleanPhone,
        name: (await getData('userName')) || 'Foydalanuvchi',
        sentCode: res.code || '123456',
      });
    } catch (e) {
      console.warn('SMS Login error:', e);
      setError(isEn ? 'Failed to send SMS' : "SMS kod yuborishda xatolik yuz berdi");
    } finally {
      setSmsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#101216' : '#FFFFFF' }]} edges={['top']}>
      {/* Header with Back Arrow */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: colors.text }]}>
          {isEn ? 'Sign In' : (isRu ? 'Вход' : 'Tizimga kirish')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Welcome Headline */}
          <View style={styles.headlineContainer}>
            <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>
              {isEn ? 'Welcome Back' : (isRu ? 'С возвращением' : 'Xush kelibsiz')}
            </Text>
            <Text style={[styles.welcomeMain, { color: colors.text }]}>
              {isEn ? 'Sign in with your phone' : (isRu ? 'Вход по номеру телефона' : 'Telefon raqam bilan kirish')}
            </Text>
          </View>

          {/* Error Banner */}
          {Boolean(error) && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Phone Field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              {isEn ? 'Phone Number' : (isRu ? 'Номер телефона' : 'Telefon raqamingiz')}
            </Text>
            <View style={[styles.inputBox, { backgroundColor: isDark ? '#1C1F26' : '#F3F4F6' }]}>
              <Ionicons name="call-outline" size={20} color={GREEN} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.input, { color: colors.text, fontWeight: '700', letterSpacing: 1 }]}
                placeholder="+998 90 123 45 67"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={17}
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              {isEn ? 'Password' : (isRu ? 'Пароль' : 'Parol')}
            </Text>
            <View style={[styles.inputBox, { backgroundColor: isDark ? '#1C1F26' : '#F3F4F6' }]}>
              <Ionicons name="lock-closed-outline" size={20} color={GREEN} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Parolni unutdingizmi? link */}
          <TouchableOpacity
            style={{ alignSelf: 'flex-end', marginTop: -4, marginBottom: 14, paddingVertical: 4 }}
            onPress={() => {
              setForgotPhone(phone.length > 5 ? phone : '+998 ');
              setForgotOtp('');
              setForgotNewPass('');
              setForgotConfirmPass('');
              setForgotOtpSent(false);
              setForgotError('');
              setForgotModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={{ color: GREEN, fontSize: 13, fontWeight: '700' }}>
              {isEn ? 'Forgot Password?' : (isRu ? 'Забыли пароль?' : 'Parolni unutdingizmi?')}
            </Text>
          </TouchableOpacity>

          {/* Sign In Primary Button */}
          <TouchableOpacity
            style={[styles.signInBtn, { backgroundColor: GREEN }]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Text style={styles.signInBtnText}>
                {isEn ? 'Sign In' : (isRu ? 'Войти' : 'Tizimga kirish')}
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>
              {isEn ? 'OR' : (isRu ? 'ИЛИ' : 'YOKI')}
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }]} />
          </View>

          {/* SMS 1-Time Code Quick Login Button */}
          <TouchableOpacity
            style={[
              styles.smsQuickBtn,
              {
                backgroundColor: isDark ? '#1C1F26' : '#F0FDF4',
                borderColor: `${GREEN}55`,
              }
            ]}
            onPress={handleSmsQuickLogin}
            disabled={smsLoading}
            activeOpacity={0.85}
          >
            {smsLoading ? (
              <ActivityIndicator size="small" color={GREEN} />
            ) : (
              <View style={styles.smsQuickContent}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={GREEN} style={{ marginRight: 10 }} />
                <Text style={[styles.smsQuickBtnText, { color: colors.text }]}>
                  {isEn ? 'Sign in with SMS code' : (isRu ? 'Войти по SMS-коду' : 'SMS kod orqali kirish')}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Don't have an account? Sign Up */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Registration')}
            style={styles.signUpLink}
            activeOpacity={0.7}
          >
            <Text style={[styles.signUpLinkText, { color: colors.textSecondary }]}>
              {isEn ? "Don't have an account?" : (isRu ? "Нет аккаунта?" : "Akkauntingiz yo'qmi?")}
              <Text style={{ color: GREEN, fontWeight: '800' }}>
                {isEn ? ' Register' : (isRu ? ' Зарегистрироваться' : " Ro'yxatdan o'tish")}
              </Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Parolni SMS orqali tiklash Modali ── */}
      <Modal
        visible={forgotModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
        >
          <View style={{
            backgroundColor: isDark ? '#1C1F26' : '#FFFFFF',
            width: '100%',
            maxWidth: 400,
            borderRadius: 24,
            padding: 24,
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${GREEN}22`, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Ionicons name="key-outline" size={20} color={GREEN} />
                </View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>
                  {isEn ? 'Reset Password' : (isRu ? 'Восстановление пароля' : 'Parolni qayta tiklash')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setForgotModalVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16, lineHeight: 18 }}>
              {isEn
                ? 'Enter your phone number to receive a genuine verification code via SMS.'
                : (isRu
                  ? 'Введите номер телефона для получения SMS-кода подтверждения.'
                  : "Telefon raqamingizga haqiqiy SMS orqali 6 xonali tasdiqlash kodi yuboriladi.")}
            </Text>

            {Boolean(forgotError) && (
              <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: 10, borderRadius: 10, marginBottom: 14 }}>
                <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{forgotError}</Text>
              </View>
            )}

            {/* Phone Input */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 6 }}>
              {isEn ? 'Phone Number' : (isRu ? 'Номер телефона' : 'Telefon raqamingiz')}
            </Text>
            <View style={[styles.inputBox, { backgroundColor: isDark ? '#262A34' : '#F3F4F6', marginBottom: 14 }]}>
              <Ionicons name="call-outline" size={18} color={GREEN} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.input, { color: colors.text, fontWeight: '700' }]}
                placeholder="+998 90 123 45 67"
                placeholderTextColor="#9CA3AF"
                value={forgotPhone}
                onChangeText={(t) => setForgotPhone(formatUzbekPhoneNumber(t))}
                keyboardType="phone-pad"
                maxLength={17}
                editable={!forgotOtpSent}
              />
            </View>

            {!forgotOtpSent ? (
              <TouchableOpacity
                style={[styles.signInBtn, { backgroundColor: GREEN, marginTop: 4 }]}
                onPress={handleForgotSendOtp}
                disabled={forgotLoading}
                activeOpacity={0.85}
              >
                {forgotLoading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.signInBtnText}>
                    {isEn ? 'Send SMS Code' : (isRu ? 'Получить SMS-код' : '📱 SMS kod olish')}
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <View>
                {/* 6-digit OTP */}
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 6 }}>
                  {isEn ? '6-digit SMS Code' : (isRu ? '6-значный SMS-код' : '6 xonali SMS kod')}
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: `${GREEN}88`,
                    borderRadius: 12,
                    height: 50,
                    textAlign: 'center',
                    fontSize: 22,
                    letterSpacing: 6,
                    color: colors.text,
                    marginBottom: 14,
                    backgroundColor: isDark ? '#262A34' : '#FAFAFA',
                    fontWeight: '800',
                  }}
                  placeholder="000000"
                  placeholderTextColor="#9CA3AF"
                  value={forgotOtp}
                  onChangeText={(t) => setForgotOtp(t)}
                  keyboardType="number-pad"
                  maxLength={6}
                />

                {/* New Password */}
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 6 }}>
                  {isEn ? 'New Password' : (isRu ? 'Новый пароль' : 'Yangi parol')}
                </Text>
                <View style={[styles.inputBox, { backgroundColor: isDark ? '#262A34' : '#F3F4F6', marginBottom: 12 }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={GREEN} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="••••••••"
                    placeholderTextColor="#9CA3AF"
                    value={forgotNewPass}
                    onChangeText={(t) => setForgotNewPass(t)}
                    secureTextEntry={!showForgotPass}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowForgotPass(!showForgotPass)} style={styles.eyeBtn}>
                    <Ionicons name={showForgotPass ? "eye-off-outline" : "eye-outline"} size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                {/* Confirm Password */}
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 6 }}>
                  {isEn ? 'Confirm Password' : (isRu ? 'Подтвердите пароль' : 'Parolni tasdiqlang')}
                </Text>
                <View style={[styles.inputBox, { backgroundColor: isDark ? '#262A34' : '#F3F4F6', marginBottom: 16 }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={GREEN} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="••••••••"
                    placeholderTextColor="#9CA3AF"
                    value={forgotConfirmPass}
                    onChangeText={(t) => setForgotConfirmPass(t)}
                    secureTextEntry={!showForgotPass}
                    autoCapitalize="none"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.signInBtn, { backgroundColor: GREEN }]}
                  onPress={handleForgotResetPassword}
                  disabled={forgotLoading}
                  activeOpacity={0.85}
                >
                  {forgotLoading ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.signInBtnText}>
                      {isEn ? 'Save & Sign In' : (isRu ? 'Сохранить и войти' : 'Parolni yangilash va kirish')}
                    </Text>
                  )}
                </TouchableOpacity>

                {forgotTimer > 0 ? (
                  <Text style={{ textAlign: 'center', fontSize: 12, color: colors.textSecondary, marginTop: 10 }}>
                    Qayta yuborish: {forgotTimer} soniya
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleForgotSendOtp} style={{ marginTop: 10, paddingVertical: 4 }}>
                    <Text style={{ textAlign: 'center', fontSize: 12, color: GREEN, fontWeight: '700' }}>
                      SMS kodni qayta yuborish
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <TouchableOpacity
              style={{ marginTop: 14, paddingVertical: 8, alignItems: 'center' }}
              onPress={() => setForgotModalVisible(false)}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headlineContainer: {
    marginBottom: 28,
  },
  welcomeSub: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  welcomeMain: {
    fontSize: 24,
    fontWeight: '800',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  eyeBtn: {
    padding: 8,
  },
  signInBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  signInBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    letterSpacing: 0.5,
  },
  smsQuickBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smsQuickContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smsQuickBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  signUpLink: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 8,
  },
  signUpLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SignInScreen;
