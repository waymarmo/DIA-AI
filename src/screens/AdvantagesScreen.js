import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../components/CustomButton';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const AdvantagesScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const isEn = i18n.language === 'en';
  const isRu = i18n.language === 'ru';

  const advantages = [
    {
      icon: 'medkit-outline',
      title: isEn ? 'AI Health Navigator' : (isRu ? 'AI Навигатор по болезни' : 'AI Kasallik Navigatori'),
      description: isEn
        ? 'Select your diagnosis and receive an accurate, personalized medical action plan from your AI companion.'
        : (isRu
          ? 'Введите диагноз и получите точный план действий от ИИ-помощника.'
          : 'Tashxisingizni kiriting va AI yordamchidan aniq harakat rejasini oling.'),
    },
    {
      icon: 'restaurant-outline',
      title: isEn ? 'Clinical Diet & Nutrition' : (isRu ? 'Рецепты и питание' : 'Retseptlar va Ovqatlanish'),
      description: isEn
        ? 'Personalized recipes and nutritional guidance tailored specifically to your health.'
        : (isRu
          ? 'Персональные рецепты и советы по питанию для вашего состояния здоровья.'
          : 'Sog\'ligingiz holatiga mos shaxsiy retseptlar va tavsiyalar.'),
    },
    {
      icon: 'fitness-outline',
      title: isEn ? 'Safe Physical Exercises' : (isRu ? 'Упражнения и спорт' : 'Sport Mashqlari'),
      description: isEn
        ? 'Doctor-vetted physical routines matched to your health condition and goals.'
        : (isRu
          ? 'Подобранные физические упражнения с учётом вашего заболевания.'
          : 'Kasalligingizga mos jismoniy mashqlar va tavsiyalar.'),
    },
  ];

  const GREEN = colors.primary || '#00E676';

  return (
    <LinearGradient
      colors={isDark ? [colors.background, '#0d2518'] : ['#f0fdf4', '#dcfce7']}
      style={styles.container}
    >
      {/* Header with step */}
      <View style={styles.header}>
        <View style={styles.stepRow}>
          <Text style={[styles.stepText, { color: GREEN }]}>
            {isEn ? 'Step 2 of 8' : (isRu ? 'Шаг 2 из 8' : 'Qadam 2/8')}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {isEn ? 'Key Advantages\nof Dia AI' : (isRu ? 'Преимущества\nDia AI' : 'Ilovamizning\nAfzalliklari')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isEn
              ? 'Your universal AI companion to manage and improve your health condition.'
              : (isRu
                ? 'Универсальный помощник для управления любым заболеванием.'
                : 'Har qanday kasallikni boshqarish uchun universal yordamchi.')}
          </Text>

          {/* Feature Cards */}
          <View style={styles.advantagesContainer}>
            {advantages.map((adv, index) => (
              <View
                key={index}
                style={[
                  styles.advantageCard,
                  {
                    backgroundColor: isDark ? '#12281c' : '#ffffff',
                    borderColor: isDark ? 'rgba(0,230,118,0.25)' : '#bbf7d0',
                  }
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(0, 230, 118, 0.16)' : '#DCFCE7' }]}>
                  <Ionicons name={adv.icon} size={26} color={GREEN} />
                </View>
                <View style={styles.advantageText}>
                  <Text style={[styles.advantageTitle, { color: colors.text }]}>{adv.title}</Text>
                  <Text style={[styles.advantageDesc, { color: colors.textSecondary }]}>{adv.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Bottom info card */}
          <View style={[styles.infoBox, { backgroundColor: isDark ? '#10251a' : '#ecfdf5', borderColor: isDark ? 'rgba(0,230,118,0.25)' : '#a7f3d0' }]}>
            <Ionicons name="shield-checkmark" size={22} color={GREEN} />
            <Text style={[styles.infoText, { color: isDark ? 'rgba(255,255,255,0.85)' : '#065f46' }]}>
              {isEn
                ? 'All recommendations are scientifically grounded and safe. Dia AI does not replace a doctor, but guides your daily health decisions.'
                : (isRu
                  ? 'Все рекомендации научно обоснованы и безопасны. Dia AI не заменяет врача, но помогает вам ориентироваться.'
                  : 'Barcha tavsiyalar ilmiy asoslangan va xavfsiz. Dia AI shifokorni almashtirmaydi, lekin yo\'l ko\'rsatadi.')}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton
          title={isEn ? 'Continue' : (isRu ? 'Далее' : 'Davom etish')}
          onPress={() => navigation.navigate('Advantages2')}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  stepText: { fontSize: FONTS.sm, fontWeight: '700', letterSpacing: 0.5 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },
  title: {
    fontSize: 34,
    fontWeight: '800',
    marginBottom: SPACING.sm,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FONTS.md,
    lineHeight: 24,
    marginBottom: SPACING.xxl,
  },
  advantagesContainer: { gap: SPACING.md, marginBottom: SPACING.xl },
  advantageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.2,
    overflow: 'hidden',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  advantageText: { flex: 1 },
  advantageTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  advantageDesc: { fontSize: 13, lineHeight: 18 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.2,
    gap: 12,
    overflow: 'hidden',
  },
  infoText: { flex: 1, fontSize: 12.5, lineHeight: 18, fontWeight: '500' },
  footer: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
});

export default AdvantagesScreen;
