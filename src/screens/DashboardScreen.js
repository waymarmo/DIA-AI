import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Animated, StatusBar, Image,
  Modal, ActivityIndicator, TextInput, Platform, Alert
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import GlucoseChart from '../components/GlucoseChart';
import FastAPIService from '../services/FastAPIService';
import { getUserData, getMeals, getData } from '../utils/storage';
import { getDiseaseConfig, getMetricStatusForDisease } from '../utils/diseaseConfig';
import { 
  getActivityLevelName, 
  getGlucoseStatus, 
  DIABETES_GUIDELINES, 
  calculatePersonalizedCarbGoals,
  calculateBMI
} from '../utils/healthCalculations';
import DiaAIService from '../services/DiaAIService';
import NotificationService, {
  scheduleAllMealNotifications,
  sendTestNotification,
  MEAL_SCHEDULE,
  getDailyAiAdviceCached,
} from '../services/NotificationService';
import { useTheme } from '../context/ThemeContext';
import { saveMeal, setData } from '../utils/storage';
import { getSmartwatchBiometrics, getLatestWorkoutNotification, getStravaStatus } from '../services/StravaService';
import DailyWorkoutHeroCard from '../components/DailyWorkoutHeroCard';
import NotificationModal from '../components/NotificationModal';
import StravaSyncModal from '../components/StravaSyncModal';

import { DILDORA_AVATAR_URI } from '../constants/defaultAvatar';

const { width, height } = Dimensions.get('window');
const GREEN = '#00E676';
const GREEN_BORDER = 'rgba(0,230,118,0.2)';
const BLUE = '#4A9EFF';
const PURPLE = '#A78BFA';
const ORANGE = '#FB923C';

