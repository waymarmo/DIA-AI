import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../components/CustomButton';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const Advantages2Screen = ({ navigation }) => {
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
  const GREEN = colors.primary || '#00E676';

  const features = [
    {
      icon: 'analytics-outline',
      title: isEn ? 'Biometrics & Analytics' : (isRu ? 'Анализ и статистика' : 'Tahlil va Statistika'),
      description: isEn
        ? 'Track your health vitals and observe daily progress trends with AI insights.'
        : (isRu
          ? 'Отслеживайте свои показатели и смотрите графики прогресса.'
          : 'Ko\'rsatkichlaringizni kuzating va o\'sish grafiklarini ko\'ring.'),
    },
    {
      icon: 'notifications-outline',
      title: isEn ? 'Smart Reminders' : (isRu ? 'Умные уведомления' : 'Aqlli Bildirishnomalar'),
      description: isEn
        ? 'Timely reminders for medications, checkups, and daily health goals.'
        : (isRu
          ? 'Напоминания о лекарствах, осмотрах и ежедневных целях.'
          : 'Dori vaqti, tekshiruv va kunlik maqsadlar uchun eslatmalar.'),
    },
    {
      icon: 'people-outline',
      title: isEn ? 'Specialist Guidance' : (isRu ? 'Поддержка специалистов' : 'Mutaxassislar Yo\'naltirish'),
      description: isEn
        ? 'Know which medical specialists to consult and in what prioritized order.'
        : (isRu
          ? 'Узнайте к каким специалистам обратиться и в каком порядке.'
          : 'Qaysi mutaxassisga, qanday tartibda murojaat qilishni biling.'),
    },
  ];

  const benefits = isEn
    ? ['Personalized meal control & diet plans', 'Diagnosis-matched exercise regimens', 'Tailored AI medical action guidance']
    : (isRu
      ? ['Контроль питания и рецепты', 'Спортивные упражнения по диагнозу', 'Персональный план действий']
      : ['Ovqatlanish nazorati va retseptlar', 'Tashxisga mos sport mashqlari', 'Shaxsiy harakat rejasi']);

  return (
    <LinearGradient
      colors={isDark ? [colors.background, '#0d2518'] : ['#f0fdf4', '#dcfce7']}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.stepRow}>
          <Text style={[styles.stepText, { color: GREEN }]}>
            {isEn ? 'Step 3 of 8' : (isRu ? 'Шаг 3 из 8' : 'Qadam 3/8')}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={[styles.title, { color: colors.text }]}>
            {isEn ? 'Even More\nCapabilities' : (isRu ? 'Ещё больше\nвозможностей' : 'Yana qanday\nimkoniyatlar bor?')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isEn
              ? 'Dia AI makes comprehensive health management simple, smart, and effective.'
              : (isRu
                ? 'Dia AI делает управление здоровьем простым и эффективным.'
                : 'Dia AI sog\'liqni boshqarishni oson va samarali qiladi.')}
          </Text>

          {/* Feature Cards */}
          <View style={styles.featuresContainer}>
            {features.map((feature, index) => (
              <View
                key={index}
                style={[
                  styles.featureCard,
                  {
                    backgroundColor: isDark ? '#12281c' : '#ffffff',
                    borderColor: isDark ? 'rgba(0,230,118,0.25)' : '#bbf7d0',
                  }
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(0, 230, 118, 0.16)' : '#DCFCE7' }]}>
                  <Ionicons name={feature.icon} size={26} color={GREEN} />
                </View>
                <View style={styles.featureText}>
                  <Text style={[styles.featureTitle, { color: colors.text }]}>{feature.title}</Text>
                  <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Benefits Box */}
          <View style={[styles.benefitsBox, { backgroundColor: isDark ? '#10251a' : '#ffffff', borderColor: isDark ? 'rgba(0,230,118,0.25)' : '#bbf7d0' }]}>
            <Text style={[styles.benefitsTitle, { color: colors.text }]}>
              {isEn ? 'For Your Well-being' : (isRu ? 'Для вашего здоровья' : 'Sog\'ligingiz uchun')}
            </Text>
            {benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={20} color={GREEN} />
                <Text style={[styles.benefitText, { color: colors.textSecondary }]}>{benefit}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton
          title={isEn ? 'Continue' : (isRu ? 'Далее' : 'Davom etish')}
          onPress={() => navigation.navigate('NameInput')}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  stepText: { fontSize: FONTS.sm, fontWeight: '700', letterSpacing: 0.5 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },
  title: { fontSize: 34, fontWeight: '800', marginBottom: SPACING.sm, lineHeight: 40, letterSpacing: -0.5 },
  subtitle: { fontSize: FONTS.md, lineHeight: 24, marginBottom: SPACING.xxl },
  featuresContainer: { gap: SPACING.md, marginBottom: SPACING.xl },
  featureCard: {
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
  featureText: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  featureDesc: { fontSize: 13, lineHeight: 18 },
  benefitsBox: {
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1.2,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  benefitsTitle: { fontSize: FONTS.xl, fontWeight: '700', marginBottom: SPACING.md },
  benefitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: 10 },
  benefitText: { fontSize: FONTS.md, flex: 1 },
  footer: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
});

export default Advantages2Screen;
