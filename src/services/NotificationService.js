/**
 * NotificationService.js
 * Kunlik ovqat eslatmalari uchun push notification xizmati.
 * Android 8+ uchun Notification Channel, iOS uchun ruxsat, ovoz va badge.
 * Mahalliy vaqt (trigger.hour/minute) asosida kunlik schedule.
 */
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import recipesData from '../data/recipes.json';
import DiaAIService from './DiaAIService';
import i18n from '../i18n';

const PROJECT_ID = Constants?.expoConfig?.extra?.eas?.projectId || '377a5f64-6964-4ecc-8ac1-768311984007';
const isExpoGo = Constants.appOwnership === 'expo';

// ─── Smart Advice Helper ──────────────────────────────────────────────────────
const getSmartMealAdvice = (mealId) => {
  let category = 'all';
  if (mealId === 'breakfast') category = 'nonushta';
  if (mealId === 'lunch')     category = 'tushlik';
  if (mealId === 'dinner')    category = 'kechki_ovqat';

  const relevant = recipesData.filter(r => r.category === category);
  if (relevant.length === 0) return null;

  const random = relevant[Math.floor(Math.random() * relevant.length)];
  const lang = i18n?.language || 'uz';
  const title = lang === 'ru' ? (random.titleRu || random.title) : (lang === 'en' ? (random.titleEn || random.title) : random.title);

  let titleText = '';
  let bodyText = '';

  if (lang === 'ru') {
    titleText = random.category === 'nonushta' ? `🌅 Завтрак: ${title}` : 
                random.category === 'tushlik' ? `☀️ Обед: ${title}` : `🌙 Ужин: ${title}`;
    bodyText = `Рекомендуем вам блюдо "${title}" (${random.calories} ккал). Это отлично впишется в ваш план!`;
  } else if (lang === 'en') {
    titleText = random.category === 'nonushta' ? `🌅 Breakfast: ${title}` : 
                random.category === 'tushlik' ? `☀️ Lunch: ${title}` : `🌙 Dinner: ${title}`;
    bodyText = `We recommend the dish "${title}" (${random.calories} kcal). It fits your plan perfectly!`;
  } else {
    titleText = random.category === 'nonushta' ? `🌅 Nonushta: ${title}` : 
                random.category === 'tushlik' ? `☀️ Tushlik: ${title}` : `🌙 Kechki ovqat: ${title}`;
    bodyText = `Sizga "${title}" taomiga tavsiya beramiz (${random.calories} kkal). Buni sinab ko'rsangiz rejangizga juda mos tushadi!`;
  }

  return {
    title: titleText,
    body: bodyText
  };
};

// Foreground da ham ko'rsatish
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

export const getNotificationCapabilities = () => ({
  isExpoGo,
  supportsRemotePush: !isExpoGo,
  supportsLocalScheduling: true,
});

