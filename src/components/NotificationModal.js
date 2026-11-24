import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { getData, setData } from '../utils/storage';

const NOTIFICATIONS_STORAGE_KEY = '@user_notifications_history_v2';

const { height } = Dimensions.get('window');

const NOTIFICATIONS_DATA = [
  {
    id: 'notif_smartwatch_today',
    type: 'smartwatch',
    title: '⌚️ Mibro Fit & Strava Sinxronlandi',
    titleRu: '⌚️ Mibro Fit & Strava Синхронизированы',
    titleEn: '⌚️ Mibro Fit & Strava Synced',
    body: "Bugun soat 14:34 da 26:08 davomida mashg'ulot bajarildi. 🔥 195 kkal sarflandi, qorin va qo'l mushaklari faollashdi.",
    bodyRu: "Сегодня в 14:34 выполнена тренировка длительностью 26:08. 🔥 195 ккал сожжено.",
    bodyEn: "Today at 14:34 a 26:08 workout was completed. 🔥 195 kcal burned.",
    timeAgo: 'Bugun 14:34',
    timeAgoRu: 'Сегодня 14:34',
    timeAgoEn: 'Today 14:34',
    icon: 'watch',
    iconColor: '#FC4C02',
    isNew: true,
  },
  {
    id: 'notif_another_activity',
    type: 'kudos',
    title: "🔥 Yangi mashg'ulot yakunlandi",
    titleRu: "🔥 Завершена новая тренировка",
    titleEn: "🔥 New workout completed",
    body: "Ajoyib natija! Kunlik faollik qayd etildi. Statistikangizni hisobotlar bo'limida ko'ring.",
    bodyRu: "Отличный результат! Дневная активность записана. Посмотрите статистику в разделе отчетов.",
    bodyEn: "Great job! Daily activity logged. Check your statistics in the Reports section.",
    timeAgo: 'Bugun 15:00',
    timeAgoRu: 'Сегодня 15:00',
    timeAgoEn: 'Today 15:00',
    icon: 'flame',
    iconColor: '#FF6D00',
    isNew: true,
  },
  {
    id: 'notif_kudos_1',
    type: 'kudos',
    title: '👍 Yangi olqish (Kudos)',
    titleRu: '👍 Новый респект (Kudos)',
    titleEn: '👍 New Kudos received',
    body: "Surayyo Yuldasheva sizning kechki piyoda yurish mashqingizga olqish bildirdi.",
    bodyRu: "Сурайё Юлдашева поаплодировала вашей вечерней прогулке.",
    bodyEn: "Surayyo Yuldasheva gave kudos to your evening walk workout.",
    timeAgo: 'Kecha 20:15',
    timeAgoRu: 'Вчера 20:15',
    timeAgoEn: 'Yesterday 20:15',
    icon: 'thumbs-up',
    iconColor: '#3B82F6',
    isNew: false,
  },
  {
    id: 'notif_member_1',
    type: 'community',
    title: "👥 Klubga qo'shilish so'rovi",
    titleRu: "👥 Запрос на вступление в клуб",
    titleEn: "👥 Club membership request",
    body: "Bunyod G'ulomov DIA AI Sog'lom Ayollar Klubiga qo'shilishni so'radi.",
    bodyRu: "Бунёд Гуломов подал заявку в Женский клуб здоровья DIA AI.",
    bodyEn: "Bunyod Gulomov requested to join DIA AI Healthy Women's Club.",
    timeAgo: '1 kun oldin',
    timeAgoRu: '1 день назад',
    timeAgoEn: '1 day ago',
    icon: 'people',
    iconColor: '#8B5CF6',
    isNew: false,
  },
  {
    id: 'notif_member_2',
    type: 'community',
    title: "👥 Klubga qo'shilish so'rovi",
    titleRu: "👥 Запрос на вступление в клуб",
    titleEn: "👥 Club membership request",
    body: "Farangiza Bobodo'stova DIA AI Sog'lom Ayollar Klubiga qo'shilishni so'radi.",
    bodyRu: "Фарангиза Бободустова подала заявку в Женский клуб здоровья DIA AI.",
    bodyEn: "Farangiza Bobodustova requested to join DIA AI Healthy Women's Club.",
    timeAgo: '2 kun oldin',
    timeAgoRu: '2 дня назад',
    timeAgoEn: '2 days ago',
    icon: 'person-add',
    iconColor: '#8B5CF6',
    isNew: false,
  },
  {
    id: 'notif_way_to_go',
    type: 'kudos',
    title: '👏 Barakalla, Dildora!',
    titleRu: '👏 Молодец, Дильдора!',
    titleEn: '👏 Well done, Dildora!',
    body: "Bugungi barcha qadam va kaloriya maqsadlaringiz muvaffaqiyatli bajarildi!",
    bodyRu: "Все цели по шагам и калориям на сегодня успешно выполнены!",
    bodyEn: "All your step and calorie goals for today have been achieved!",
    timeAgo: '3 kun oldin',
    timeAgoRu: '3 дня назад',
    timeAgoEn: '3 days ago',
    icon: 'trophy',
    iconColor: '#EAB308',
    isNew: false,
  },
  {
    id: 'notif_challenge',
    type: 'challenge',
    title: '🏆 Challenge yakunlandi',
    titleRu: '🏆 Челлендж завершён',
    titleEn: '🏆 Challenge completed',
    body: "Noyabr oyi 400 daqiqalik yugurish va jismoniy faollik rejasi to'liq bajarildi!",
    bodyRu: "План на 400 минут бега и активности за ноябрь полностью выполнен!",
    bodyEn: "The 400-minute running and fitness activity challenge was successfully completed!",
    timeAgo: '4 kun oldin',
    timeAgoRu: '4 дня назад',
    timeAgoEn: '4 days ago',
    icon: 'ribbon',
    iconColor: '#F59E0B',
    isNew: false,
  },
  {
    id: 'notif_meds',
    type: 'health',
    title: '💊 Dorilar Kabineti Eslatmasi',
    titleRu: '💊 Напоминание кабинета лекарств',
    titleEn: '💊 Medication Cabinet Reminder',
    body: "Kundalik retsept bo'yicha dori qabul qilish vaqti keldi.",
    bodyRu: "Время принять лекарство по ежедневному рецепту.",
    bodyEn: "Time to take your scheduled daily prescription medication.",
    timeAgo: 'Bugun 09:00',
    timeAgoRu: 'Сегодня 09:00',
    timeAgoEn: 'Today 09:00',
    icon: 'medical',
    iconColor: '#00E676',
    isNew: false,
  },
];

