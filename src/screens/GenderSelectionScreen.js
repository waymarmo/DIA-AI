import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import CustomButton from '../components/CustomButton';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const GenderSelectionScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const [selectedGender, setSelectedGender] = useState(null);
  const GREEN = colors.primary || '#00E676';
  const isEn = i18n.language === 'en';
  const isRu = i18n.language === 'ru';

  const genders = [
    { value: 'male', labelKey: 'gender.male', icon: 'male' },
    { value: 'female', labelKey: 'gender.female', icon: 'female' },
  ];

  const handleContinue = () => {
    if (selectedGender) {
      navigation.navigate('WeightInput', { gender: selectedGender });
    }
  };

  return (
    <LinearGradient
      colors={isDark ? [colors.background, '#0d2518'] : ['#f0fdf4', '#dcfce7']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={[styles.stepText, { color: GREEN }]}>
          {isEn ? 'Step 5 of 8' : (isRu ? 'Шаг 5 из 8' : 'Qadam 5/8')}
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isEn ? 'Your Gender' : (isRu ? 'Ваш пол' : t('gender.title'))}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isEn
            ? 'This information helps Dia AI personalize your metabolic recommendations.'
            : (isRu
              ? 'Это поможет нам подобрать рекомендации для вас.'
              : 'Bu ma\'lumot tavsiyalarni tuzishga yordam beradi.')}
        </Text>

        <View style={styles.genderContainer}>
          {genders.map((gender) => (
            <TouchableOpacity
              key={gender.value}
              style={[
                styles.genderCard,
                { backgroundColor: colors.card, borderColor: 'transparent' },
                selectedGender === gender.value && {
                  borderColor: colors.primary,
                  backgroundColor: `${colors.primary}15`
                },
              ]}
              onPress={() => setSelectedGender(gender.value)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: colors.background },
                  selectedGender === gender.value && { backgroundColor: `${colors.primary}20` },
                ]}
              >
                <Ionicons
                  name={gender.icon}
                  size={48}
                  color={selectedGender === gender.value ? colors.primary : colors.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.genderLabel,
                  { color: colors.textSecondary },
                  selectedGender === gender.value && { color: colors.text, fontWeight: '700' },
                ]}
              >
                {t(gender.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <CustomButton
          title={isRu ? 'Далее' : t('common.continue')}
          onPress={handleContinue}
          disabled={!selectedGender}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  stepText: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    letterSpacing: 0.5,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  title: {
    fontSize: FONTS.hero,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.md,
    lineHeight: 24,
    marginBottom: SPACING.xxl,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  genderCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    padding: SPACING.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  genderLabel: {
    fontSize: FONTS.xxl,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
});

export default GenderSelectionScreen;
