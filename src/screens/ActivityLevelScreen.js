import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import CustomButton from '../components/CustomButton';
import { setData } from '../utils/storage';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const ActivityLevelScreen = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();
  const { i18n } = useTranslation();
  const [selectedActivity, setSelectedActivity] = useState('moderate');
  const { gender, weight } = route.params || {};
  const GREEN = colors.primary || '#00E676';
  const isEn = i18n.language === 'en';
  const isRu = i18n.language === 'ru';

  const activityLevels = [
    {
      value: 'sedentary',
      icon: 'bed-outline',
      title: isEn ? 'Sedentary' : (isRu ? 'Малоподвижный' : 'Kam harakatli'),
      description: isEn ? 'Little to no exercise' : (isRu ? 'Сидячий образ жизни' : 'Jismoniy mashq yo\'q yoki kam'),
    },
    {
      value: 'light',
      icon: 'walk-outline',
      title: isEn ? 'Light activity' : (isRu ? 'Легкая активность' : 'Yengil'),
      description: isEn ? 'Exercise 1-3 days per week' : (isRu ? 'Тренировки 1-3 дня в неделю' : 'Haftasiga 1-3 kun mashq'),
    },
    {
      value: 'moderate',
      icon: 'bicycle-outline',
      title: isEn ? 'Moderate' : (isRu ? 'Умеренная' : 'O\'rtacha'),
      description: isEn ? 'Exercise 3-5 days per week' : (isRu ? 'Тренировки 3-5 дней в неделю' : 'Haftasiga 3-5 kun mashq'),
    },
    {
      value: 'active',
      icon: 'barbell-outline',
      title: isEn ? 'Very active' : (isRu ? 'Высокая активность' : 'Juda faol'),
      description: isEn ? 'Heavy exercise 6-7 days per week' : (isRu ? 'Интенсивный спорт 6-7 дней' : 'Haftasiga 6-7 kun mashq'),
    },
  ];

  const handleContinue = async () => {
    const act = selectedActivity || 'moderate';
    try {
      await setData('gender', gender);
      await setData('weight', String(weight || 70));
      await setData('activityLevel', act);
      navigation.navigate('Registration');
    } catch (err) {
      console.error('Error saving activity level:', err);
      navigation.navigate('Registration');
    }
  };

  return (
    <LinearGradient
      colors={isDark ? [colors.background, '#0d2518'] : ['#f0fdf4', '#dcfce7']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={[styles.stepText, { color: GREEN }]}>
          {isEn ? 'Step 7 of 8' : (isRu ? 'Шаг 7 из 8' : 'Qadam 7/8')}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isEn ? 'Physical activity level' : (isRu ? 'Уровень физической активности' : 'Jismoniy faollik darajangiz')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isEn
            ? 'This helps us calculate your daily caloric burn and metabolic rate.'
            : (isRu
              ? 'Это поможет нам рассчитать суточный расход калорий и метаболизм.'
              : 'Bu ma\'lumot energiya ehtiyojingizni hisoblab chiqishda yordam beradi.')}
        </Text>

        <View style={styles.activitiesContainer}>
          {activityLevels.map((activity) => (
            <TouchableOpacity
              key={activity.value}
              style={[
                styles.activityCard,
                { backgroundColor: colors.card, borderColor: 'transparent' },
                selectedActivity === activity.value && {
                  borderColor: colors.primary,
                  backgroundColor: `${colors.primary}15`
                },
              ]}
              onPress={() => setSelectedActivity(activity.value)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.background },
                  selectedActivity === activity.value && { backgroundColor: `${colors.primary}20` },
                ]}
              >
                <Ionicons
                  name={activity.icon}
                  size={32}
                  color={selectedActivity === activity.value ? colors.primary : colors.textMuted}
                />
              </View>
              <View style={styles.activityInfo}>
                <Text
                  style={[
                    styles.activityTitle,
                    { color: colors.text },
                    selectedActivity === activity.value && { color: colors.primary },
                  ]}
                >
                  {activity.title}
                </Text>
                <Text style={[styles.activityDescription, { color: colors.textSecondary }]}>{activity.description}</Text>
              </View>
              {selectedActivity === activity.value && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton
          title={isEn ? 'Continue' : (isRu ? 'Далее' : 'Davom etish')}
          onPress={handleContinue}
          disabled={!selectedActivity}
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
    marginBottom: SPACING.lg,
  },
  stepText: {
    fontSize: FONTS.sm,
    fontWeight: '600',
    marginBottom: SPACING.sm,
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
    marginBottom: SPACING.xl,
  },
  activitiesContainer: {
    gap: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 2,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: FONTS.lg,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  activityDescription: {
    fontSize: FONTS.sm,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
});

export default ActivityLevelScreen;
