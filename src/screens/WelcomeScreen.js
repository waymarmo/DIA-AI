import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image, ImageBackground, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';
import { LOGO_SPLASH } from '../constants/assets';
import { useTheme } from '../context/ThemeContext';
import FallingLeavesAnimation from '../components/FallingLeavesAnimation';

const WelcomeScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <ImageBackground
      source={require('../../assets/images/bg_welcome_v2.png')}
      style={styles.container}
      resizeMode="cover"
    >
      {/* Qorong'ulatish qatlami: matnlar va tugmalar aniq o'qilishi uchun */}
      <View style={styles.overlay} pointerEvents="none" />

      {/* Jonli to'kiluvchi tabiiy yashil barglar */}
      <FallingLeavesAnimation />

      {/* Asosiy markaziy qism (Logo va sarlavha) */}
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Image
            source={LOGO_SPLASH}
            style={styles.logoIcon}
            resizeMode="contain"
          />
        </View>

        <View style={styles.titleWrapper}>
          <Text style={styles.heroTitle}>
            {t('auth.heroTitle') || "Sog'lom hayot sari qadam:\nDia AI bilan bugundan boshlang!"}
          </Text>
        </View>
      </View>

      {/* Pastki tugmalar */}
      <View style={styles.footer}>
        {/* Hisob yaratish (Til tanlash birinchi qadamga yo'naltirilgan) */}
        <TouchableOpacity
          style={styles.createAccountBtn}
          onPress={() => navigation.navigate('LanguageSelection')}
          activeOpacity={0.85}
        >
          <Text style={styles.createAccountBtnText}>
            {t('auth.createAccount') || "Hisob yaratish"}
          </Text>
        </TouchableOpacity>

        {/* Kirish havolasi */}
        <TouchableOpacity
          style={styles.signInLinkBtn}
          onPress={() => navigation.navigate('SignIn')}
          activeOpacity={0.8}
        >
          <Text style={styles.signInLinkBase}>
            {t('auth.alreadyMember') || "Allaqachon hisobingiz bormi?"}{' '}
            <Text style={styles.signInLinkBold}>
              {t('auth.signIn') || "Kirish"}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    backgroundColor: '#010503',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 15, 8, 0.55)',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  logoIcon: {
    width: 130,
    height: 130,
  },
  titleWrapper: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  heroTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl + 10,
    zIndex: 10,
    elevation: 10,
  },
  createAccountBtn: {
    backgroundColor: '#1E2229',
    borderRadius: 28,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#00E676',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 12,
  },
  createAccountBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  signInLinkBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 8,
  },
  signInLinkBase: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
    fontWeight: '500',
  },
  signInLinkBold: {
    color: '#00E676',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});

export default WelcomeScreen;