// ─── Android Notification Channel ────────────────────────────────────────────
export const setupAndroidChannel = async () => {
  // Expo Go da SDK 53+ dan boshlab notification channel lar Expo Go ichida cheklangan (NPE xatolik bermasligi uchun)
  if (Platform.OS !== 'android' || isExpoGo) return;
  try {
    await Notifications.setNotificationChannelAsync('meal-reminders', {
      name:            'Ovqat Eslatmalari',
      description:     'Ertalab, tushda va kechga ovqat eslatmalari',
      importance:      Notifications.AndroidImportance.HIGH,
      vibrationPattern:[0, 250, 250, 250],
      lightColor:      '#00E676',
      enableVibrate:   true,
      showBadge:       true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch (err) {
    console.warn('[Notification] meal-reminders channel:', err?.message);
  }

  try {
    await Notifications.setNotificationChannelAsync('medication-reminders', {
      name:            'Dori Eslatmalari',
      description:     'Kunlik dori qabul qilish eslatmalari',
      importance:      Notifications.AndroidImportance.HIGH,
      vibrationPattern:[0, 300, 200, 300],
      lightColor:      '#4A9EFF',
      enableVibrate:   true,
      showBadge:       true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch (err) {
    console.warn('[Notification] medication-reminders channel:', err?.message);
  }

  try {
    await Notifications.setNotificationChannelAsync('exercise-reminders', {
      name: 'Mashq Eslatmalari',
      description: 'Kunlik jismoniy mashq eslatmalari',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#00E676',
      enableVibrate: true,
      showBadge: false,
    });
  } catch (err) {
    console.warn('[Notification] exercise-reminders channel:', err?.message);
  }
};

// ─── Ovqat vaqtlari (mahalliy soat) ─────────────────────────────────────────
export const MEAL_SCHEDULE = [
  {
    id:     'breakfast',
    label:  'Ertalab ovqat',
    hour:   7,
    minute: 0,
    title:  '🌅 Ertalab nonushta vaqti!',
    titleRu: '🌅 Время завтрака!',
    titleEn: '🌅 Breakfast time!',
    body:   'Bugungi nonushta uchun Dia AI maslahati tayyor. Sog\'lom ovqatlanish bilan kunni boshlang!',
    bodyRu:  'Совет от Dia AI на завтрак готов. Начните день со здорового питания!',
    bodyEn:  'Dia AI advice for breakfast is ready. Start your day with healthy eating!',
  },
  {
    id:     'lunch',
    label:  'Tushlik ovqat',
    hour:   12,
    minute: 0,
    title:  '☀️ Tushlik vaqti keldi!',
    titleRu: '☀️ Время обеда пришло!',
    titleEn: '☀️ Lunch time is here!',
    body:   'Bugun tushga nima yedingiz? Qand darajangizni o\'lchashni unutmang!',
    bodyRu:  'Что вы ели на обед? Не забудьте измерить уровень сахара!',
    bodyEn:  'What did you eat for lunch? Don\'t forget to measure your sugar level!',
  },
  {
    id:     'dinner',
    label:  'Kechki ovqat',
    hour:   19,
    minute: 0,
    title:  '🌙 Kechki ovqat eslatmasi!',
    titleRu: '🌙 Напоминание об ужине!',
    titleEn: '🌙 Dinner reminder!',
    body:   'Kechga yengil va sog\'lom ovqat tanlang. Dia AI yordam beradi!',
    bodyRu:  'Выберите легкую и здоровую пищу на ужин. Dia AI поможет!',
    bodyEn:  'Choose a light and healthy meal for dinner. Dia AI will help!',
  },
];

// ─── Dori vaqtlari ──────────────────────────────────────────────────────────
export const MEDICATION_SCHEDULE = [
  {
    id:      'med_morning',
    label:   'Ertalabki dori',
    hour:    8,
    minute:  0,
    icon:    'medical-outline',
    color:   '#4A9EFF',
    title:   '💊 Ertalabki dori vaqti!',
    titleRu: '💊 Время утренних таблеток!',
    titleEn: '💊 Morning medication time!',
    body:    'Ertalabki dorilaringizni iching. Sog\'lig\'ingiz uchun muntazamlik muhim!',
    bodyRu:  'Примите утренние таблетки. Регулярность важна для вашего здоровья!',
    bodyEn:  'Take your morning medications. Regularity is key to your health!',
  },
  {
    id:      'med_noon',
    label:   'Kunduzgi dori',
    hour:    13,
    minute:  0,
    icon:    'medical-outline',
    color:   '#A78BFA',
    title:   '💊 Kunduzgi dori vaqti!',
    titleRu: '💊 Время дневных таблеток!',
    titleEn: '💊 Afternoon medication time!',
    body:    'Kunduzgi dorilaringizni iching. Ovqatdan keyin ichishni unutmang!',
    bodyRu:  'Примите дневные таблетки. Не забудьте принять после еды!',
    bodyEn:  'Take your afternoon medications. Remember to take them after meals!',
  },
  {
    id:      'med_evening',
    label:   'Kechki dori',
    hour:    21,
    minute:  0,
    icon:    'medical-outline',
    color:   '#00E676',
    title:   '💊 Kechki dori vaqti!',
    titleRu: '💊 Время вечерних таблеток!',
    titleEn: '💊 Evening medication time!',
    body:    'Kechki dorilaringizni iching. Uxlashdan oldin dorilar haqida g\'amxo\'rlik qiling!',
    bodyRu:  'Примите вечерние таблетки. Позаботьтесь о лекарствах перед сном!',
    bodyEn:  'Take your evening medications. Take care of your meds before sleep!',
  },
];

const STORAGE_KEY = '@notification_scheduled';
const DAILY_ADVICE_CACHE_PREFIX = '@daily_ai_advice_v2';
let scheduleDailyInFlight = null;

const getLocalISODate = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeAdviceKeyPart = (value) => {
  if (value == null) return 'na';
  return String(value).trim().toLowerCase().replace(/\s+/g, '_').slice(0, 40) || 'na';
};

const buildAdviceCacheKey = ({ dateISO, activityLevelLabel, latestSugarBucket } = {}) => {
  const datePart = dateISO || getLocalISODate();
  const a = normalizeAdviceKeyPart(activityLevelLabel);
  const g = normalizeAdviceKeyPart(latestSugarBucket);
  return `${DAILY_ADVICE_CACHE_PREFIX}:${datePart}:${a}:${g}`;
};

const extractJsonObject = (text) => {
  if (!text) return null;
  const clean = String(text).replace(/```json/g, '').replace(/```/g, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
};

const generateDailyAiAdvice = async (language = 'uz', contextLine = '') => {
  const isEn = language === 'en';
  const isRu = language === 'ru';
  const prompt = isEn
    ? `Provide a daily nutritional plan for type 2 diabetes that is inspiring, healthy, and tailored.
${contextLine ? `User vitals: ${contextLine}` : ''}
Return ONLY valid JSON in format: {"breakfast":"...","lunch":"...","dinner":"..."}.
Each meal advice must be 1-2 sentences written strictly in English.`
    : (isRu
      ? `Дайте вдохновляющий и практичный план питания на день при сахарном диабете 2-го типа.
${contextLine ? `Данные пользователя: ${contextLine}` : ''}
Верните ТОЛЬКО валидный JSON: {"breakfast":"...","lunch":"...","dinner":"..."}.
Каждая рекомендация должна состоять из 1-2 предложений строго на русском языке.`
      : `Bugungi kun uchun 2-toifa diabetga mos ovqatlanish bo'yicha qisqa, lekin HIKOYAVIY va ILHOMLANTIRUVCHI tavsiya ber. 
Iltimos, har safar har xil, o'ziga xos tarzda gapir. Avvalgi tavsiyalarni takrorlama.
${contextLine ? `Foydalanuvchi ma'lumotlari: ${contextLine}` : ''}
Faqat quyidagi JSON formatda qaytar: {"breakfast":"...","lunch":"...","dinner":"..."}.
Har bir qiymat 2-3 gapdan iborat bo'lsin. (Faqat matn yozing, ichma-ich JSON object ishlatmang!).`);

  const aiResponse = await DiaAIService.generateResponse(prompt, null, language, { maxOutputTokens: 600, temperature: 0.85, topP: 0.98, jsonMode: true });
  const json = extractJsonObject(aiResponse);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    
    // Yordamchi funksiya: agar AI string o'rniga object qaytarsa, ichidan matnni ajratib olamiz
    const safeString = (val) => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (typeof val === 'object') return val.text || val.description || val.body || val.message || Object.values(val).join(' ');
      return String(val);
    };

    return {
      breakfast: safeString(parsed.breakfast),
      lunch: safeString(parsed.lunch),
      dinner: safeString(parsed.dinner),
    };
  } catch {
    return null;
  }
};

export const getDailyAiAdviceCached = async ({
  language = 'uz',
  activityLevelLabel,
  latestSugar,
} = {}) => {
  const dateISO = getLocalISODate();
  const sugarNum = Number.parseFloat(latestSugar);
  const latestSugarBucket = Number.isFinite(sugarNum)
    ? (sugarNum < 70 ? 'low' : sugarNum > 180 ? 'high' : 'normal')
    : 'unknown';

  const cacheKey = buildAdviceCacheKey({ dateISO, activityLevelLabel, latestSugarBucket });
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.advice?.breakfast || parsed?.advice?.lunch || parsed?.advice?.dinner) {
        return parsed.advice;
      }
    }
  } catch {}

  const contextLine = [
    activityLevelLabel ? `faollik: ${activityLevelLabel}` : null,
    Number.isFinite(sugarNum) ? `glyukoza: ${sugarNum} mg/dL (${latestSugarBucket})` : null,
  ].filter(Boolean).join(', ');

  const advice = await generateDailyAiAdvice(language, contextLine);
  if (!advice) return null;

  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify({
      dateISO,
      activityLevelLabel: activityLevelLabel || null,
      latestSugarBucket,
      advice,
      cachedAt: new Date().toISOString(),
    }));
  } catch {}

  return advice;
};

const cancelDailyMealRemindersOnly = async () => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const daily = scheduled.filter((n) => n?.content?.data?.type === 'meal_reminder');
    await Promise.all(daily.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  } catch (e) {
    console.warn('[Notification] Failed to cancel daily meal reminders only:', e?.message || e);
  }
};