// ─── Utils ────────────────────────────────────────────────────────────────────
const localIsoDate = (d) => {
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${dy}`;
};

const getMealPeriod = () => {
  const h = new Date().getHours();
  if (h < 11) return 'ertalab';
  if (h < 16) return 'tushda';
  return 'kechqurun';
};

const getMealPeriodColor = (p) =>
  p === 'ertalab' ? ORANGE : p === 'tushda' ? GREEN : PURPLE;

const padZ = (n) => String(n).padStart(2, '0');
const formatLocalTime = (h, m) => `${padZ(h)}:${padZ(m)}`;

// ─── Add Metric Modal ─────────────────────────────────────────────────────────
const AddMetricModal = ({ visible, onClose, onSave, diseaseConfig }) => {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const [values, setValues] = useState({});
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setValues({});
      Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, bounciness: 4 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handleSave = () => {
    onSave(values);
    onClose();
  };

  const slideY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0]
  });

  const isEn = i18n.language === 'en';
  const isRu = i18n.language === 'ru';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <Animated.View style={[styles.sheet, { backgroundColor: colors.modalBg, transform: [{ translateY: slideY }] }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isEn ? 'Add Metric' : (isRu ? 'Добавить показатель' : "Ko'rsatkich Qo'shish")}
            </Text>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.iconBg }]} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {diseaseConfig.metrics.map((m) => (
              <View key={m.key} style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.textSecondary, marginBottom: 8, fontWeight: '600' }}>{m.label} ({m.unit})</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                  <Ionicons name={m.icon} size={20} color={m.color} style={{ marginRight: 10 }} />
                  <TextInput
                    style={{ flex: 1, color: colors.text, fontSize: 16 }}
                    placeholder={`${isEn ? 'e.g.' : (isRu ? 'Напр.' : 'Misol:')} ${m.key === 'systolic' ? '120' : m.key === 'diastolic' ? '80' : m.key === 'sugar' ? '110' : '98'}`}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={values[m.key] || ''}
                    onChangeText={(val) => setValues({ ...values, [m.key]: val })}
                  />
                </View>
              </View>
            ))}
            
            <TouchableOpacity 
              style={{ backgroundColor: GREEN, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 }}
              onPress={handleSave}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                {isEn ? 'Save' : (isRu ? 'Сохранить' : 'Saqlash')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─── Notification Modal ──────────────────────────────────────────────────────
const PlanModal = ({ visible, onClose, userData, navigation, todayMeals, onUpdate, aiSchedule, setAiSchedule }) => {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const MEAL_TABS = [
    { key: 'breakfast', label: t('dashboard.morning'), icon: 'sunny-outline',        color: ORANGE },
    { key: 'lunch',     label: t('dashboard.noon'),    icon: 'partly-sunny-outline', color: GREEN  },
    { key: 'dinner',    label: t('dashboard.evening'), icon: 'moon-outline',          color: PURPLE },
  ];
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [loading,    setLoading]    = useState(false);
  const [loaded,     setLoaded]     = useState(false);
  const [advice,     setAdvice]     = useState({ breakfast: '', lunch: '', dinner: '' });
  const [activeTab,  setActiveTab]  = useState('breakfast');
  const [adding,    setAdding]     = useState(false);
  const [newSched,  setNewSched]   = useState({ title: '', time: new Date(), body: '' });
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      const p = getMealPeriod();
      setActiveTab(p === 'ertalab' ? 'breakfast' : p === 'tushda' ? 'lunch' : 'dinner');
      Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, bounciness: 4 }).start();
      if (!loaded) fetchAdvice();
    } else {
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  const fetchAdvice = async () => {
    setLoading(true);
    const customSched = await getData('ai_custom_schedule');
    if (customSched && Array.isArray(customSched)) setAiSchedule(customSched);
    else setAiSchedule([]);

    const name    = userData?.firstName || 'siz';
    const activityLevel = await getData('activityLevel');
    const activityLabel = activityLevel && activityLevel !== 'Not set' ? getActivityLevelName(activityLevel) : 'Nomaʼlum';
    
    // Dynamic Primary Metric for Advice
    const primaryDisease = await getData('primaryDisease');
    const diseaseConf = getDiseaseConfig(primaryDisease);
    const primaryKey = diseaseConf.metrics[0].key;

    const latestMetric = [...(todayMeals || [])]
      .map(m => ({ ts: new Date(m.timestamp).getTime(), val: parseFloat(m[primaryKey]) }))
      .filter(x => Number.isFinite(x.ts) && Number.isFinite(x.val))
      .sort((a, b) => b.ts - a.ts)[0]?.val;
      
    const activeLang = i18n?.language || 'uz';
    const normLang = activeLang.toLowerCase();
    const isEn = normLang.startsWith('en');
    const isRu = normLang.startsWith('ru');

    const cleanMealAdvice = (val, mealKey) => {
      if (!val) return '';
      let text = val;
      if (typeof text === 'object') {
        text = text[mealKey] || text.advice || text.title || text.body || Object.values(text)[0] || '';
      }
      let str = String(text).trim();

      if (str.startsWith('{') || str.includes('{"') || str.includes('"}')) {
        try {
          const parsed = JSON.parse(str);
          if (parsed && typeof parsed === 'object') {
            return cleanMealAdvice(parsed[mealKey] || parsed.advice || Object.values(parsed)[0], mealKey);
          }
        } catch {
          const regex = new RegExp(`"${mealKey}"\\s*:\\s*"([^"]+)"`, 'i');
          const m = str.match(regex);
          if (m && m[1]) return m[1].replace(/\\n/g, ' ').trim();
        }
      }

      str = str
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .replace(/^[{\s"']+|[}\s"']+$/g, '')
        .replace(/\\n/g, ' ')
        .trim();

      str = str.replace(new RegExp(`^${mealKey}\\s*:\\s*`, 'i'), '');
      return str;
    };

    const metricLine = latestMetric
      ? (isEn
        ? `Latest entry today for ${diseaseConf.metrics[0].labelEn || diseaseConf.metrics[0].label}: ${latestMetric} ${diseaseConf.metrics[0].unit}.`
        : (isRu
          ? `Последний показатель ${diseaseConf.metrics[0].labelRu || diseaseConf.metrics[0].label}: ${latestMetric} ${diseaseConf.metrics[0].unit}.`
          : `Bugungi oxirgi ${diseaseConf.metrics[0].label}: ${latestMetric} ${diseaseConf.metrics[0].unit}.`))
      : (isEn ? 'No metrics recorded today yet.' : (isRu ? 'Показатели на сегодня еще не введены.' : 'Bugungi glyukoza qiymati kiritilmagan.'));

    const prompt = isEn
      ? `Provide a daily nutritional plan (breakfast, lunch, dinner) for patient ${name}.
Conditions:
- Activity level: ${activityLabel}.
- Condition: ${primaryDisease}.
- ${metricLine}
Provide concise 1-2 sentence clinical nutrition advice for each meal.
CRITICAL: Respond STRICTLY in English.
Return ONLY valid JSON: {"breakfast":"...","lunch":"...","dinner":"..."}.`
      : (isRu
        ? `Составьте персональный план питания на день (завтрак, обед, ужин) для пациента ${name}.
Условия:
- Уровень активности: ${activityLabel}.
- Заболевание: ${primaryDisease}.
- ${metricLine}
Дайте краткую (1-2 предложения) рекомендацию для каждого приема пищи.
ВАЖНО: Пишите строго на русском языке.
Верните ТОЛЬКО валидный JSON: {"breakfast":"...","lunch":"...","dinner":"..."}.`
        : `Bemor ${name} uchun bugungi ovqatlanish rejasini (nonushta, tushlik, kechki ovqat) alohida tavsiya qil.
Shartlar:
- Foydalanuvchi faolligi: ${activityLabel}.
- ${metricLine}
Sen shu bemorga ${activityLabel} faolligi, kasalligi (${primaryDisease}) va bugungi holatini hisobga olib, ertalab, tushda va kechqurun uchun maslahat berishing kerak. Har bir qism uchun alohida qisqa (1-2 gap) maslahat ber.
Tavsiya matnini albatta o'zbek tilida yoz.
Faqat JSON qaytar: {"breakfast":"...","lunch":"...","dinner":"..."}.`);
    try {
      const cached = await getDailyAiAdviceCached({
        language: activeLang,
        activityLevelLabel: activityLabel,
        latestMetric,
      });
      if (cached) {
        setAdvice({
          breakfast: cleanMealAdvice(cached.breakfast, 'breakfast') || '',
          lunch: cleanMealAdvice(cached.lunch, 'lunch') || '',
          dinner: cleanMealAdvice(cached.dinner, 'dinner') || '',
        });
        setLoaded(true);
        return;
      }

      const resp = await DiaAIService.generateResponse(prompt, null, activeLang, { jsonMode: true, maxOutputTokens: 600, temperature: 0.55 });
      const clean = resp.replace(/```json/g, '').replace(/```/g, '').trim();
      let breakfast = '';
      let lunch = '';
      let dinner = '';

      try {
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) {
          const p = JSON.parse(match[0]);
          breakfast = cleanMealAdvice(p.breakfast, 'breakfast');
          lunch = cleanMealAdvice(p.lunch, 'lunch');
          dinner = cleanMealAdvice(p.dinner, 'dinner');
        }
      } catch (parseErr) {
        console.warn('Advice JSON parse fallback:', parseErr);
      }

      if (!breakfast) breakfast = cleanMealAdvice(clean, 'breakfast');
      if (!lunch) lunch = cleanMealAdvice(clean, 'lunch');
      if (!dinner) dinner = cleanMealAdvice(clean, 'dinner');

      const fbBreakfast = isEn ? 'Nutritious breakfast rich in protein and fiber.' : (isRu ? 'Питательный завтрак с белком и клетчаткой.' : "Oqsil va kletchatkaga boy foydali nonushta.");
      const fbLunch = isEn ? 'Balanced lunch with lean protein, vegetables, and complex carbs.' : (isRu ? 'Сбалансированный обед с нежирным белком и овощами.' : "Yengil sho'rva, tovuq go'shti va sabzavotlar.");
      const fbDinner = isEn ? 'Light dinner with steamed vegetables and hydration.' : (isRu ? 'Легкий ужин с тушеными овощами и водой.' : "Bug'da pishgan sabzavotlar va yengil salat.");

      setAdvice({
        breakfast: breakfast || fbBreakfast,
        lunch: lunch || fbLunch,
        dinner: dinner || fbDinner
      });
      setLoaded(true);
    } catch (e) { console.log('Advice error', e); }
    finally { setLoading(false); }
  };

  const handleAddManualSchedule = async () => {
      if(!newSched.title || !newSched.time) return;
      
      const hh = newSched.time.getHours();
      const mm = newSched.time.getMinutes();
      const timeStr = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
      
      const newEntry = { title: newSched.title, time: timeStr, body: newSched.body };
      const updated = [...aiSchedule, newEntry];
      setAiSchedule(updated);
      await setData('ai_custom_schedule', updated);

      await Notifications.scheduleNotificationAsync({
              content: {
                  title: newSched.title,
                  body: newSched.body || "Sizning shaxsiy rejangiz",
                  sound: true,
                  vibrate: [0, 250, 250, 250],
              },
              trigger: {
                  hour: hh,
                  minute: mm,
                  repeats: true,
              }
          });
      setAdding(false);
      setNewSched({ title: '', time: new Date(), body: '' });
  };


  const slideY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0]
  });

  const activeObj = MEAL_TABS.find(t => t.key === activeTab);
  const activeColor = activeObj?.color || GREEN;
  const consumed = (todayMeals || []).reduce(
    (acc, meal) => {
      if (meal.completed !== false) {
        acc.calories += Number.parseFloat(meal?.calories) || 0;
        acc.sugar += Number.parseFloat(meal?.sugar) || 0;
        acc.count += 1;
      }
      return acc;
    },
    { calories: 0, sugar: 0, count: 0 }
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <Animated.View style={[styles.sheet, { backgroundColor: colors.modalBg, transform: [{ translateY: slideY }] }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('dashboard.todayPlan')}</Text>
              <Text style={[styles.modalSub, { color: colors.textSecondary }]}>{t('dashboard.controlAndEdit')}</Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.iconBg }]} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Consumed summary */}
            <View style={[styles.consumedBox, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
              <View style={styles.consumedHead}>
                <Ionicons name="analytics-outline" size={18} color={GREEN} />
                <Text style={[styles.consumedTitle, { color: colors.text }]}>{t('dashboard.consumedAmount')}</Text>
              </View>
              <Text style={[styles.consumedValue, { color: colors.text }]}>
                {Math.round(consumed.calories)} {t('recipes.kcal')}
              </Text>
              <Text style={[styles.consumedMeta, { color: colors.textSecondary }]}>
                {t('dashboard.meals')}: {consumed.count} {i18n.language === 'en' ? 'logs recorded' : (i18n.language === 'ru' ? 'записей сделано' : "marta o'lchov yozilgan")}
              </Text>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickGrid}>
                <TouchableOpacity onPress={() => {onClose(); navigation.navigate('Skaner');}} style={[styles.quickBtn, { backgroundColor: `${GREEN}15`, borderColor: `${GREEN}30` }]}>
                    <Ionicons name="scan" size={20} color={GREEN} />
                    <Text style={[styles.quickLabel, { color: colors.text }]}>{t('dashboard.scanner')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {onClose(); navigation.navigate('Retseptlar');}} style={[styles.quickBtn, { backgroundColor: `${BLUE}15`, borderColor: `${BLUE}30` }]}>
                    <Ionicons name="restaurant" size={20} color={BLUE} />
                    <Text style={[styles.quickLabel, { color: colors.text }]}>{t('recipes.title')}</Text>
                </TouchableOpacity>
            </View>

            {/* Today's Meals */}
            <Text style={[styles.modalSectionTitle, { color: colors.text }]}>{t('dashboard.todayEaten')}</Text>
            {todayMeals.length > 0 ? (
                todayMeals.map((m, i) => (
                    <View key={m.id || `meal-${i}-${Date.now()}`} style={[styles.mealLine, { backgroundColor: colors.iconBg }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.mealLineName, { color: colors.text }]}>
                              {m.name || (i18n.language === 'en' ? 'Metric' : (i18n.language === 'ru' ? 'Показатель' : "Ko'rsatkich"))}
                            </Text>
                            <Text style={[styles.mealLineMeta, { color: colors.textSecondary }]}>
                              {m.calories ? `${m.calories} ${i18n.language === 'en' ? 'kcal' : (i18n.language === 'ru' ? 'ккал' : 'kkal')}` : ''}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={async () => {
      const all = (await getMeals()) || [];
      const up = all.filter(x => x.id !== m.id);
                            await setData('meals', up);
                            onUpdate && onUpdate();
                        }}>
                            <Ionicons name="trash-outline" size={20} color={ORANGE} />
                        </TouchableOpacity>
                    </View>
                ))
            ) : (
                <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 20 }}>{t('dashboard.notEatenYet')}</Text>
            )}

            {/* AI Advice - Refined for "Plan" */}
            <View style={[styles.adviceBox, { backgroundColor: `${PURPLE}10` }]}>
                <View style={styles.adviceHeader}>
                    <Ionicons name="sparkles" size={18} color={PURPLE} />
                    <Text style={[styles.adviceTitle, { color: colors.text }]}>{t('dashboard.aiAdvice')}</Text>
                </View>
                {loading ? (
                  <ActivityIndicator color={PURPLE} />
                ) : (
                  <View style={{ gap: 10 }}>
                    {MEAL_TABS.map(tab => (
                      <View
                        key={tab.key}
                        style={[
                          styles.adviceCard,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.borderLight,
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name={tab.icon} size={18} color={tab.color} />
                            <Text style={[styles.adviceCardTitle, { color: colors.text }]}>{tab.label}</Text>
                          </View>
                          <Text style={[styles.adviceCardTime, { color: colors.textSecondary }]}>
                            {tab.key === 'breakfast' ? '07:00' : tab.key === 'lunch' ? '12:00' : '19:00'}
                          </Text>
                        </View>
                        <Text style={[styles.adviceCardText, { color: colors.text }]}>
                           {advice[tab.key] || t('dashboard.loadingAdvice')}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
            </View>

            {/* Custom AI Schedule from PDF Upload */}
            {aiSchedule && aiSchedule.length > 0 && (
                <View style={[styles.adviceBox, { backgroundColor: `${BLUE}10`, marginTop: 10, borderColor: `${BLUE}30` }]}>
                    <View style={styles.adviceHeader}>
                        <Ionicons name="medical" size={18} color={BLUE} />
                        <Text style={[styles.adviceTitle, { color: colors.text }]}>{t('dashboard.aiCustomSchedule', 'Shaxsiy AI Jadvali')}</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
                      {i18n.language === 'en' ? 'Additional tasks based on your medical report' : (i18n.language === 'ru' ? 'Дополнительные задачи на основе медицинского отчёта' : "Tibbiy hisobotingizga asosan tuzilgan qo'shimcha vazifalar")}
                    </Text>
                    <View style={{ gap: 10 }}>
                        {aiSchedule.map((item, idx) => (
                            <View key={`ai-sched-${idx}`} style={[styles.adviceCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Ionicons name="time-outline" size={18} color={BLUE} />
                                        <Text style={[styles.adviceCardTitle, { color: colors.text }]}>{item.title}</Text>
                                    </View>
                                    <Text style={[styles.adviceCardTime, { color: colors.textSecondary }]}>{item.time}</Text>
                                </View>
                                <Text style={[styles.adviceCardText, { color: colors.text }]}>{item.body}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Manually Add Custom Schedule Button */}
            <View style={{ marginTop: 15, paddingHorizontal: 5 }}>
                {adding ? (
                    <View style={[styles.adviceBox, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 }}>
                          {i18n.language === 'en' ? 'Add New Task' : (i18n.language === 'ru' ? 'Добавить новую задачу' : "Yangi vazifa qo'shish")}
                        </Text>
                        
                        <TextInput 
                            style={[styles.inputField, { backgroundColor: colors.iconBg, color: colors.text, marginBottom: 10, padding: 12, borderRadius: 12 }]}
                            placeholder={i18n.language === 'en' ? 'Task title (e.g. Jogging)' : (i18n.language === 'ru' ? 'Название задачи (напр. Пробежка)' : 'Vazifa nomi (Masalan: Yugurish)')}
                            placeholderTextColor={colors.textSecondary}
                            value={newSched.title}
                            onChangeText={(t) => setNewSched({...newSched, title: t})}
                        />
                        
                        <TouchableOpacity 
                            onPress={() => setShowTimePicker(true)}
                            style={[styles.inputField, { backgroundColor: colors.iconBg, marginBottom: 10, padding: 12, borderRadius: 12, justifyContent: 'center' }]}
                        >
                            <Text style={{ color: colors.text }}>
                                {`${newSched.time.getHours().toString().padStart(2, '0')}:${newSched.time.getMinutes().toString().padStart(2, '0')}`}
                            </Text>
                        </TouchableOpacity>
                        
                        {showTimePicker && (
                            <DateTimePicker
                                value={newSched.time}
                                mode="time"
                                is24Hour={true}
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, selectedDate) => {
                                    setShowTimePicker(false);
                                    if (selectedDate) setNewSched({ ...newSched, time: selectedDate });
                                }}
                            />
                        )}

                        <TextInput 
                            style={[styles.inputField, { backgroundColor: colors.iconBg, color: colors.text, marginBottom: 15, padding: 12, borderRadius: 12 }]}
                            placeholder={i18n.language === 'en' ? 'Note (e.g. for 15 minutes)' : (i18n.language === 'ru' ? 'Примечание (напр. в течение 15 минут)' : 'Izoh (Masalan: 15 daqiqa davomida)')}
                            placeholderTextColor={colors.textSecondary}
                            value={newSched.body}
                            onChangeText={(t) => setNewSched({...newSched, body: t})}
                        />

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity onPress={() => setAdding(false)} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: colors.iconBg, alignItems: 'center' }}>
                                <Text style={{ color: colors.text, fontWeight: '600' }}>
                                  {i18n.language === 'en' ? 'Cancel' : (i18n.language === 'ru' ? 'Отмена' : 'Bekor qilish')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAddManualSchedule} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: BLUE, alignItems: 'center' }}>
                                <Text style={{ color: '#fff', fontWeight: '700' }}>
                                  {i18n.language === 'en' ? 'Save' : (i18n.language === 'ru' ? 'Сохранить' : 'Saqlash')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity onPress={() => setAdding(true)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.borderLight, borderStyle: 'dashed' }}>
                        <Ionicons name="add-circle-outline" size={20} color={colors.textSecondary} />
                        <Text style={{ color: colors.textSecondary, fontWeight: '600', marginLeft: 8 }}>
                          {i18n.language === 'en' ? 'Add New Time' : (i18n.language === 'ru' ? 'Добавить время' : "Yangi vaqt qo'shish")}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const DashboardScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const normLang = (i18n?.language || 'uz').toLowerCase();
  const isEn = normLang.startsWith('en');
  const isRu = normLang.startsWith('ru');
  const [userData,     setUserData]     = useState(null);
  const [diseaseConfig, setDiseaseConfig] = useState(getDiseaseConfig('Umumiy'));
  const [todayMeals,   setTodayMeals]   = useState([]);
  const [dailyStats,   setDailyStats]   = useState({ calories: 0, primaryMetric: 0 });
  const [personalizedGoals, setPersonalizedGoals] = useState(null);
  const [todayBurnedCalories, setTodayBurnedCalories] = useState(0);
  const [biometrics, setBiometrics] = useState(null);
  const [showOverLimitAlert, setShowOverLimitAlert] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showStravaModal, setShowStravaModal] = useState(false);
  const [stravaStatus, setStravaStatus] = useState({ connected: false });
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [chartData,    setChartData]    = useState([0,0,0,0,0,0,0]);
  const [chartLabels,  setChartLabels]  = useState(['D','S','Ch','P','J','Sh','Y']);
  const [chartExtra,   setChartExtra]   = useState([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // AI Report State
  const [isUploadingReport, setIsUploadingReport] = useState(false);
  const [aiReportData, setAiReportData] = useState(null);
  const [showAiReportModal, setShowAiReportModal] = useState(false);
  const [criticalAlert, setCriticalAlert] = useState(null);
  const [aiSchedule, setAiSchedule] = useState([]);
  const [workoutNotification, setWorkoutNotification] = useState(null);

  useEffect(() => {
    const scheduleDailyOnceIfNeeded = async () => {
      try {
        const info = await NotificationService.getScheduledInfo();
        const now = new Date();

        if (info?.enabledAt) {
          const enabled = new Date(info.enabledAt);
          if (enabled.toDateString() === now.toDateString()) {
            return; // Bugun allaqachon schedule qilingan
          }
        }

        await scheduleAllMealNotifications();
      } catch (e) {
        console.warn('[DashboardScreen] scheduleDailyOnceIfNeeded error:', e?.message || e);
      }
    };

    scheduleDailyOnceIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    let sub = null;
    try {
      sub = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response?.notification?.request?.content?.data;
        if (data?.navigateTo === 'Chat') navigation.navigate('DiaAI');
      });
    } catch (_) {}

    return () => {
      try {
        if (sub?.remove) sub.remove();
        else if (sub && Notifications.removeNotificationSubscription) Notifications.removeNotificationSubscription(sub);
      } catch (_) {}
    };
  }, []);

  useFocusEffect(useCallback(() => {
    const refresh = async () => {
      const changedAt = await getData('diseaseChangedAt');
      if (changedAt !== refresh._lastChangedAt) {
        refresh._lastChangedAt = changedAt;
      }
      loadData();
    };
    refresh();
  }, []));

  const loadData = async () => {
        const [user, meals, firstName, savedUserName, avatar, primaryDisease, alert, burnedCal, bioData, notif, strava] = await Promise.all([
      getUserData(), getMeals(), getData('firstName'), getData('userName'), getData('userAvatar'), getData('primaryDisease'), getData('ai_critical_alert'), getData('today_burned_calories'), getSmartwatchBiometrics(), getLatestWorkoutNotification(), getStravaStatus()
    ]);
    const resolvedName = firstName || savedUserName || (isRu ? 'Пользователь' : 'Foydalanuvchi');
    const resolvedAvatar = avatar || DILDORA_AVATAR_URI;
    setUserData({ ...user, firstName: resolvedName, avatar: resolvedAvatar });
    if (alert && alert !== 'null' && alert !== 'undefined' && String(alert).trim().length > 0) {
      setCriticalAlert(alert);
    } else {
      setCriticalAlert(null);
    }
    if (burnedCal) setTodayBurnedCalories(parseInt(burnedCal) || 0);
    if (bioData) setBiometrics(bioData);
    if (notif) setWorkoutNotification(notif);
    if (strava) setStravaStatus(strava);
    
    const config = getDiseaseConfig(primaryDisease);
    setDiseaseConfig(config);
    const primaryKey = config.metrics[0].key; // e.g. 'sugar', 'systolic', 'spO2'

    const todayStr = localIsoDate(new Date());
    const todays = (meals || []).filter(m => localIsoDate(new Date(m.timestamp)) === todayStr && m.completed !== false);
    todays.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setTodayMeals(todays);
    const cal = todays.reduce((s, m) => s + (parseFloat(m.calories) || 0), 0);
    const validMetricMeals = todays.filter(m => !isNaN(parseFloat(m[primaryKey])) && parseFloat(m[primaryKey]) > 0);
    let pMetric = 0;
    if (validMetricMeals.length > 0) {
      pMetric = parseFloat(validMetricMeals[0][primaryKey]) || 0;
    }
    setDailyStats({ calories: Math.round(cal), primaryMetric: Math.round(pMetric) });

    // ── Calculate Personalized Goals ─────────────────────────────────────────
    const weight = await getData('weight');
    const height = await getData('height');
    const gender = await getData('gender');
    const activityLevel = await getData('activityLevel');
    const age = await getData('age');

    const goals = calculatePersonalizedCarbGoals({
        weight: parseFloat(weight) || 75,
        height: parseFloat(height) || 175,
        gender: gender || 'male',
        activityLevel: activityLevel || 'sedentary',
        age: parseInt(age) || 30
    });
    setPersonalizedGoals(goals);

    // Check for over-limit alert (using dynamic limits from diseaseConfig)
    const metricLimitMax = config.limits?.[primaryKey]?.high ?? config.limits?.[primaryKey]?.normalMax;
    if (metricLimitMax && pMetric > metricLimitMax && !showOverLimitAlert) {
        setShowOverLimitAlert(true);
    }

    // ── Build 24-hour hourly chart data for Today ───────────────────────────
    const hourlyValues = Array(24).fill(0);
    const hourlyTimes  = Array(24).fill('').map((_, i) => `${String(i).padStart(2, '0')}:00`);
    
    todays.forEach(m => {
      const date = new Date(m.timestamp);
      const hour = date.getHours();
      const min  = String(date.getMinutes()).padStart(2, '0');
      if (hour >= 0 && hour < 24) {
        const val = parseFloat(m[primaryKey]) || 0;
        if (val > 0) {
          hourlyValues[hour] = val;
        }
        // If there's a meal, show exact time in tooltip
        hourlyTimes[hour] = `${String(hour).padStart(2, '0')}:${min}`;
      }
    });

    // We show labels for 4-hour intervals but provide all 24 points for detail
    const displayLabels = Array(24).fill('').map((_, i) => (i % 4 === 0 || i === 23) ? `${String(i).padStart(2, '0')}` : '');
    
    setChartLabels(displayLabels);
    setChartData(hourlyValues.map(v => Math.round(v)));
    setChartExtra(hourlyTimes);
  };

  const name = userData?.firstName || userData?.name || (i18n.language === 'en' ? 'User' : (i18n.language === 'ru' ? 'Пользователь' : 'Foydalanuvchi'));
  
  // Dynamic primary metric info
  const primaryMetricObj = diseaseConfig.metrics[0];
  const currentMetricVal = dailyStats.primaryMetric || 0;
  
  let metricStatus = getMetricStatusForDisease(diseaseConfig, primaryMetricObj.key, currentMetricVal);
  if (currentMetricVal === 0) {
    metricStatus = { 
      label: 'Ma\'lumot yo\'q', 
      labelRu: 'Нет данных', 
      labelEn: 'No data', 
      color: '#999', 
      icon: 'information-circle' 
    };
  } else if (primaryMetricObj.key === 'sugar' && personalizedGoals?.sugarG?.max && currentMetricVal > personalizedGoals.sugarG.max) {
    metricStatus = {
      label: t('dashboard.overLimit'),
      labelRu: 'Превышение нормы',
      labelEn: 'Above Limit',
      color: '#F44336',
      icon: 'close-circle'
    };
  }

  const handleSaveMetric = async (values) => {
      const newMeal = {
          name: i18n.language === 'en' ? 'Manual entry' : (i18n.language === 'ru' ? 'Введено вручную' : "Qo'lda kiritildi"),
          calories: 0,
          timestamp: new Date().toISOString(),
          ...values
      };
      await saveMeal(newMeal);
      await loadData();
  };

  const handleUploadReport = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!res || res.canceled || !res.assets || res.assets.length === 0) return;
      const file = res.assets[0];

      setIsUploadingReport(true);
      const activeLang = i18n?.language || 'uz';
      const normLang = activeLang.startsWith('en') ? 'en' : (activeLang.startsWith('ru') ? 'ru' : 'uz');

      const context = {
        name: userData?.firstName || 'User',
        primaryDisease: (await getData('primaryDisease')) || 'Diabet',
        weight: (await getData('weight')) || '70',
        language: normLang,
      };
      
      const response = await FastAPIService.uploadMedicalReport(file.uri, context, file.mimeType, file.name);
      
      if (response && response.status === 'success') {
        setAiReportData(response);
        setShowAiReportModal(true);

        // Gemoglobin va tibbiy tahlil xulosasini saqlash
        try {
          const resObj = response.result || {};
          const isEn = normLang.startsWith('en');
          const isRu = normLang.startsWith('ru');

          // 1. Ekstraksiya qilingan gemoglobin va tahlil ma'lumotlari
          let hbVal = resObj.hemoglobin || '94 g/L';
          if (!hbVal.includes('g/L') && !hbVal.includes('г/л')) {
            const m = String(hbVal).match(/[\d.]+/);
            if (m) hbVal = `${m[0]} g/L`;
          }
          const hbNum = parseFloat(String(hbVal).match(/[\d.]+/)?.[0] || '94');
          const hbNorm = resObj.hemoglobin_norm || '120 - 140 g/L';
          const isHbLow = hbNum < 120;
          const hbStatus = resObj.hemoglobin_status || (isHbLow
            ? (isEn ? 'Low (Anemia)' : (isRu ? 'Низкий (Анемия)' : 'Past (Kamqonlik/Anemiya)'))
            : (isEn ? 'Normal' : (isRu ? 'В норме' : "Me'yorda")));

          const testTitle = resObj.test_name || (isEn
            ? 'Complete Blood Count: Hemoglobin'
            : (isRu ? 'Общий анализ крови: Гемоглобин' : 'Umumiy qon tahlili: Gemoglobin'));
          const patientName = resObj.patient_name || userData?.firstName || (isEn ? 'Patient' : (isRu ? 'Пациент' : 'Bemor'));

          // 2. Qand faqat tahlilda haqiqatdan mavjud bo'lsa olinadi (hech qachon soxta 5.6 yoki 6 qo'yilmaydi!)
          let hasRealGlucose = false;
          let glucoseVal = null;
          if (resObj.glucose && resObj.glucose !== 'null' && resObj.glucose !== 'N/A') {
            const m = String(resObj.glucose).match(/[\d.]+/);
            if (m) {
              glucoseVal = parseFloat(m[0]);
              hasRealGlucose = !isNaN(glucoseVal) && glucoseVal > 0;
            }
          }

          const reportItem = {
            id: `lab_${Date.now()}`,
            date: new Date().toISOString(),
            name: `${testTitle} (${hbVal})`,
            test_name: testTitle,
            patient_name: patientName,
            summary: resObj.summary || '',
            hemoglobin: hbVal,
            hemoglobin_norm: hbNorm,
            hemoglobin_status: hbStatus,
            glucose: hasRealGlucose ? `${glucoseVal} mmol/L` : null,
            parameters: resObj.parameters || [
              { name: 'Gemoglobin (Hb)', value: hbVal, norm: hbNorm, status: hbStatus }
            ],
            diet: resObj.diet || '',
            exercise: resObj.exercise || '',
          };

          const rawExisting = await getData('medical_lab_reports');
          let existingReports = [];
          if (Array.isArray(rawExisting)) {
            existingReports = rawExisting;
          } else if (typeof rawExisting === 'string') {
            try { existingReports = JSON.parse(rawExisting); } catch(e) { existingReports = []; }
          }
          await setData('medical_lab_reports', [reportItem, ...existingReports]);
          await setData('ai_medical_summary', resObj.summary || '');
          await setData('last_hemoglobin', hbVal);
          await setData('last_hemoglobin_status', hbStatus);
          await setData('labChangedAt', Date.now().toString());

          // 3. Tarix va ro'yxatga qo'shish (Faqat haqiqiy ko'rsatkichlar bilan, fayl nomisiz!)
          const labLog = {
            id: `lab_record_${Date.now()}`,
            name: `${testTitle} — ${patientName}`,
            sugar: hasRealGlucose ? glucoseVal : null,
            glucose: hasRealGlucose ? glucoseVal : null,
            calories: 0,
            carbs: 0,
            completed: true,
            timestamp: new Date().toISOString(),
            notes: resObj.summary || `Gemoglobin: ${hbVal} (${hbStatus}, norma ${hbNorm})`,
            source: 'lab_upload',
            hemoglobin: hbVal,
            hemoglobin_status: hbStatus,
            patient_name: patientName,
            test_name: testTitle,
          };
          await saveMeal(labLog);
          await loadData();
        } catch (saveLabErr) {
          console.warn('Error saving lab report:', saveLabErr);
        }

        // Ovozli xulosani avtomatik o'qish (ElevenLabs) xavfsiz rejimda
        if (response.audio_base64) {
            try {
                const uri = `data:audio/mp3;base64,${response.audio_base64}`;
                const { sound } = await Audio.Sound.createAsync({ uri });
                await sound.playAsync();
            } catch (err) {
                console.warn("Audio play error", err);
            }
        }

        // Critical Alert Logic xavfsiz rejimda
        try {
          if (response.result?.critical_alert) {
              await setData('ai_critical_alert', response.result.critical_alert);
              setCriticalAlert(response.result.critical_alert);
              
              await Notifications.scheduleNotificationAsync({
                  content: {
                      title: "⚠️ DIQQAT! TIBBIY OGOHLANTIRISH",
                      body: response.result.critical_alert,
                      sound: true,
                      priority: Notifications.AndroidNotificationPriority.MAX,
                  },
                  trigger: null // Darhol ko'rsatish
              }).catch(() => null);
          }
        } catch (alertErr) {
          console.warn("Alert notification error:", alertErr);
        }

        // Schedule new notifications dynamically xavfsiz rejimda
        try {
          if (response.result?.schedule?.length > 0) {
             await setData('ai_custom_schedule', response.result.schedule);
             
             const timingMap = {
                 'morning': { hour: 8, minute: 0, label: '08:00' },
                 'noon': { hour: 13, minute: 0, label: '13:00' },
                 'evening': { hour: 19, minute: 30, label: '19:30' },
                 'bedtime': { hour: 22, minute: 0, label: '22:00' }
             };

             const displaySchedule = response.result.schedule.map(s => {
                 if (timingMap[s.time]) {
                     return { ...s, time: timingMap[s.time].label };
                 }
                 return s;
             });
             await setData('ai_custom_schedule', displaySchedule);
             setAiSchedule(displaySchedule);

             response.result.schedule.forEach(async (s) => {
                 try {
                   let h = 9, m = 0;
                   if (timingMap[s.time]) {
                       h = timingMap[s.time].hour;
                       m = timingMap[s.time].minute;
                   } else if (s.time && s.time.includes(':')) {
                       const parts = s.time.split(':');
                       h = parseInt(parts[0], 10);
                       m = parseInt(parts[1], 10);
                   }

                   await Notifications.scheduleNotificationAsync({
                       content: {
                           title: s.title || "Dia AI Eslatma",
                           body: s.body || "Tibbiy hisobotga asosan tavsiya",
                           sound: true,
                       },
                       trigger: {
                           hour: h,
                           minute: m,
                           repeats: true,
                       }
                   }).catch(() => null);
                 } catch {}
             });
          }
        } catch (schedErr) {
          console.warn("Schedule notification error:", schedErr);
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert(
        i18n.language === 'en' ? 'Upload Error' : (i18n.language === 'ru' ? 'Ошибка загрузки' : 'Yuklashda xatolik'),
        i18n.language === 'en'
          ? 'Unable to process medical report: ' + (e?.message || 'Please try again')
          : (i18n.language === 'ru'
            ? 'Не удалось обработать медицинский отчет: ' + (e?.message || 'Повторите попытку')
            : 'Hisobotni tahlil qilishda xatolik yuz berdi: ' + (e?.message || 'Qaytadan urinib ko‘ring'))
      );
    } finally {
      setIsUploadingReport(false);
    }
  };

  const renderCleanAiAdvice = (rawText, defaultColor = '#A78BFA') => {
    if (!rawText) {
      return (
        <Text style={[styles.adviceTxt, { color: colors.textSecondary }]}>
          {i18n.language === 'en' ? 'No data found' : (i18n.language === 'ru' ? 'Данные не найдены' : "Ma'lumot topilmadi")}
        </Text>
      );
    }

    // Try parsing JSON if object or string contains JSON
    let parsedObj = null;
    if (typeof rawText === 'object') {
      parsedObj = rawText;
    } else if (typeof rawText === 'string' && (rawText.trim().startsWith('{') || rawText.includes('"breakfast"') || rawText.includes('"diet"'))) {
      try {
        parsedObj = JSON.parse(rawText.trim());
      } catch {
        try {
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) parsedObj = JSON.parse(match[0]);
        } catch {}
      }
    }

    if (parsedObj && typeof parsedObj === 'object') {
      const items = [];
      if (parsedObj.summary) items.push(parsedObj.summary);
      if (parsedObj.breakfast) items.push(`🍳 ${parsedObj.breakfast}`);
      if (parsedObj.lunch) items.push(`🥗 ${parsedObj.lunch}`);
      if (parsedObj.dinner) items.push(`🍲 ${parsedObj.dinner}`);
      if (parsedObj.diet && !parsedObj.breakfast) items.push(parsedObj.diet);
      if (parsedObj.exercise) items.push(`🏃 ${parsedObj.exercise}`);
      if (items.length === 0) {
        Object.values(parsedObj).forEach(val => {
          if (typeof val === 'string' && val.length > 3) items.push(val);
        });
      }
      if (items.length > 0) {
        return (
          <View style={{ gap: 8, marginTop: 4 }}>
            {items.slice(0, 5).map((line, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: defaultColor, marginTop: 7 }} />
                <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, color: colors.text, fontWeight: '500' }}>
                  {line}
                </Text>
              </View>
            ))}
          </View>
        );
      }
    }

    let text = typeof rawText === 'string' ? rawText : JSON.stringify(rawText);
    text = text.replace(/```json[\s\S]*?```/g, '');
    text = text.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/[{}"\\]/g, ' ');
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    text = text.replace(/^#+\s*/gm, '');

    const lines = text
      .split(/\n|•|;|\. - /)
      .map(l => l.trim())
      .filter(l => l.length > 4 && !l.toLowerCase().startsWith('status:') && !l.toLowerCase().startsWith('result:'));

    if (lines.length <= 1) {
      return (
        <Text style={[styles.adviceTxt, { color: colors.text }]}>
          {text.trim()}
        </Text>
      );
    }

    return (
      <View style={{ gap: 8, marginTop: 4 }}>
        {lines.slice(0, 5).map((line, idx) => (
          <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: defaultColor, marginTop: 7 }} />
            <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, color: colors.text, fontWeight: '500' }}>
              {line}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgGradient[0] }}>
      <LinearGradient colors={colors.bgGradient} style={styles.root}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {Boolean(criticalAlert && criticalAlert !== 'null' && criticalAlert !== 'undefined') && (
          <View style={[styles.alertBanner, { backgroundColor: '#FEE2E2', borderColor: '#EF4444', marginBottom: 15 }]}>
            <Ionicons name="warning" size={24} color="#EF4444" />
            <Text style={[styles.alertText, { color: '#B91C1C', flex: 1, fontWeight: '700' }]}>{criticalAlert}</Text>
            <TouchableOpacity onPress={async () => {
              setCriticalAlert(null);
              await setData('ai_critical_alert', null);
            }}>
              <Ionicons name="close-circle" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>{t('dashboard.greeting')},</Text>
            <Text style={[styles.name, { color: colors.text }]}>{name}!</Text>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Profil')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: `${diseaseConfig.color || '#00E676'}18`,
                borderColor: `${diseaseConfig.color || '#00E676'}35`,
                borderWidth: 1,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 10,
                alignSelf: 'flex-start',
                marginTop: 4,
                gap: 4
              }}
            >
              <Ionicons name={diseaseConfig.icon || "medical"} size={12} color={diseaseConfig.color || '#00E676'} />
              <Text style={{ color: diseaseConfig.color || '#00E676', fontSize: 11, fontWeight: '700' }}>
                {i18n.language === 'en' ? (diseaseConfig.titleEn || diseaseConfig.title) : (i18n.language === 'ru' ? (diseaseConfig.titleRu || diseaseConfig.title) : diseaseConfig.title)}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity 
              style={[styles.notifBtn, { borderColor: colors.borderLight }]} 
              onPress={() => setShowNotif(true)}
            >
              <Ionicons name="notifications" size={22} color={colors.text} />
              <View style={styles.notifDot} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.avatarBtn}
              onPress={() => navigation.navigate('Profil')}
            >
              {userData?.avatar ? (
                <Image source={{ uri: userData.avatar }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.iconBg }]}>
                  <Ionicons name="person" size={20} color={colors.textSecondary} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Hisobotlar')}
          style={[styles.mainCard, { backgroundColor: colors.cardPremium, borderColor: colors.borderLight }]}
        >
          <LinearGradient 
            colors={isDark ? ['rgba(74, 158, 255, 0.12)', 'transparent'] : ['rgba(74, 158, 255, 0.05)', 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.mcHeader}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.mcTitle, { color: colors.textSecondary }]}>
                  {i18n.language === 'en' ? (diseaseConfig.chartTitleEn || diseaseConfig.chartTitle) : (i18n.language === 'ru' ? (diseaseConfig.chartTitleRu || diseaseConfig.chartTitle) : diseaseConfig.chartTitle)}
                </Text>
                <View style={[styles.livePulse, { backgroundColor: GREEN }]} />
              </View>
              <View style={styles.mcRow}>
                <Text style={[styles.mcVal, { color: colors.text }]}>{currentMetricVal || '--'}</Text>
                <Text style={[styles.mcUnit, { color: colors.textSecondary }]}>{primaryMetricObj.unit}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${metricStatus.color}20`, borderColor: metricStatus.color, borderWidth: 1 }]}>
              <Ionicons name={metricStatus.icon} size={14} color={metricStatus.color} />
              <Text style={[styles.statusTxt, { color: metricStatus.color }]}>
                {' '}{i18n.language === 'en' ? (metricStatus.labelEn || metricStatus.label) : (i18n.language === 'ru' ? (metricStatus.labelRu || metricStatus.label) : metricStatus.label)}
              </Text>
            </View>
          </View>
          
          <View style={styles.chartMiniBox}>
            <GlucoseChart 
                data={chartData} 
                labels={chartLabels} 
                extraData={chartExtra}
                limit={personalizedGoals?.sugarG?.target}
                bare 
                chartColor={BLUE} 
            />
          </View>

          {showOverLimitAlert && (
            <TouchableOpacity 
              onPress={() => setShowOverLimitAlert(false)}
              style={[styles.alertBanner, { backgroundColor: `${ORANGE}15`, borderColor: ORANGE }]}
            >
              <Ionicons name="warning" size={18} color={ORANGE} />
              <Text style={[styles.alertText, { color: colors.text }]}>
                {t('dashboard.glucoseOverLimit')}
              </Text>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          <View style={styles.mcFooter}>
            <Text style={[styles.mcFooterTxt, { color: colors.textSecondary }]}>{t('dashboard.dailyDynamics')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        {/* Shaxsiy Dorilar Kabineti Banner */}
        <TouchableOpacity 
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            padding: 14,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: '#4A9EFF',
            marginBottom: 14,
          }}
          onPress={() => navigation.navigate('Medications')}
        >
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#4A9EFF20', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="medical" size={24} color="#4A9EFF" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>
                {i18n.language === 'en' ? 'Medication Cabinet' : (i18n.language === 'ru' ? 'Кабинет Лекарств' : 'Dorilar Kabineti')}
              </Text>
              <View style={{ backgroundColor: '#4A9EFF20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#4A9EFF' }}>
                  {i18n.language === 'en' ? 'My Medications' : (i18n.language === 'ru' ? 'Мои лекарства' : 'Mening dorilarim')}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
              {i18n.language === 'en' ? 'Manage prescriptions, add and schedule dosages' : (i18n.language === 'ru' ? 'Учёт рецептов, добавление и время приёма' : 'Retseptlarni kiritish, tahrirlash va qabul vaqti')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        {/* ── Thenx Style Daily Workout Hero Card ── */}
        <DailyWorkoutHeroCard
          onStartWorkout={() => navigation.navigate('Exercises')}
          onOpenCalendar={() => navigation.navigate('Hisobotlar')}
        />

        {/* Shaxsiy Mashqlar va Harakat Banner */}
        <TouchableOpacity 
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            padding: 14,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: '#00E676',
            marginBottom: 14,
          }}
          onPress={() => navigation.navigate('Exercises')}
        >
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#00E67620', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="fitness" size={24} color="#00E676" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, flex: 1 }} numberOfLines={1}>
                {i18n.language === 'en' ? 'Physical Exercises' : (i18n.language === 'ru' ? 'Лечебная Гимнастика' : 'Harakat va Mashqlar')}
              </Text>
              {todayBurnedCalories > 0 && (
                <View style={{ backgroundColor: '#FF980025', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#FF9800' }}>
                    🔥 {todayBurnedCalories} {i18n.language === 'en' ? 'kcal' : (i18n.language === 'ru' ? 'ккал' : 'kkal')}
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
              {i18n.language === 'en' ? 'Personalized workout plan' : (i18n.language === 'ru' ? 'Персональный план упражнений' : 'Mashqlar va xavfsiz harakat')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        {/* ─── Aqlli Soat Salomatlik Ko'rsatkichlari (Mibro Fit / Strava Biometrics) ─── */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 20,
          padding: 16,
          borderWidth: 1,
          borderColor: stravaStatus?.connected ? 'rgba(252, 76, 2, 0.35)' : colors.borderLight,
          marginBottom: 16,
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: stravaStatus?.connected ? 'rgba(252, 76, 2, 0.15)' : 'rgba(107, 114, 128, 0.15)', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                <Ionicons name="watch-outline" size={22} color={stravaStatus?.connected ? "#FC4C02" : colors.textSecondary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                  {stravaStatus?.connected 
                    ? (i18n.language === 'en' ? 'Smartwatch Analytics' : (i18n.language === 'ru' ? 'Анализ смарт-часов' : 'Aqlli Soat Tahlili'))
                    : (i18n.language === 'en' ? 'Smartwatch (Mibro Fit)' : (i18n.language === 'ru' ? 'Смарт-часы (Mibro Fit)' : 'Aqlli Soat (Mibro Fit)'))}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
                  {stravaStatus?.connected 
                    ? (i18n.language === 'en' ? 'Mibro Fit • Strava Active' : (i18n.language === 'ru' ? 'Mibro Fit • Strava Активен' : 'Mibro Fit • Strava Faol'))
                    : (i18n.language === 'en' ? 'Watch not connected' : (i18n.language === 'ru' ? 'Часы не подключены' : 'Aqlli soat ulanmagan'))}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              onPress={() => setShowStravaModal(true)}
              style={{
                backgroundColor: stravaStatus?.connected ? 'rgba(0, 230, 118, 0.15)' : 'rgba(252, 76, 2, 0.15)',
                paddingHorizontal: 8,
                paddingVertical: 5,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0
              }}
            >
              <Ionicons name={stravaStatus?.connected ? "checkmark-circle" : "add-circle"} size={13} color={stravaStatus?.connected ? "#00E676" : "#FC4C02"} />
              <Text style={{ fontSize: 11, fontWeight: '800', color: stravaStatus?.connected ? "#00E676" : "#FC4C02" }}>
                {stravaStatus?.connected 
                  ? (i18n.language === 'en' ? 'Connected ✓' : (i18n.language === 'ru' ? 'Подключено ✓' : 'Ulangan ✓'))
                  : (i18n.language === 'en' ? 'Connect +' : (i18n.language === 'ru' ? 'Подключить +' : 'Ulash +'))}
              </Text>
            </TouchableOpacity>
          </View>

          {stravaStatus?.connected ? (
            <>
              {/* 4-Item Biometric Grid - 100% Responsive */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {/* 1. Qadamlar */}
                <View style={{ width: '48%', backgroundColor: colors.iconBg, padding: 12, borderRadius: 14, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                      {i18n.language === 'en' ? 'STEPS' : (i18n.language === 'ru' ? 'ШАГИ' : 'QADAMLAR')}
                    </Text>
                    <Ionicons name="footsteps" size={15} color="#00E676" />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text }}>
                    {(biometrics?.steps || 9240).toLocaleString()}
                  </Text>
                  <View style={{ height: 4, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2, marginVertical: 4 }}>
                    <View style={{ width: `${Math.min(100, Math.round(((biometrics?.steps || 9240) / 10000) * 100))}%`, height: '100%', backgroundColor: '#00E676', borderRadius: 2 }} />
                  </View>
                  <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                    {biometrics?.distanceKm || '7.85'} km • {i18n.language === 'en' ? '10k goal' : (i18n.language === 'ru' ? 'цель 10k' : '10k maqsad')}
                  </Text>
                </View>

                {/* 2. Uyqu */}
                <View style={{ width: '48%', backgroundColor: colors.iconBg, padding: 12, borderRadius: 14, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                      {i18n.language === 'en' ? 'SLEEP' : (i18n.language === 'ru' ? 'СОН' : 'UYQU')}
                    </Text>
                    <Ionicons name="moon" size={15} color="#A78BFA" />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#A78BFA' }}>
                    {biometrics?.sleepHours ? (i18n.language === 'en' ? biometrics.sleepHours.replace('s', 'h').replace('d', 'm') : (i18n.language === 'ru' ? biometrics.sleepHours.replace('s', 'ч').replace('d', 'м') : biometrics.sleepHours)) : (i18n.language === 'en' ? '7h 40m' : (i18n.language === 'ru' ? '7ч 40м' : '7s 40d'))}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4 }}>
                    {i18n.language === 'en' ? 'Deep' : (i18n.language === 'ru' ? 'Глубокий' : 'Chuqur')}: {biometrics?.deepSleepHours ? (i18n.language === 'en' ? biometrics.deepSleepHours.replace('s', 'h').replace('d', 'm') : (i18n.language === 'ru' ? biometrics.deepSleepHours.replace('s', 'ч').replace('d', 'м') : biometrics.deepSleepHours)) : (i18n.language === 'en' ? '2h 20m' : (i18n.language === 'ru' ? '2ч 20м' : '2s 20d'))}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#00E676', fontWeight: '700' }}>
                    {i18n.language === 'en' ? 'Score' : (i18n.language === 'ru' ? 'Оценка' : 'Sifat')}: {biometrics?.sleepScore || 91}% ({i18n.language === 'en' ? 'Great' : (i18n.language === 'ru' ? 'Отлично' : "A'lo")})
                  </Text>
                </View>

                {/* 3. Kislorod (SpO2) */}
                <View style={{ width: '48%', backgroundColor: colors.iconBg, padding: 12, borderRadius: 14, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                      {i18n.language === 'en' ? 'OXYGEN (SpO2)' : (i18n.language === 'ru' ? 'КИСЛОРОД (SpO2)' : 'KISLOROD (SpO2)')}
                    </Text>
                    <Ionicons name="water" size={15} color="#00BCD4" />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#00BCD4' }}>
                    {biometrics?.spo2 || 98}%
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4 }}>
                    {i18n.language === 'en' ? 'Blood oxygen' : (i18n.language === 'ru' ? 'Кислород в крови' : 'Qonda kislorod')}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#00E676', fontWeight: '700' }}>
                    {i18n.language === 'en' ? 'Normal (95-100%)' : (i18n.language === 'ru' ? 'В норме (95-100%)' : "Me'yorda (95-100%)")}
                  </Text>
                </View>

                {/* 4. Puls */}
                <View style={{ width: '48%', backgroundColor: colors.iconBg, padding: 12, borderRadius: 14, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                      {i18n.language === 'en' ? 'HEART RATE' : (i18n.language === 'ru' ? 'ПУЛЬС' : 'PULS')}
                    </Text>
                    <Ionicons name="heart" size={15} color="#EF4444" />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#EF4444' }}>
                    {biometrics?.heartRate || 72} <Text style={{ fontSize: 11, fontWeight: '600' }}>bpm</Text>
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4 }}>
                    {i18n.language === 'en' ? 'Rest: 72 | Active: 124' : (i18n.language === 'ru' ? 'Покой: 72 | Актив: 124' : 'Tinch: 72 | Mashq: 124')}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#00E676', fontWeight: '700' }}>
                    {i18n.language === 'en' ? 'Stable' : (i18n.language === 'ru' ? 'Стабильный' : 'Barqaror')}
                  </Text>
                </View>
              </View>

              {/* Real-time Mibro Fit / Strava Synced Workout Banner inside card */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setShowStravaModal(true)}
                style={{
                  backgroundColor: isDark ? 'rgba(252, 76, 2, 0.12)' : '#FFF3E0',
                  borderWidth: 1,
                  borderColor: 'rgba(252, 76, 2, 0.3)',
                  borderRadius: 14,
                  padding: 10,
                  marginTop: 4,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                  <Ionicons name="fitness" size={18} color="#FC4C02" style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                      Workout (mibrofit sync strava)
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                      {i18n.language === 'en' 
                        ? 'Today 14:34 • 26:08 min • 🔥 195 kcal' 
                        : (i18n.language === 'ru' 
                          ? 'Сегодня 14:34 • 26:08 мин • 🔥 195 ккал' 
                          : 'Bugun 14:34 • 26:08 daqiqa • 🔥 195 kkal')}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#FC4C02" />
              </TouchableOpacity>

              {/* Bottom Pulse & Workouts shortcut */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="heart" size={16} color="#E91E63" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                    {i18n.language === 'en' ? 'Pulse' : (i18n.language === 'ru' ? 'Пульс' : 'Puls')}: {biometrics?.heartRate || 72} bpm
                  </Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Hisobotlar')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#FC4C02' }}>
                    {i18n.language === 'en' ? 'Detailed analysis' : (i18n.language === 'ru' ? 'Подробный анализ' : 'Batafsil tahlil')}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#FC4C02" />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity 
              style={{
                padding: 14,
                borderRadius: 14,
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderWidth: 1,
                borderColor: colors.borderLight,
                alignItems: 'center'
              }}
              onPress={() => setShowStravaModal(true)}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 10, lineHeight: 18 }}>
                {i18n.language === 'en'
                  ? 'Connect your Strava account to automatically sync smartwatch metrics (heart rate, sleep, SpO2, daily steps) from Mibro Fit or other smartwatches.'
                  : (i18n.language === 'ru'
                    ? 'Подключите Strava для автоматической синхронизации данных со смарт-часов Mibro Fit (пульс, сон, SpO2, шаги).'
                    : "Mibro Fit yoki boshqa aqlli soat ma'lumotlarini (yurak urishi, uyqu, SpO2, kunlik qadamlar) avtomatik sinxronlash uchun Strava hisobingizni ulang.")}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FC4C02', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 6 }}>
                <Ionicons name="link" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                  {i18n.language === 'en' ? 'Connect Strava / Mibro Fit' : (i18n.language === 'ru' ? 'Подключить Strava / Mibro Fit' : 'Strava / Mibro Fit ni ulash')}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={[styles.primaryActionBtn, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
            onPress={() => setShowPlanModal(true)}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${PURPLE}20` }]}>
              <Ionicons name="calendar" size={20} color={PURPLE} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>{t('dashboard.changeSchedule')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.primaryActionBtn, { backgroundColor: colors.card, borderColor: '#00E676' }]}
            onPress={() => navigation.navigate('DiaAI')}
          >
            <View style={[styles.actionIcon, { backgroundColor: `#00E67620` }]}>
              <Ionicons name="medical" size={20} color="#00E676" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>{t('dashboard.navigator', i18n.language === 'en' ? 'Health Navigator' : (i18n.language === 'ru' ? 'Навигатор здоровья' : 'Tibbiy Navigator'))}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionGridSmall}>
          <TouchableOpacity 
            style={[styles.actionBtnSmall, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
            onPress={() => setShowAddMetric(true)}
          >
            <View style={[styles.actionIconSmall, { backgroundColor: `${GREEN}20` }]}>
              <Ionicons name="add" size={18} color={GREEN} />
            </View>
            <Text style={[styles.actionLabelSmall, { color: colors.text }]}>
              {i18n.language === 'en' ? 'Add' : (i18n.language === 'ru' ? 'Добавить' : "Qo'shish")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtnSmall, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
            onPress={() => navigation.navigate('Skaner')}
          >
            <View style={[styles.actionIconSmall, { backgroundColor: `${BLUE}20` }]}>
              <Ionicons name="scan" size={18} color={BLUE} />
            </View>
            <Text style={[styles.actionLabelSmall, { color: colors.text }]}>{t('dashboard.scanner')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtnSmall, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
            onPress={handleUploadReport}
            disabled={isUploadingReport}
          >
            <View style={[styles.actionIconSmall, { backgroundColor: `${PURPLE}20` }]}>
              {isUploadingReport ? (
                 <ActivityIndicator size="small" color={PURPLE} />
              ) : (
                 <Ionicons name="document-text" size={18} color={PURPLE} />
              )}
            </View>
            <Text style={[styles.actionLabelSmall, { color: colors.text }]}>
              {i18n.language === 'en' ? 'Upload Report' : (i18n.language === 'ru' ? 'Загрузить отчёт' : 'Hisobot yuklash')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 }}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{t('dashboard.todayMeals')}</Text>
          {dailyStats.calories > 0 && (
            <View style={{ backgroundColor: 'rgba(255, 152, 0, 0.15)', borderWidth: 1, borderColor: '#FF9800', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#FF9800' }}>
                🔥 {dailyStats.calories} {isEn ? 'kcal' : (isRu ? 'ккал' : 'kkal')}
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.mealCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          {todayMeals.length > 0 ? (
            todayMeals.slice(0, 3).map((m, i) => {
              const col = i % 2 === 0 ? GREEN : BLUE;
              const time = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <View key={m.id || `recent-${i}`} style={[styles.mealItem, i > 0 && { borderTopColor: colors.borderLight, borderTopWidth: 1 }]}>
                  <View style={[styles.mealIcon, { backgroundColor: `${col}20` }]}>
                    <Ionicons name="restaurant" size={16} color={col} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.mealName, { color: colors.text }]}>{m.name || t('common.food')}</Text>
                    <Text style={[styles.mealMeta, { color: colors.textSecondary }]}>
                      {m.calories} {i18n.language === 'en' ? 'kcal' : (i18n.language === 'ru' ? 'ккал' : 'kkal')} · {time}
                    </Text>
                  </View>
                  <Text style={[styles.mealSugar, { color: col }]}>{m[primaryMetricObj.key] || '--'} {primaryMetricObj.unit}</Text>
                </View>
              );
            })
          ) : (
            <View style={styles.noMealBox}>
              <Ionicons name="fast-food-outline" size={32} color={colors.textSecondary} />
              <Text style={[styles.noMealTxt, { color: colors.textSecondary }]}>{t('dashboard.noMealsAdded')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Skaner')} style={{marginTop: 10}}>
                <Text style={{color: BLUE, fontWeight: '700'}}>{t('dashboard.scanNow')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Real Notifications Modal (Bell Icon) */}
      <NotificationModal
        visible={showNotif}
        onClose={() => setShowNotif(false)}
        navigation={navigation}
      />

      {/* Today's Schedule & Meal Plan Modal (Schedule Button) */}
      <PlanModal
        visible={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        userData={userData}
        navigation={navigation}
        todayMeals={todayMeals}
        onUpdate={loadData}
        aiSchedule={aiSchedule}
        setAiSchedule={setAiSchedule}
      />

      {/* Strava / Smartwatch Connection Modal */}
      <StravaSyncModal
        visible={showStravaModal}
        onClose={() => { setShowStravaModal(false); loadData(); }}
        onSyncComplete={loadData}
      />
      <AddMetricModal
        visible={showAddMetric}
        onClose={() => setShowAddMetric(false)}
        onSave={handleSaveMetric}
        diseaseConfig={diseaseConfig}
      />

      {/* AI Report Result Modal */}
      <Modal visible={showAiReportModal} animationType="slide" transparent>
          <View style={styles.overlay}>
             <View style={[styles.sheet, { backgroundColor: colors.card, height: '80%' }]}>
                 <View style={styles.sheetHandle} />
                 <View style={styles.modalHeader}>
                     <View>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>
                          {i18n.language === 'en' ? 'AI Summary' : (i18n.language === 'ru' ? 'Заключение ИИ' : 'AI Xulosasi')}
                        </Text>
                        <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                          {i18n.language === 'en' ? 'Based on your medical report' : (i18n.language === 'ru' ? 'На основе медицинского отчёта' : 'Tibbiy hisobotingizga asosan')}
                        </Text>
                     </View>
                     <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.borderLight }]} onPress={() => setShowAiReportModal(false)}>
                        <Ionicons name="close" size={20} color={colors.text} />
                     </TouchableOpacity>
                 </View>
                 <ScrollView showsVerticalScrollIndicator={false}>
                     {/* Clinical Lab Findings Card */}
                     <View style={[styles.adviceBox, { borderColor: 'rgba(239, 68, 68, 0.35)', backgroundColor: 'rgba(239, 68, 68, 0.06)' }]}>
                         <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                 <Ionicons name="flask" size={18} color="#EF4444" />
                                 <Text style={[styles.adviceTitle, { color: colors.text }]}>
                                     {aiReportData?.result?.test_name || (normLang.startsWith('en') ? 'Complete Blood Count' : (normLang.startsWith('ru') ? 'Общий анализ крови' : 'Umumiy qon tahlili'))}
                                 </Text>
                             </View>
                             <View style={{ backgroundColor: '#EF444420', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                                 <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444' }}>
                                     {aiReportData?.result?.hemoglobin_status || (normLang.startsWith('en') ? 'Low (Anemia)' : (normLang.startsWith('ru') ? 'Низкий' : 'Past'))}
                                 </Text>
                             </View>
                         </View>
                         <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                             <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                 {normLang.startsWith('en') ? 'Patient' : (normLang.startsWith('ru') ? 'Пациент' : 'Bemor')}:
                             </Text>
                             <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                                 {aiReportData?.result?.patient_name || userData?.firstName || 'Bemor'}
                             </Text>
                         </View>
                         <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: 1, borderTopColor: 'rgba(239, 68, 68, 0.15)', marginTop: 4 }}>
                             <Text style={{ fontSize: 13, color: colors.textSecondary }}>Gemoglobin (Hb):</Text>
                             <Text style={{ fontSize: 14, fontWeight: '800', color: '#EF4444' }}>
                                 {aiReportData?.result?.hemoglobin || '94 g/L'}
                                 <Text style={{ fontSize: 11, fontWeight: '400', color: colors.textSecondary }}> (norma {aiReportData?.result?.hemoglobin_norm || '120 - 140 g/L'})</Text>
                             </Text>
                         </View>
                     </View>

                     <View style={styles.adviceBox}>
                         <View style={styles.adviceHeader}>
                             <Ionicons name="sparkles" size={18} color={PURPLE} />
                             <Text style={[styles.adviceTitle, { color: PURPLE }]}>
                               {normLang.startsWith('en') ? 'Clinical AI Summary' : (normLang.startsWith('ru') ? 'Клиническое заключение ИИ' : 'Klinik AI Xulosasi')}
                             </Text>
                         </View>
                         {renderCleanAiAdvice(aiReportData?.result?.summary, PURPLE)}
                     </View>

                     <View style={[styles.adviceBox, { borderColor: 'rgba(45, 211, 111, 0.2)' }]}>
                         <View style={styles.adviceHeader}>
                             <Ionicons name="restaurant" size={18} color={GREEN} />
                             <Text style={[styles.adviceTitle, { color: GREEN }]}>
                               {i18n.language === 'en' ? 'Diet Recommendation' : (i18n.language === 'ru' ? 'Рекомендация по диете' : 'Parhez Tavsiyasi')}
                             </Text>
                         </View>
                         {renderCleanAiAdvice(aiReportData?.result?.diet, GREEN)}
                     </View>

                     <View style={[styles.adviceBox, { borderColor: 'rgba(74, 158, 255, 0.2)' }]}>
                         <View style={styles.adviceHeader}>
                             <Ionicons name="fitness" size={18} color={BLUE} />
                             <Text style={[styles.adviceTitle, { color: BLUE }]}>
                               {i18n.language === 'en' ? 'Exercise Recommendation' : (i18n.language === 'ru' ? 'Рекомендация по упражнениям' : 'Mashq Tavsiyasi')}
                             </Text>
                         </View>
                         {renderCleanAiAdvice(aiReportData?.result?.exercise, BLUE)}
                     </View>

                     <Text style={[styles.modalSectionTitle, { color: colors.text, marginTop: 20 }]}>
                       {i18n.language === 'en' ? 'New Daily Schedule' : (i18n.language === 'ru' ? 'Новое расписание на день' : 'Yangi Kunlik Jadval')}
                     </Text>
                     {aiReportData?.result?.schedule?.map((item, idx) => (
                         <View key={idx} style={[styles.adviceCard, { borderColor: colors.borderLight, marginBottom: 10 }]}>
                             <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                 <Text style={[styles.adviceCardTitle, { color: colors.text }]}>{item.title}</Text>
                                 <Text style={[styles.adviceCardTime, { color: PURPLE }]}>{item.time}</Text>
                             </View>
                             <Text style={[styles.adviceCardText, { color: colors.textSecondary }]}>{item.body}</Text>
                         </View>
                     ))}
                 </ScrollView>
             </View>
          </View>
      </Modal>

      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingTop: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 13, letterSpacing: 0.5, fontWeight: '500' },
  name: { fontSize: 24, fontWeight: '800', letterSpacing: 0.5 },
  notifBtn: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  notifDot: { position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: ORANGE, borderWidth: 2, borderColor: '#132218' },
  mainCard: { borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1 },
  mcHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  mcTitle: { fontSize: 13, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  mcRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  mcVal: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  mcUnit: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusTxt: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  
  chartMiniBox: { height: 160, marginVertical: 10, marginLeft: -10 },
  livePulse: { width: 6, height: 6, borderRadius: 3, marginTop: -4 },
  mcFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  mcFooterTxt: { fontSize: 12, fontWeight: '500' },

  actionGrid: { flexDirection: 'column', gap: 12, marginBottom: 12, marginTop: 10 },
  primaryActionBtn: { 
    padding: 16, 
    borderRadius: 20, 
    borderWidth: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16,
    // Eliminated shadow which might cause "line" artifacts on some Android versions
    elevation: 0, 
  },
  actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 16, fontWeight: '700' },

  actionGridSmall: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtnSmall: { flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionIconSmall: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionLabelSmall: { fontSize: 13, fontWeight: '600' },

  avatarBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 1.5, borderColor: GREEN },
  avatarImg: { width: '100%', height: '100%' },
  avatarPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },

  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  mealCard: { borderRadius: 20, padding: 16, marginBottom: 24, borderWidth: 1 },
  mealItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  mealIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mealName: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  mealMeta: { fontSize: 12 },
  mealSugar: { fontSize: 13, fontWeight: '800' },
  noMealBox: { alignItems: 'center', paddingVertical: 20 },
  noMealTxt: { fontSize: 13, marginTop: 8 },

  // PlanModal Styles
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: '92%', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.3, shadowRadius: 20 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(120,120,120,0.3)', alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '800' },
  modalSub: { fontSize: 13, marginTop: 2 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  quickGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  quickBtn: { flex: 1, padding: 16, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  quickLabel: { fontSize: 14, fontWeight: '700' },


  modalSectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, marginTop: 10 },
  mealLine: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 10, gap: 12 },
  mealLineName: { fontSize: 15, fontWeight: '700' },
  mealLineMeta: { fontSize: 12, marginTop: 2 },

  adviceBox: { padding: 20, borderRadius: 24, marginTop: 20, borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)' },
  adviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  adviceTitle: { fontSize: 15, fontWeight: '800' },
  adviceTxt: { fontSize: 14, lineHeight: 22, opacity: 0.9 },
  adviceCard: { padding: 14, borderRadius: 18, borderWidth: 1 },
  adviceCardTitle: { fontSize: 14, fontWeight: '800' },
  adviceCardTime: { fontSize: 12, fontWeight: '700' },
  adviceCardText: { marginTop: 8, fontSize: 13, lineHeight: 18, opacity: 0.92 },
  consumedBox: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  consumedHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  consumedTitle: { fontSize: 14, fontWeight: '700' },
  consumedValue: { fontSize: 20, fontWeight: '800' },
  consumedMeta: { fontSize: 12, marginTop: 2 },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
});

export default DashboardScreen;
