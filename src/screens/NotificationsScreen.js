import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import * as Notifications from 'expo-notifications';
import NotificationService, {
  scheduleAllMealNotifications,
  scheduleAllMedicationNotifications,
  MEAL_SCHEDULE,
  MEDICATION_SCHEDULE,
} from '../services/NotificationService';
import { getMeals } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const MED_ENABLED_KEY = '@medication_notifications_enabled';

const NotificationsScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const GREEN = '#00E676';
  const [loading, setLoading] = useState(true);
  const [mealItems, setMealItems] = useState([]);
  const [medItems, setMedItems] = useState([]);
  const [medEnabled, setMedEnabled] = useState(false);
  const [medLoading, setMedLoading] = useState(false);

  const formatTime = (hour, minute) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  const mealMeta = useMemo(() => ({
    breakfast: { icon: 'sunny-outline',       color: '#FFD600' },
    lunch:     { icon: 'restaurant-outline',   color: '#2DD36F' },
    dinner:    { icon: 'moon-outline',         color: '#A78BFA' },
  }), []);

  const medMeta = useMemo(() => ({
    med_morning: { icon: 'medical-outline', color: '#4A9EFF' },
    med_noon:    { icon: 'medical-outline', color: '#A78BFA' },
    med_evening: { icon: 'medical-outline', color: '#00E676' },
  }), []);

  const loadItems = async () => {
    setLoading(true);
    try {
      // Dori bildirishnoma holati
      const medEnabledRaw = await AsyncStorage.getItem(MED_ENABLED_KEY);
      setMedEnabled(medEnabledRaw === 'true');

      const granted = await NotificationService.requestNotificationPermission();
      if (!granted) {
        setMealItems([]);
        setMedItems([]);
        return;
      }

      let scheduled = await Notifications.getAllScheduledNotificationsAsync();

      // ── Ovqat bildirishnomalari ──
      let daily = scheduled.filter((n) => n?.content?.data?.type === 'meal_reminder');
      if (daily.length === 0) {
        await scheduleAllMealNotifications();
        scheduled = await Notifications.getAllScheduledNotificationsAsync();
        daily = scheduled.filter((n) => n?.content?.data?.type === 'meal_reminder');
      }

      const lang = i18n.language || 'uz';

      const normalizedMeals = daily.map((n) => {
        const mealId = n?.content?.data?.mealId;
        const def    = MEAL_SCHEDULE.find((m) => m.id === mealId);
        const hour   = n?.trigger?.hour   ?? def?.hour   ?? 0;
        const minute = n?.trigger?.minute ?? def?.minute ?? 0;
        const meta   = mealMeta[mealId] || { icon: 'notifications-outline', color: '#4A9EFF' };
        const localizedTitle = def
          ? (lang === 'ru' ? def.titleRu : (lang === 'en' ? def.titleEn : def.title))
          : (n?.content?.title || t('notifications.title', 'Bildirishnomalar'));
        const localizedBody = def
          ? (lang === 'ru' ? def.bodyRu : (lang === 'en' ? def.bodyEn : def.body))
          : (n?.content?.body || '');
        return {
          id:          n.identifier,
          mealId,
          icon:        meta.icon,
          color:       meta.color,
          title:       localizedTitle,
          description: localizedBody,
          time:        formatTime(hour, minute),
          type:        'meal',
        };
      }).sort((a, b) => a.time.localeCompare(b.time));

      setMealItems(normalizedMeals);

      // ── Dori bildirishnomalari ──
      if (medEnabledRaw === 'true') {
        let medNotifs = scheduled.filter((n) => n?.content?.data?.type === 'medication_reminder');
        const normalizedMeds = medNotifs.map((n) => {
          const medId = n?.content?.data?.medId;
          const def   = MEDICATION_SCHEDULE.find((m) => m.id === medId);
          const hour  = n?.trigger?.hour   ?? def?.hour   ?? 0;
          const min   = n?.trigger?.minute ?? def?.minute ?? 0;
          const meta  = medMeta[medId] || { icon: 'medical-outline', color: '#4A9EFF' };
          const localizedTitle = def
            ? (lang === 'ru' ? def.titleRu : (lang === 'en' ? def.titleEn : def.title))
            : (n?.content?.title || (lang === 'en' ? '💊 Medication time' : (lang === 'ru' ? '💊 Время лекарств' : '💊 Dori vaqti')));
          const localizedBody = def
            ? (lang === 'ru' ? def.bodyRu : (lang === 'en' ? def.bodyEn : def.body))
            : (n?.content?.body || '');
          return {
            id:          n.identifier,
            medId,
            icon:        meta.icon,
            color:       meta.color,
            title:       localizedTitle,
            description: localizedBody,
            time:        formatTime(hour, min),
            type:        'medication',
          };
        }).sort((a, b) => a.time.localeCompare(b.time));

        // Agar rejalashtilmagan bo'lsa, rejalashtir
        if (normalizedMeds.length === 0) {
          await scheduleAllMedicationNotifications();
          const updated = await Notifications.getAllScheduledNotificationsAsync();
          const newMeds = updated.filter((n) => n?.content?.data?.type === 'medication_reminder');
          setMedItems(newMeds.map((n) => {
            const medId = n?.content?.data?.medId;
            const def   = MEDICATION_SCHEDULE.find((m) => m.id === medId);
            const hour  = n?.trigger?.hour   ?? def?.hour   ?? 0;
            const min   = n?.trigger?.minute ?? def?.minute ?? 0;
            const meta  = medMeta[medId] || { icon: 'medical-outline', color: '#4A9EFF' };
            return {
              id:          n.identifier,
              medId,
              icon:        meta.icon,
              color:       meta.color,
              title:       n?.content?.title || (def ? (lang === 'ru' ? def.titleRu : (lang === 'en' ? def.titleEn : def.title)) : (lang === 'en' ? '💊 Medication' : (lang === 'ru' ? '💊 Лекарство' : '💊 Dori'))),
              description: n?.content?.body  || '',
              time:        formatTime(hour, min),
              type:        'medication',
            };
          }).sort((a, b) => a.time.localeCompare(b.time)));
        } else {
          setMedItems(normalizedMeds);
        }
      } else {
        setMedItems([]);
      }
    } catch (e) {
      console.warn('[NotificationsScreen] loadItems error:', e?.message || e);
      setMealItems([]);
      setMedItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubFocus = navigation?.addListener?.('focus', loadItems);
    loadItems();
    return unsubFocus;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMedNotifications = async (value) => {
    setMedLoading(true);
    try {
      await AsyncStorage.setItem(MED_ENABLED_KEY, value ? 'true' : 'false');
      setMedEnabled(value);
      if (value) {
        await scheduleAllMedicationNotifications();
      } else {
        // Dori bildirishnomalarini bekor qilish
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        const medNotifs = scheduled.filter((n) => n?.content?.data?.type === 'medication_reminder');
        await Promise.all(medNotifs.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
        setMedItems([]);
      }
      await loadItems();
    } catch (e) {
      console.warn('[NotificationsScreen] toggleMedNotifications error:', e?.message);
    } finally {
      setMedLoading(false);
    }
  };

  const renderNotificationItem = (notification) => (
    <View
      key={notification.id}
      style={[
        styles.notificationItem,
        { backgroundColor: colors.cardPremium || (isDark ? '#1e1e1e' : '#fff'), borderColor: colors.borderLight },
      ]}
    >
      <View style={[styles.notificationIcon, { backgroundColor: `${notification.color}20` }]}>
        <Ionicons name={notification.icon} size={22} color={notification.color} />
      </View>
      <View style={styles.notificationContent}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={[styles.notificationTitle, { color: colors.text }]} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={[styles.notificationTime, { color: notification.color }]}>{notification.time}</Text>
        </View>
        <Text style={[styles.notificationDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {notification.description}
        </Text>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={colors.bgGradient || [colors.background, colors.background]} style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.iconBg }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('notifications.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* Notifications List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Ovqat Bo'limi ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="restaurant-outline" size={16} color="#2DD36F" style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('notifications.dailyAiAdvice') || 'OVQAT ESLATMALARI'}
            </Text>
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={GREEN} />
              <Text style={[styles.loadingTxt, { color: colors.textSecondary }]}>
                {t('notifications.loadingAdvice') || 'Yuklanmoqda...'}
              </Text>
            </View>
          ) : mealItems.length > 0 ? (
            mealItems.map(renderNotificationItem)
          ) : (
            <View style={styles.centerBox}>
              <Ionicons name="notifications-off-outline" size={44} color={colors.textSecondary} />
              <Text style={[styles.emptyTxt, { color: colors.textSecondary }]}>
                {t('notifications.disabled') || 'Bildirishnomalar yoqilmagan'}
              </Text>
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: GREEN }]}
                onPress={loadItems}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={18} color="#000" />
                <Text style={styles.retryTxt}>{t('notifications.retry') || 'Qayta urinish'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Dori Bo'limi ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="medical-outline" size={16} color="#4A9EFF" style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {i18n.language === 'en' ? 'MEDICATION REMINDERS' : (i18n.language === 'ru' ? 'НАПОМИНАНИЯ О ЛЕКАРСТВАХ' : 'DORI ESLATMALARI')}
            </Text>
            <View style={{ flex: 1 }} />
            {medLoading ? (
              <ActivityIndicator size="small" color="#4A9EFF" />
            ) : (
              <Switch
                value={medEnabled}
                onValueChange={toggleMedNotifications}
                trackColor={{ false: isDark ? '#444' : '#ccc', true: '#4A9EFF' }}
                thumbColor={medEnabled ? '#fff' : '#f4f3f4'}
              />
            )}
          </View>

          {!medEnabled ? (
            <View style={[styles.medDisabledBox, { backgroundColor: isDark ? '#1a2a3a' : '#EAF4FF', borderColor: '#4A9EFF30' }]}>
              <Ionicons name="medical-outline" size={28} color="#4A9EFF" />
              <Text style={[styles.medDisabledTxt, { color: colors.textSecondary }]}>
                {i18n.language === 'en'
                  ? 'Switch the toggle above to enable medication reminders.\nYou will receive 3 alerts a day: 08:00, 13:00, 21:00'
                  : (i18n.language === 'ru'
                    ? 'Включите переключатель, чтобы получать напоминания о приёме лекарств.\nУведомления приходят 3 раза в день: 08:00, 13:00, 21:00'
                    : 'Dori vaqti eslatmalarini yoqish uchun tugmani bosing.\nKuniga 3 marta eslatma keladi: 08:00, 13:00, 21:00')}
              </Text>
            </View>
          ) : loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color="#4A9EFF" />
            </View>
          ) : medItems.length > 0 ? (
            medItems.map(renderNotificationItem)
          ) : (
            <View style={styles.centerBox}>
              <ActivityIndicator color="#4A9EFF" />
              <Text style={[styles.loadingTxt, { color: colors.textSecondary }]}>
                {i18n.language === 'en' ? 'Scheduling...' : (i18n.language === 'ru' ? 'Планируется...' : 'Rejalashtirilmoqda...')}
              </Text>
            </View>
          )}
        </View>

        {/* ── Info Box ── */}
        <View style={[styles.infoBox, { backgroundColor: isDark ? '#0f2a1a' : '#F0FFF4', borderColor: `${GREEN}30` }]}>
          <Ionicons name="information-circle-outline" size={20} color={GREEN} />
          <Text style={[styles.infoTxt, { color: colors.textSecondary }]}>
            {i18n.language === 'en'
              ? 'Notifications are sent automatically at meal and medication times. Please enable notification permissions in device settings.'
              : (i18n.language === 'ru'
                ? 'Уведомления приходят автоматически во время еды и приёма лекарств. Разрешите уведомления в настройках.'
                : 'Bildirishnomalar kundalik ovqat va dori vaqtlarida avtomatik yuboriladi. Sozlamalardan bildirishnoma ruxsatini bering.')}
          </Text>
        </View>

      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40, height: 40,
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  section: { marginBottom: 28 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  notificationItem: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  notificationIcon: {
    width: 46, height: 46,
    borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  notificationDescription: { fontSize: 12, lineHeight: 17 },
  notificationTime: { fontSize: 13, fontWeight: '800' },

  centerBox: { paddingVertical: 20, alignItems: 'center' },
  loadingTxt: { marginTop: 8, fontWeight: '600', fontSize: 13 },
  emptyTxt: { marginTop: 10, fontWeight: '700', textAlign: 'center' },

  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  retryTxt: { fontWeight: '800', color: '#000' },

  medDisabledBox: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  medDisabledTxt: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },

  infoBox: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
  },
  infoTxt: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});



export default NotificationsScreen;