// ─── Ruxsat so'rash ──────────────────────────────────────────────────────────
export const requestNotificationPermission = async () => {
  try {
    if (isExpoGo) {
      console.log('[Notification] Expo Go detected: remote push is unavailable, local notifications remain supported.');
    }

    // Android channel avval tuzilsin
    await setupAndroidChannel();
    
    if (Platform.OS === 'android' && !Device.isDevice) {
      // Emulator/Simulator detection
      console.log('[Notification] Running on emulator - remote push will fail, but local triggers are supported.');
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert:       true,
        allowBadge:       true,
        allowSound:       true,
        allowProvisional: false,
      },
    });
    console.log('[Notification] permission status:', status);
    return status === 'granted';
  } catch (error) {
    console.error('[Notification] Permission error:', error);
    return false;
  }
};

// ─── Barcha kunlik bildirishnomalarni rejalashtirish ────────────────────────
export const scheduleAllMealNotifications = async () => {
  if (scheduleDailyInFlight) return scheduleDailyInFlight;
  scheduleDailyInFlight = (async () => {
  // Faqat daily meal reminderlarni bekor qilamiz (custom reminderlar saqlansin)
  await cancelDailyMealRemindersOnly();

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  const lang = i18n?.language || 'uz';
  // Cache-backed: avoid re-calling AI repeatedly in the same day
  const aiAdvice = await getDailyAiAdviceCached({ language: lang });
  const scheduled = [];

  for (const meal of MEAL_SCHEDULE) {
    const smart = getSmartMealAdvice(meal.id);
    const aiBody =
      meal.id === 'breakfast' ? aiAdvice?.breakfast :
      meal.id === 'lunch' ? aiAdvice?.lunch :
      meal.id === 'dinner' ? aiAdvice?.dinner :
      null;

    const fallbackTitle = lang === 'ru' ? meal.titleRu : (lang === 'en' ? meal.titleEn : meal.title);
    const fallbackBody = lang === 'ru' ? meal.bodyRu : (lang === 'en' ? meal.bodyEn : meal.body);

    const title = smart ? smart.title : fallbackTitle;
    const body  = aiBody || (smart ? smart.body : fallbackBody);

    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound:     true,
        badge:     1,
        // Android Channel
        ...(Platform.OS === 'android' && { channelId: 'meal-reminders' }),
        data: {
          mealId:     meal.id,
          navigateTo: 'DiaAI',
          type:       'meal_reminder',
        },
      },
      trigger: {
        type:    'daily',
        hour:    meal.hour,
        minute:  meal.minute,
        // expo-notifications daily trigger mahalliy vaqtni ishlatadi
        ...(Platform.OS === 'android' && { channelId: 'meal-reminders' }),
      },
    });
    scheduled.push({
      notifId,
      mealId: meal.id,
      hour:   meal.hour,
      minute: meal.minute,
    });
  }

  console.log('[Notification] Scheduled daily meal reminders:', scheduled.map(s => `${s.mealId}@${String(s.hour).padStart(2,'0')}:${String(s.minute).padStart(2,'0')}`));

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
    scheduled,
    enabledAt: new Date().toISOString(),
  }));
  return true;
  })();

  try {
    return await scheduleDailyInFlight;
  } finally {
    scheduleDailyInFlight = null;
  }
};