const NotificationModal = ({ visible, onClose, navigation }) => {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState('all'); // 'all', 'smartwatch', 'health'
  const [notifications, setNotifications] = useState(NOTIFICATIONS_DATA);

  // Load persistent notifications
  useEffect(() => {
    const loadNotifs = async () => {
      try {
        const stored = await getData(NOTIFICATIONS_STORAGE_KEY);
        if (stored) {
          const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setNotifications(parsed);
            return;
          }
        }
        await setData(NOTIFICATIONS_STORAGE_KEY, NOTIFICATIONS_DATA);
        setNotifications(NOTIFICATIONS_DATA);
      } catch (e) {
        setNotifications(NOTIFICATIONS_DATA);
      }
    };
    if (visible) {
      loadNotifs();
    }
  }, [visible]);

  const handleMarkAllRead = async () => {
    const updated = notifications.map(n => ({ ...n, isNew: false }));
    setNotifications(updated);
    await setData(NOTIFICATIONS_STORAGE_KEY, updated);
  };

  const handleItemPress = async (item) => {
    const updated = notifications.map(n => n.id === item.id ? { ...n, isNew: false } : n);
    setNotifications(updated);
    await setData(NOTIFICATIONS_STORAGE_KEY, updated);

    onClose();
    if (item.type === 'smartwatch' || item.type === 'kudos' || item.type === 'challenge') {
      navigation.navigate('Hisobotlar');
    } else if (item.type === 'health') {
      navigation.navigate('Medications');
    }
  };

  const filteredNotifs = notifications.filter(item => {
    if (filter === 'smartwatch') return item.type === 'smartwatch' || item.type === 'kudos' || item.type === 'challenge';
    if (filter === 'health') return item.type === 'health';
    return true;
  });

  const isRu = i18n.language === 'ru';
  const isEn = i18n.language === 'en';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <View style={[styles.container, { backgroundColor: isDark ? '#121418' : '#F9FAFB' }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }]}>
              <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {isRu ? 'Уведомления' : (isEn ? 'Notifications' : 'Bildirishnomalar')}
              </Text>
              <TouchableOpacity onPress={handleMarkAllRead} style={{ padding: 4 }}>
                <Ionicons name="checkmark-done" size={20} color="#00E676" />
              </TouchableOpacity>
            </View>

            {/* Filter Pills */}
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  { backgroundColor: filter === 'all' ? (isDark ? '#2D3037' : '#E5E7EB') : 'transparent' }
                ]}
                onPress={() => setFilter('all')}
              >
                <Text style={[styles.filterText, { color: filter === 'all' ? colors.text : colors.textSecondary }]}>
                  {isRu ? 'Все' : (isEn ? 'All' : 'Barchasi')} ({notifications.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  { backgroundColor: filter === 'smartwatch' ? (isDark ? '#2D3037' : '#E5E7EB') : 'transparent' }
                ]}
                onPress={() => setFilter('smartwatch')}
              >
                <Text style={[styles.filterText, { color: filter === 'smartwatch' ? '#FF6D00' : colors.textSecondary }]}>
                  {isEn ? 'Strava & Watch' : (isRu ? 'Strava & Часы' : 'Strava & Soat')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  { backgroundColor: filter === 'health' ? (isDark ? '#2D3037' : '#E5E7EB') : 'transparent' }
                ]}
                onPress={() => setFilter('health')}
              >
                <Text style={[styles.filterText, { color: filter === 'health' ? '#00E676' : colors.textSecondary }]}>
                  {isRu ? 'Здоровье' : (isEn ? 'Health' : 'Salomatlik')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Notifications List */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
              {filteredNotifs.map((item) => {
                const itemTitle = isEn ? (item.titleEn || item.title) : (isRu ? (item.titleRu || item.title) : item.title);
                const itemBody = isEn ? (item.bodyEn || item.body) : (isRu ? (item.bodyRu || item.body) : item.body);
                const itemTime = isEn ? (item.timeAgoEn || item.timeAgo) : (isRu ? (item.timeAgoRu || item.timeAgo) : item.timeAgo);

                return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.notifCard,
                    {
                      backgroundColor: isDark ? '#1A1D24' : '#FFFFFF',
                      borderColor: item.isNew ? 'rgba(255, 109, 0, 0.4)' : (isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB')
                    }
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleItemPress(item)}
                >
                  <View style={[styles.iconCircle, { backgroundColor: `${item.iconColor}18` }]}>
                    <Ionicons name={item.icon} size={20} color={item.iconColor} />
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.notifCardHeader}>
                      <Text style={[styles.notifTitle, { color: colors.text }]}>{itemTitle}</Text>
                      {item.isNew && (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>{isRu ? 'Новое' : (isEn ? 'New' : 'Yangi')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.notifBody, { color: colors.textSecondary }]} numberOfLines={2}>
                      {itemBody}
                    </Text>
                    <Text style={[styles.notifTime, { color: colors.textSecondary }]}>
                      {itemTime}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

              {filteredNotifs.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="notifications-off-outline" size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {isRu ? 'Нет уведомлений' : (isEn ? 'No notifications' : 'Bildirishnomalar mavjud emas')}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  container: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  newBadge: {
    backgroundColor: '#FF6D00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  notifBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  notifTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default NotificationModal;
