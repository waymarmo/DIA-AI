import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../components/CustomButton';
import { saveUserData, markOnboardingComplete, setData } from '../utils/storage';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { sendSmsOtp } from '../services/SmsAuthService';

const PasswordSetupScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { phone } = route.params || {};

  const passwordStrength = () => {
    if (password.length < 6) return { text: 'Juda zaif', color: COLORS.error, percentage: 25 };
    if (password.length < 8) return { text: 'Zaif', color: '#FFA726', percentage: 50 };
    if (!/(?=.*[0-9])(?=.*[a-zA-Z])/.test(password)) {
      return { text: 'O\'rtacha', color: '#FFD54F', percentage: 75 };
    }
    return { text: 'Kuchli', color: colors.primary, percentage: 100 };
  };

  const isValidPassword = () => {
    return (
      password.length >= 6 &&
      password === confirmPassword &&
      /(?=.*[0-9])(?=.*[a-zA-Z])/.test(password)
    );
  };

  const handleComplete = async () => {
    if (isValidPassword()) {
      setIsLoading(true);
      try {
        await setData('userPhone', phone);
        await setData('userPassword', password);
        await setData('saved_password', password);
        await saveUserData({
          phone,
          password, // In production, hash before saving
          registeredAt: new Date().toISOString(),
        });
        
        // Haqiqiy SMS yuborish (TextUP rasmiy provayderi orqali)
        try {
          await sendSmsOtp(phone);
        } catch (apiErr) {
          console.warn('[PasswordSetup] SMS yuborish xatosi:', apiErr?.message);
        }
        
        navigation.navigate('SmsVerification', { phone });
      } catch (error) {
        console.error('Registration storage error:', error);
        navigation.navigate('SmsVerification', { phone });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const strength = passwordStrength();

  return (
    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}25` }]}>
            <Ionicons name="lock-closed-outline" size={64} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Parol o'rnating</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Hisobingizni himoya qilish uchun xavfsiz parol yarating</Text>

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <Text style={[styles.label, { color: colors.text }]}>Parol</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: `${colors.primary}33` }]}>
              <Ionicons name="lock-closed" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Kamida 6 ta belgi"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                textContentType="newPassword"
                importantForAutofill="yes"
                selectionColor={colors.primary}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={[styles.strengthBar, { backgroundColor: colors.border }]}>
                  <View style={[styles.strengthFill, { width: `${strength.percentage}%`, backgroundColor: strength.color }]} />
                </View>
                <Text style={[styles.strengthText, { color: strength.color }]}>{strength.text}</Text>
              </View>
            )}
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputWrapper}>
            <Text style={[styles.label, { color: colors.text }]}>Parolni tasdiqlang</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: `${colors.primary}33` }]}>
              <Ionicons name="lock-closed" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Parolni qayta kiriting"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showConfirmPassword}
                selectionColor={colors.primary}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            {Boolean(confirmPassword && password !== confirmPassword) && (
              <Text style={styles.errorText}>Parollar mos kelmaydi</Text>
            )}
          </View>

          {/* Password Requirements */}
          <View style={[styles.requirementsBox, { backgroundColor: colors.card, borderColor: `${colors.primary}33` }]}>
            <Text style={[styles.requirementsTitle, { color: colors.text }]}>Parol talablari:</Text>
            <View style={styles.requirementRow}>
              <Ionicons
                name={password.length >= 6 ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={password.length >= 6 ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>Kamida 6 ta belgi</Text>
            </View>
            <View style={styles.requirementRow}>
              <Ionicons
                name={/[0-9]/.test(password) ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={/[0-9]/.test(password) ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>Kamida 1 ta raqam</Text>
            </View>
            <View style={styles.requirementRow}>
              <Ionicons
                name={/[a-zA-Z]/.test(password) ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={/[a-zA-Z]/.test(password) ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>Kamida 1 ta harf</Text>
            </View>
          </View>
        </View>

          <View style={styles.footer}>
            <CustomButton
              title="Davom etish"
              onPress={handleComplete}
              disabled={!isValidPassword() || isLoading}
              loading={isLoading}
              icon="arrow-forward-outline"
            />
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
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: 100, // Keyboard ochilganda button ko'rinishi uchun
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.round,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONTS.hero,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.md,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
    lineHeight: 24,
  },
  inputWrapper: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONTS.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 2,
    paddingHorizontal: SPACING.md,
    height: 56,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: FONTS.lg,
  },
  strengthContainer: {
    marginTop: SPACING.sm,
  },
  strengthBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  strengthFill: {
    height: '100%',
  },
  strengthText: {
    fontSize: FONTS.sm,
    fontWeight: '600',
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONTS.sm,
    marginTop: SPACING.xs,
  },
  requirementsBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  requirementsTitle: {
    fontSize: FONTS.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  requirementText: {
    fontSize: FONTS.sm,
    marginLeft: SPACING.sm,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
});

export default PasswordSetupScreen;