// ─── Test: 5 soniyada bildirishnoma ─────────────────────────────────────────
export const sendTestNotification = async () => {
  const granted = await requestNotificationPermission();
  if (!granted) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✅ Dia AI — Bildirishnomalar ulandi!',
      body:  'Kunlik eslatmalar yoqildi: 08:00, 12:00 va 18:30 da xabar keladi.',
      sound: true,
      badge: 1,
      ...(Platform.OS === 'android' && { channelId: 'meal-reminders' }),
      data:  { navigateTo: 'DiaAI', type: 'test' },
    },
    trigger: {
      type:    'timeInterval',
      seconds: 5,
      repeats: false,
    },
  });
};

// ─── Maxsus vaqt uchun taom eslatmasi ────────────────────────────────────────
export const scheduleCustomMealNotification = async (title, body, targetDate, mealId) => {
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  const notifId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      badge: 1,
      ...(Platform.OS === 'android' && { channelId: 'meal-reminders' }),
      data: { mealId, navigateTo: 'Dashboard', type: 'custom_meal_reminder' },
    },
    trigger: {
      type: 'date',
      date: targetDate, // aynan shu vaqtda
      ...(Platform.OS === 'android' && { channelId: 'meal-reminders' }),
    },
  });
  return notifId;
};

// ─── Barcha dori bildirishnomalarni rejalashtirish ──────────────────────────────
export const scheduleAllMedicationNotifications = async () => {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  // Eski dori bildirishnomalarini o'chirish
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const medNotifs = scheduled.filter((n) => n?.content?.data?.type === 'medication_reminder');
    await Promise.all(medNotifs.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  } catch (e) {
    console.warn('[Notification] Failed to cancel medication reminders:', e?.message);
  }

  const lang = i18n?.language || 'uz';
  const scheduledMeds = [];

  for (const med of MEDICATION_SCHEDULE) {
    const title = lang === 'ru' ? med.titleRu : (lang === 'en' ? med.titleEn : med.title);
    const body  = lang === 'ru' ? med.bodyRu  : (lang === 'en' ? med.bodyEn  : med.body);

    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        badge: 1,
        ...(Platform.OS === 'android' && { channelId: 'medication-reminders' }),
        data: {
          medId:      med.id,
          navigateTo: 'Notifications',
          type:       'medication_reminder',
        },
      },
      trigger: {
        type:   'daily',
        hour:   med.hour,
        minute: med.minute,
        ...(Platform.OS === 'android' && { channelId: 'medication-reminders' }),
      },
    });
    scheduledMeds.push({ notifId, medId: med.id, hour: med.hour, minute: med.minute });
  }

  console.log('[Notification] Scheduled medication reminders:', scheduledMeds.map(s => `${s.medId}@${String(s.hour).padStart(2,'0')}:${String(s.minute).padStart(2,'0')}`));
  return true;
};

