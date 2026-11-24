import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import CustomButton from '../components/CustomButton';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const WeightInputScreen = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();
  const { i18n } = useTranslation();
  const [weight, setWeight] = useState('75');
  const { gender } = route.params || {};
  const GREEN = colors.primary || '#00E676';
  const isEn = i18n?.language === 'en';
  const isRu = i18n?.language === 'ru';

  const handleContinue = () => {
    if (weight && parseInt(weight) >= 30 && parseInt(weight) <= 200) {
      navigation.navigate('ActivityLevel', { gender, weight: parseInt(weight) });
    }
  };

  return (
      <LinearGradient
        colors={isDark ? [colors.background, '#0d2518'] : ['#f0fdf4', '#dcfce7']}
        style={styles.container}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.stepText, { color: GREEN }]}>
            {isEn ? 'Step 6 of 8' : (isRu ? 'Шаг 6 из 8' : 'Qadam 6/8')}
          </Text>
        </View>

      <View style={styles.content}>
        <View style={styles.dotContainer}>
          {[0, 1, 2, 3, 4, 5, 6].map((index) => (
            <View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: colors.border },
                index === 4 && { backgroundColor: colors.primary, width: 12, height: 12, borderRadius: 6 },
              ]}
            />
          ))}
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {isEn ? 'Enter your\ncurrent weight' : (isRu ? 'Введите ваш\nтекущий вес' : 'Hozirgi vazningizni\nkiriting')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isEn
            ? 'This helps us calculate your caloric baseline and dietary goals.'
            : (isRu
              ? 'Это поможет нам рассчитать суточную норму калорий и план диеты.'
              : 'Bu ma\'lumot siz uchun mos parhez rejasini tuzishga yordam beradi.')}
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { color: colors.textSecondary, borderBottomColor: colors.border, borderBottomWidth: 2 }]}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            maxLength={3}
            selectionColor={colors.primary}
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[styles.unit, { color: colors.textMuted }]}>kg</Text>
        </View>

        {Boolean(weight && (parseInt(weight) < 30 || parseInt(weight) > 200)) && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {isEn
              ? 'Weight must be between 30 and 200 kg'
              : (isRu
                ? 'Вес должен быть в пределах 30-200 кг'
                : 'Vazn 30-200 kg oralig\'ida bo\'lishi kerak')}
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        <CustomButton
          title={isEn ? 'Continue' : (isRu ? 'Далее' : 'Davom etish')}
          onPress={handleContinue}
          disabled={!weight || parseInt(weight) < 30 || parseInt(weight) > 200}
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
  header: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
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
    alignItems: 'center',
  },
  dotContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xxl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: FONTS.hero,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.sm,
    lineHeight: 44,
  },
  subtitle: {
    fontSize: FONTS.md,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
    lineHeight: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  input: {
    fontSize: 72,
    fontWeight: '700',
    textAlign: 'right',
    minWidth: 120,
    paddingVertical: SPACING.sm,
  },
  unit: {
    fontSize: 36,
    fontWeight: '600',
    marginLeft: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONTS.sm,
    marginTop: SPACING.sm,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
});

export default WeightInputScreen;
