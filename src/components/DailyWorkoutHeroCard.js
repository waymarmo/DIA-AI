import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const WEEKDAYS = [
  { short: 'Mo', dayIndex: 1 },
  { short: 'Tu', dayIndex: 2 },
  { short: 'We', dayIndex: 3 },
  { short: 'Th', dayIndex: 4 },
  { short: 'Fr', dayIndex: 5 },
  { short: 'Sa', dayIndex: 6 },
  { short: 'Su', dayIndex: 0 },
];

/**
 * DailyWorkoutHeroCard - Thenx Style Hero Card
 * Includes Weekday pill bar, status tags, muscle diagram thumbnail, workout title & action.
 */
const DailyWorkoutHeroCard = ({ onStartWorkout, onOpenCalendar }) => {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const todayIndex = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const [completed, setCompleted] = useState(false);
  const [liked, setLiked] = useState(false);

  const isRu = i18n.language === 'ru';
  const isEn = i18n.language === 'en';

  const workoutDetails = {
    title: 'Full Force Burn',
    subtitle: isEn ? 'Mibro Fit & Strava Tailored' : (isRu ? 'Адаптировано под Mibro Fit & Strava' : 'Mibro Fit & Strava Moslashtirilgan'),
    duration: `45-53 ${t('workout.minutes', isEn ? 'min' : (isRu ? 'мин' : 'daq'))}`,
    level: t('workout.forAllLevels', isEn ? 'For all levels' : (isRu ? 'Для всех уровней' : 'Barcha darajalar')),
    calories: isEn ? '420 kcal' : (isRu ? '420 ккал' : '420 kkal'),
    date: new Date().toLocaleDateString(isEn ? 'en-US' : (isRu ? 'ru-RU' : 'uz-UZ'), { month: 'long', day: 'numeric', year: 'numeric' }),
  };

  return (
    <View style={[styles.cardContainer, { backgroundColor: isDark ? '#121418' : '#1a1f2e' }]}>
      <View style={[styles.bgGradient, { borderRadius: 24, overflow: 'hidden' }]}>
        <View style={styles.overlay}>
          {/* Top Header: Title & Calendar button */}
          <View style={styles.topRow}>
            <Text style={styles.sectionHeader}>{t('workout.dailyWorkout')}</Text>
            <TouchableOpacity
              style={styles.calendarBtn}
              onPress={onOpenCalendar}
              activeOpacity={0.8}
            >
              <Text style={styles.calendarText}>{t('workout.calendar')}</Text>
            </TouchableOpacity>
          </View>

          {/* Weekday Selector Bar */}
          <View style={styles.weekdayBar}>
            {WEEKDAYS.map((w) => {
              const isActive = selectedDay === w.dayIndex;
              return (
                <TouchableOpacity
                  key={w.short}
                  style={[styles.weekdayPill, isActive && styles.weekdayPillActive]}
                  onPress={() => setSelectedDay(w.dayIndex)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.weekdayText, isActive && styles.weekdayTextActive]}>
                    {w.short}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Status Badges */}
          <View style={styles.statusRow}>
            <TouchableOpacity
              style={[styles.statusBadge, completed && styles.statusBadgeCompleted]}
              onPress={() => setCompleted(!completed)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={completed ? 'checkmark-circle' : 'hourglass-outline'}
                size={14}
                color={completed ? '#00E676' : '#E5E7EB'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.statusBadgeText, completed && { color: '#00E676' }]}>
                {completed ? t('workout.completed') : t('workout.toBeCompleted')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.likesBadge}
              onPress={() => setLiked(!liked)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={14}
                color={liked ? '#EF4444' : '#E5E7EB'}
                style={{ marginRight: 5 }}
              />
              <Text style={styles.likesText}>{liked ? '13.1k' : '13k'}</Text>
            </TouchableOpacity>
          </View>

          {/* Middle Spacer */}
          <View style={{ height: 35 }} />

          {/* Bottom Card Content: Workout Title & CTA */}
          <View style={styles.bottomContentRow}>
            {/* Workout Icon Badge */}
            <View style={[styles.miniHeatmapWrapper, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 109, 0, 0.15)', borderRadius: 14 }]}>
              <Ionicons name="barbell" size={26} color="#FF6D00" />
            </View>

            {/* Workout Details */}
            <View style={styles.detailsCol}>
              <Text style={styles.workoutTitle}>{workoutDetails.title}</Text>
              <Text style={styles.workoutDate}>{workoutDetails.date}</Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={13} color="#D1D5DB" style={{ marginRight: 4 }} />
                  <Text style={styles.metaText}>{workoutDetails.duration}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="barbell-outline" size={13} color="#D1D5DB" style={{ marginRight: 4 }} />
                  <Text style={styles.metaText}>{workoutDetails.level}</Text>
                </View>
              </View>
            </View>

            {/* Action Round Arrow Button */}
            <TouchableOpacity
              style={styles.actionRoundBtn}
              onPress={onStartWorkout}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 24,
    backgroundColor: '#121418',
    marginVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'hidden',
  },
  bgGradient: {
    width: '100%',
  },
  overlay: {
    backgroundColor: 'rgba(15, 17, 22, 0.88)',
    padding: 18,
    borderRadius: 24,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeader: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  calendarBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  calendarText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '700',
  },
  weekdayBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 30,
    padding: 4,
    marginBottom: 12,
  },
  weekdayPill: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayPillActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  weekdayText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '700',
  },
  weekdayTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeCompleted: {
    borderColor: 'rgba(0, 230, 118, 0.4)',
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
  },
  statusBadgeText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '700',
  },
  likesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  likesText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  miniHeatmapWrapper: {
    marginRight: 10,
  },
  detailsCol: {
    flex: 1,
  },
  workoutTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  workoutDate: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: '#D1D5DB',
    fontSize: 11,
    fontWeight: '600',
  },
  actionRoundBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#262930',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});

export default DailyWorkoutHeroCard;