// ─── Barcha dori bildirishnomalarini bekor qilish ──────────────────────────
export const cancelMedicationNotifications = async () => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const medNotifs = scheduled.filter((n) => n?.content?.data?.type === 'medication_reminder');
    await Promise.all(medNotifs.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  } catch (e) {
    console.warn('[Notification] cancelMedicationNotifications error:', e?.message);
  }
};

// ─── Barcha bildirishnomalarni bekor qilish ──────────────────────────────────
export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(STORAGE_KEY);
};

// ─── Jadval ma'lumoti ────────────────────────────────────────────────────────
export const getScheduledInfo = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
};

// ─── Mashq Eslatmasi ─────────────────────────────────────────────────────────
export const scheduleExerciseReminder = async (diseaseName = 'Diabet') => {
  try {
    const { getDiseaseConfig } = require('../utils/diseaseConfig');
    const config = getDiseaseConfig(diseaseName);
    const exercises = config?.exercises || [];
    if (exercises.length === 0) return;

    // Cancel existing exercise reminders
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.identifier?.startsWith('exercise-reminder-')) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }

    const lang = i18n?.language || 'uz';
    const firstEx = exercises[0];
    const exTitle = lang === 'ru' ? (firstEx.titleRu || firstEx.title) : (lang === 'en' ? (firstEx.titleEn || firstEx.title) : firstEx.title);

    const title = lang === 'ru' ? '🏃 Время тренировки!' : (lang === 'en' ? '🏃 Exercise Time!' : '🏃 Mashq vaqti!');
    const body = lang === 'ru' ? `Сегодня попробуйте: ${exTitle} (${firstEx.duration} мин)` :
                 lang === 'en' ? `Try today: ${exTitle} (${firstEx.duration} min)` :
                 `Bugungi mashq: ${exTitle} (${firstEx.duration} daq)`;

    await Notifications.scheduleNotificationAsync({
      identifier: 'exercise-reminder-daily',
      content: { title, body, sound: 'default' },
      trigger: { hour: 17, minute: 0, repeats: true, type: 'daily' },
    });

    console.log('[NotificationService] Exercise reminder scheduled for', diseaseName);
  } catch (err) {
    console.warn('[NotificationService] scheduleExerciseReminder error:', err.message);
  }
};

export default {
  getNotificationCapabilities,
  requestNotificationPermission,
  scheduleAllMealNotifications,
  scheduleAllMedicationNotifications,
  cancelMedicationNotifications,
  scheduleCustomMealNotification,
  sendTestNotification,
  cancelAllNotifications,
  getScheduledInfo,
  setupAndroidChannel,
  scheduleExerciseReminder,
  MEAL_SCHEDULE,
  MEDICATION_SCHEDULE,
};

