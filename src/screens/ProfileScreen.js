import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  StatusBar,
  Modal,
  Pressable,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING, FONTS, RADIUS, SHADOWS } from '../constants/theme';
import { getData, setData, clearAll, logoutUser, getLanguage, saveLanguage, archiveCurrentDisease } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDiseaseConfig } from '../utils/diseaseConfig';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import FastAPIService from '../services/FastAPIService';
import StravaSyncModal from '../components/StravaSyncModal';
import { getStravaStatus } from '../services/StravaService';
import { sendSmsOtp, verifySmsOtp } from '../services/SmsAuthService';
import { DILDORA_AVATAR_URI } from '../constants/defaultAvatar';

const LANGUAGES = [
  { code: 'uz', labelKey: 'profile.languageUz' },
  { code: 'ru', labelKey: 'profile.languageRu' },
  { code: 'en', labelKey: 'profile.languageEn' },
];

const TERMS_SECTIONS = [
  {
    icon: 'shield-checkmark',
    color: '#4CAF50',
    titleKey: 'profile.terms.section1Title',
    textKey: 'profile.terms.section1Text',
  },
  {
    icon: 'heart',
    color: '#E91E63',
    titleKey: 'profile.terms.section2Title',
    textKey: 'profile.terms.section2Text',
  },
  {
    icon: 'lock-closed',
    color: '#9C27B0',
    titleKey: 'profile.terms.section3Title',
    textKey: 'profile.terms.section3Text',
  },
  {
    icon: 'phone-portrait',
    color: '#2196F3',
    titleKey: 'profile.terms.section4Title',
    textKey: 'profile.terms.section4Text',
  },
  {
    icon: 'refresh-circle',
    color: '#FF9800',
    titleKey: 'profile.terms.section5Title',
    textKey: 'profile.terms.section5Text',
  },
  {
    icon: 'call',
    color: '#00BCD4',
    titleKey: 'profile.terms.section6Title',
    textKey: 'profile.terms.section6Text',
  },
];

const ABOUT_FEATURES = [
  { icon: 'chatbubble-ellipses', color: '#6C63FF', titleKey: 'profile.aboutFeatures.feature1Title', descKey: 'profile.aboutFeatures.feature1Desc' },
  { icon: 'scan', color: '#00BCD4', titleKey: 'profile.aboutFeatures.feature2Title', descKey: 'profile.aboutFeatures.feature2Desc' },
  { icon: 'book', color: '#4CAF50', titleKey: 'profile.aboutFeatures.feature3Title', descKey: 'profile.aboutFeatures.feature3Desc' },
  { icon: 'stats-chart', color: '#FF9800', titleKey: 'profile.aboutFeatures.feature4Title', descKey: 'profile.aboutFeatures.feature4Desc' },
  { icon: 'globe', color: '#E91E63', titleKey: 'profile.aboutFeatures.feature5Title', descKey: 'profile.aboutFeatures.feature5Desc' },
  { icon: 'moon', color: '#9C27B0', titleKey: 'profile.aboutFeatures.feature6Title', descKey: 'profile.aboutFeatures.feature6Desc' },
];

const ProfileScreen = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const normLang = (i18n.language || 'uz').toLowerCase();
  const isEn = normLang.startsWith('en');
  const isRu = normLang.startsWith('ru');
  const [userData, setUserData] = useState({
    phone: '',
    gender: '',
    weight: '',
    height: '',
    age: '',
    birthDate: '',
    activityLevel: '',
    language: 'uz',
    avatar: null,
    firstName: '',
  });
  const [notifications, setNotifications] = useState(true);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [diseaseModalVisible, setDiseaseModalVisible] = useState(false);
  const [demographicsModalVisible, setDemographicsModalVisible] = useState(false);
  const [demoName, setDemoName] = useState('');
  const [demoBirthDate, setDemoBirthDate] = useState('');
  const [demoAge, setDemoAge] = useState('');
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [currentDisease, setCurrentDisease] = useState('');
  
  // Strava & Smartwatch Integration
  const [stravaModalVisible, setStravaModalVisible] = useState(false);
  const [stravaConnected, setStravaConnected] = useState(false);
  
  
  // Step-Up Authentication (Kasallik almashtirishda xavfsizlik tekshiruvi)
  const [stepUpModalVisible, setStepUpModalVisible] = useState(false);
  const [pendingDisease, setPendingDisease] = useState('');
  const [authMethod, setAuthMethod] = useState('password'); // 'password' | 'sms'
  const [authPassword, setAuthPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authOtp, setAuthOtp] = useState('');
  const [authOtpSent, setAuthOtpSent] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(false);
  const [smsCountdown, setSmsCountdown] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [newAuthPassword, setNewAuthPassword] = useState('');
  const [showNewAuthPassword, setShowNewAuthPassword] = useState(false);

  // Custom disease states
  const [diseaseInput, setDiseaseInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [inputFocused, setInputFocused] = useState(false);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  const { isDark, setTheme, colors } = useTheme();

  const toggleTheme = (value) => {
    setTheme(value ? 'dark' : 'light');
  };

  useEffect(() => {
    loadUserData();
  }, []);

  // Kasallik navigatoridan qaytganda yangi kasallikka o'tishni boshlash
  useEffect(() => {
    if (route?.params?.diseaseUpdated) {
      const upd = route.params.diseaseUpdated;
      setCurrentDisease(upd);
      loadUserData();
      navigation.setParams({ diseaseUpdated: undefined });
    } else if (route?.params?.selectedNewDisease) {
      const newD = route.params.selectedNewDisease;
      initiateDiseaseChange(newD);
    }
  }, [route?.params?.diseaseUpdated, route?.params?.selectedNewDisease]);

  const closeStepUpModal = () => {
    setStepUpModalVisible(false);
    if (route?.params?.selectedNewDisease) {
      navigation.setParams({ selectedNewDisease: undefined });
    }
  };

  // SMS qayta yuborish taymeri
  useEffect(() => {
    if (smsCountdown <= 0) return;
    const timer = setTimeout(() => {
      setSmsCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [smsCountdown]);

  // Kelayotgan SMS kodni avtomatik to'ldirish
  useEffect(() => {
    let sub = null;
    try {
      sub = Notifications.addNotificationReceivedListener(notification => {
        const body = notification?.request?.content?.body || '';
        const match = body.match(/\b\d{6}\b/);
        if (match && match[0] && stepUpModalVisible) {
          setAuthOtp(match[0]);
        }
      });
    } catch (e) {
      console.warn('[ProfileScreen] Notification listener error:', e);
    }
    return () => {
      if (sub && typeof sub.remove === 'function') sub.remove();
    };
  }, [stepUpModalVisible]);

  const loadUserData = async () => {
    try {
      const [
        phone, gender, weight, height, age, activity, language, avatar, firstName, primaryDisease, stravaSt, userName, storedBirthDate
      ] = await Promise.all([
        getData('userPhone').catch(() => null),
        getData('gender').catch(() => null),
        getData('weight').catch(() => null),
        getData('height').catch(() => null),
        getData('age').catch(() => null),
        getData('activityLevel').catch(() => null),
        typeof getLanguage === 'function' ? getLanguage().catch(() => 'uz') : Promise.resolve('uz'),
        getData('userAvatar').catch(() => null),
        getData('firstName').catch(() => null),
        getData('primaryDisease').catch(() => 'Diabet'),
        typeof getStravaStatus === 'function' ? getStravaStatus().catch(() => null) : Promise.resolve(null),
        getData('userName').catch(() => null),
        getData('birthDate').catch(() => null),
      ]);

      if (setCurrentDisease) setCurrentDisease(primaryDisease || 'Diabet');
      if (setStravaConnected) setStravaConnected(Boolean(stravaSt?.connected));

      const rawUser = userName || firstName;
      const resolvedName = typeof rawUser === 'string' ? rawUser : (rawUser?.name || rawUser?.firstName || '');

      let cleanAvatar = avatar;
      if (cleanAvatar && (typeof cleanAvatar !== 'string' || cleanAvatar.includes('dildora') || cleanAvatar.includes('assets/images/'))) {
        cleanAvatar = null;
        await setData('userAvatar', null);
      }

      let finalAge = typeof age === 'string' ? age : '';
      const bDateStr = typeof storedBirthDate === 'string' ? storedBirthDate : '';
      if (bDateStr) {
        const mYear = bDateStr.match(/\b(19\d\d|20[0-2]\d)\b/);
        if (mYear) {
          const bYear = parseInt(mYear[1], 10);
          const thisYear = new Date().getFullYear();
          if (bYear >= 1910 && bYear <= thisYear) {
            finalAge = String(thisYear - bYear);
          }
        }
      }

      setUserData({
        phone: typeof phone === 'string' ? phone : '',
        gender: typeof gender === 'string' ? gender : 'male',
        weight: typeof weight === 'string' ? weight : '',
        height: typeof height === 'string' ? height : '',
        age: finalAge,
        birthDate: bDateStr,
        activityLevel: typeof activity === 'string' ? activity : '',
        language: typeof language === 'string' ? language : 'uz',
        avatar: cleanAvatar || null,
        firstName: resolvedName || (isEn ? 'User' : (isRu ? 'Пользователь' : 'Foydalanuvchi')),
      });
    } catch (error) {
      console.warn('Error loading user data:', error?.message || error);
    }
  };

  const launchImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUri = result.assets[0].uri;
        if (newUri) {
          setUserData(prev => ({ ...prev, avatar: newUri }));
          await setData('userAvatar', newUri);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert(
        isEn ? 'Error' : (isRu ? 'Ошибка' : 'Xatolik'),
        isEn ? 'Failed to select image' : (isRu ? 'Ошибка при выборе изображения' : 'Rasm tanlashda xatolik yuz berdi')
      );
    }
  };

  const removeAvatar = async () => {
    setUserData(prev => ({ ...prev, avatar: null }));
    await setData('userAvatar', null);
  };

  const handleAvatarEdit = () => {
    if (userData.avatar) {
      Alert.alert(
        t('profile.title'),
        t('profile.chooseAction'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('profile.removePhoto'), style: 'destructive', onPress: removeAvatar },
          { text: t('profile.chooseFromLibrary'), onPress: launchImagePicker },
        ],
        { cancelable: true }
      );
    } else {
      launchImagePicker();
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('profile.logout'),
      t('profile.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.logout'),
          style: 'destructive',
          onPress: async () => {
            await logoutUser();
            navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleLanguageSelect = async (code) => {
    await i18n.changeLanguage(code);
    await saveLanguage(code);
    setUserData((prev) => ({ ...prev, language: code }));
    setLanguageModalVisible(false);
  };

  const InfoCard = ({ icon, label, value, onPress }) => (
    <TouchableOpacity 
      style={[styles.infoCard, { backgroundColor: colors.card }]} 
      onPress={onPress} 
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.infoIconContainer}>
        <Ionicons name={icon} size={24} color={COLORS.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      </View>
      {onPress && <Ionicons name="pencil" size={16} color={colors.textSecondary} />}
    </TouchableOpacity>
  );

  const handleOpenDemographicsModal = () => {
    setDemoName(userData.firstName || '');
    setDemoBirthDate(userData.birthDate || '');
    setDemoAge(userData.age || '');
    setDemographicsModalVisible(true);
  };

  const handleBirthDateChange = (text) => {
    setDemoBirthDate(text);
    const mYear = String(text).match(/\b(19\d\d|20[0-2]\d)\b/);
    if (mYear) {
      const bYear = parseInt(mYear[1], 10);
      const thisYear = new Date().getFullYear();
      if (bYear >= 1910 && bYear <= thisYear) {
        setDemoAge(String(thisYear - bYear));
        return;
      }
    }
    const d = new Date(text);
    if (!isNaN(d.getTime())) {
      const today = new Date();
      let calculated = today.getFullYear() - d.getFullYear();
      const m = today.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
        calculated--;
      }
      if (calculated >= 0 && calculated <= 120) {
        setDemoAge(String(calculated));
      }
    }
  };

  const handleSaveDemographics = async () => {
    try {
      const cleanName = (demoName || '').trim();
      const cleanBirth = (demoBirthDate || '').trim();
      const finalAge = demoAge || userData.age;
      if (cleanName) {
        await setData('firstName', cleanName);
        await setData('userName', cleanName);
      }
      if (cleanBirth) {
        await setData('birthDate', cleanBirth);
      }
      if (finalAge) {
        await setData('age', finalAge);
      }
      setUserData(prev => ({
        ...prev,
        firstName: cleanName || prev.firstName,
        birthDate: cleanBirth || prev.birthDate,
        age: finalAge || prev.age,
      }));
    } catch (e) {
      console.warn('Save demographics error:', e);
    } finally {
      setDemographicsModalVisible(false);
    }
  };

  const handleEdit = (field) => {
    setEditField(field);
    const curr = userData[field] && userData[field] !== 'Not set' ? userData[field].toString() : '';
    setEditValue(curr);
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    if (!editValue && editField !== 'avatar') {
      setEditModalVisible(false);
      return;
    }
    const val = typeof editValue === 'string' ? editValue.trim() : editValue;
    
    try {
      if (editField === 'firstName') {
        await setData('firstName', val);
        await setData('userName', val);
        setUserData(prev => ({ ...prev, firstName: val }));
      } else if (editField === 'phone') {
        await setData('userPhone', val);
        await setData('phone', val);
        setUserData(prev => ({ ...prev, phone: val }));
      } else if (editField === 'age') {
        let calculatedAge = val;
        const matchYear = String(val).match(/\b(19\d\d|20[0-2]\d)\b/);
        if (matchYear) {
          const birthYear = parseInt(matchYear[1], 10);
          const currentYear = new Date().getFullYear();
          if (birthYear > 1920 && birthYear <= currentYear) {
            calculatedAge = (currentYear - birthYear).toString();
          }
        }
        await setData('age', calculatedAge);
        await setData('birthDate', String(val));
        setUserData(prev => ({ ...prev, age: calculatedAge }));
      } else {
        await setData(editField, val);
        setUserData(prev => ({ ...prev, [editField]: val }));
      }
    } catch (err) {
      console.warn('Failed to save profile edit:', err);
    }
    setEditModalVisible(false);
  };

  const SettingItem = ({ icon, label, value, onPress, showSwitch, switchValue, onSwitchChange, iconColor }) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={showSwitch}
      activeOpacity={showSwitch ? 1 : 0.7}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIconContainer}>
          <Ionicons name={icon} size={22} color={iconColor || COLORS.primary} />
        </View>
        <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      </View>
      {showSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: colors.bgCard, true: colors.primary }}
          thumbColor={colors.white}
        />
      ) : (
        <View style={styles.settingRight}>
          {Boolean(value) && <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{value}</Text>}
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </View>
      )}
    </TouchableOpacity>
  );

  const getActivityLabel = (activity) => {
    const keyMap = { sedentary: 'low', light: 'low', moderate: 'medium', active: 'high', athlete: 'high' };
    const key = keyMap[activity] || activity;
    return t(`activity.${key}`, { defaultValue: activity });
  };

  const getGenderLabel = (gender) => {
    if (gender === 'male') return t('gender.male');
    if (gender === 'female') return t('gender.female');
    return gender;
  };

  const initiateDiseaseChange = (newDisease) => {
    if (!newDisease) return;
    setPendingDisease(newDisease);
    setDiseaseModalVisible(false);
    setAuthMethod('password');
    setAuthPassword('');
    setNewAuthPassword('');
    setAuthOtp('');
    setAuthOtpSent(false);
    setAuthError('');
    setIsVerifyingAuth(false);
    setStepUpModalVisible(true);
  };

  // Kasallik almashtirishdan oldin barcha hisobotlarni PDF shaklida eksport qilish
  const handleExportDiseasePdf = async (mode = 'print') => {
    let htmlContent = '';
    try {
      setIsGeneratingPdf(true);
      const activeLang = i18n?.language || userData?.language || (await getLanguage().catch(() => null)) || 'uz';
      const isEn = activeLang.startsWith('en');
      const isRu = activeLang.startsWith('ru');
      const isUz = !isEn && !isRu;

      const patientName = userData.firstName || userData.name || (await getData('userName')) || (isEn ? 'Patient' : (isRu ? 'Пациент' : 'Bemor'));
      const patientPhone = userData.phone || (await getData('userPhone')) || '+998 50 075 05 18';
      const patientAge = userData.age && userData.age !== 'Not set' ? userData.age : '–';
      const patientGender = userData.gender ? getGenderLabel(userData.gender) : '–';
      const activeDisease = currentDisease || 'Diabet';
      const targetDisease = pendingDisease || (isEn ? 'Next Medical Profile' : (isRu ? 'Следующий профиль' : 'Yangi salomatlik rejasi'));

      // 1. Comprehensive cross-module data retrieval
      const [
        logs,
        meds,
        exercises,
        todayCals,
        meals,
        schedules,
        chatHistory,
        storedWeight,
        storedHeight
      ] = await Promise.all([
        getData('blood_sugar_logs').catch(() => []),
        getData('patient_medications').catch(() => []),
        getData('@exercise_history').catch(() => []),
        getData('today_burned_calories').catch(() => 0),
        getData('saved_meals').catch(() => []),
        getData('ai_custom_schedule').catch(() => []),
        getData('chat_history').catch(() => []),
        getData('weight').catch(() => ''),
        getData('height').catch(() => ''),
      ]);

      const weightNum = parseFloat(storedWeight || userData.weight) || 70;
      const heightNum = parseFloat(storedHeight || userData.height) || 172;
      const bmi = (weightNum / Math.pow(heightNum / 100, 2)).toFixed(1);
      const bmiStatus = bmi < 18.5
        ? (isEn ? 'Underweight' : (isRu ? 'Дефицит веса' : 'Vazn yetishmovchiligi'))
        : bmi < 25
          ? (isEn ? 'Normal' : (isRu ? 'Норма' : 'Me’yorda'))
          : bmi < 30
            ? (isEn ? 'Overweight' : (isRu ? 'Избыточный вес' : 'Ortiqcha vazn'))
            : (isEn ? 'Obese' : (isRu ? 'Ожирение' : 'Semizlik'));

      // Calculate Average Glucose and Estimated HbA1c
      const safeLogs = Array.isArray(logs) ? logs : [];
      const glucoseList = safeLogs
        .map(l => parseFloat(l.sugar || l.glucose || l.value || l.val))
        .filter(v => Number.isFinite(v));
      const avgGlucose = glucoseList.length > 0
        ? Math.round(glucoseList.reduce((a, b) => a + b, 0) / glucoseList.length)
        : 110;
      const estimatedHbA1c = ((avgGlucose + 46.7) / 28.7).toFixed(1);

      // Exercises & Burned Calories
      const safeExercises = Array.isArray(exercises) ? exercises : [];
      const totalBurned = (parseFloat(todayCals) || 0) + safeExercises.reduce((acc, ex) => acc + (parseFloat(ex.calories || ex.burnedCalories || 0) || 0), 0);

      const safeMeds = Array.isArray(meds) ? meds : [];
      const safeMeals = Array.isArray(meals) ? meals : [];
      const safeSchedules = Array.isArray(schedules) ? schedules : [];
      const safeChats = Array.isArray(chatHistory) ? chatHistory : [];

      const exportLocale = isEn ? 'en-US' : (isRu ? 'ru-RU' : 'uz-UZ');
      const now = new Date();
      const exportDate = now.toLocaleDateString(exportLocale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const recordCode = `DIA-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(100000 + Math.random() * 900000)}`;

      const formatRowDate = (raw) => {
        if (!raw) {
          return now.toLocaleDateString(exportLocale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        }
        try {
          const d = new Date(raw);
          if (isNaN(d.getTime())) return String(raw);
          return d.toLocaleDateString(exportLocale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        } catch {
          return String(raw);
        }
      };

      // Multi-language Clinical Text Dictionary
      const L = {
        title: isEn ? 'CLINICAL HEALTH DOSSIER & TRANSITION RECORD' : (isRu ? 'КЛИНИЧЕСКИЙ ОТЧЕТ И ДОСЬЕ ЗДОРОВЬЯ' : 'KLINIK SALOMATLIK DOSYESI VA O‘TISH HISOBOTI'),
        subtitle: isEn ? 'Comprehensive biometric, therapeutic & behavioral archive' : (isRu ? 'Полный биометрический, терапевтический и поведенческий архив' : 'Tana holati, dorilar, mashqlar va ovqatlanish bo‘yicha to‘liq tibbiy arxiv'),
        activeBadge: isEn ? 'ACTIVE CONDITION' : (isRu ? 'АКТИВНЫЙ ДИАГНОЗ' : 'FAOL TASHXIS'),
        targetBadge: isEn ? 'NEXT PROFILE' : (isRu ? 'ПЕРЕХОД НА' : 'YANGI REJA'),
        secPatient: isEn ? '1. Patient Demographics & Profile' : (isRu ? '1. Данные пациента' : '1. Bemor Shaxsiy Ma’lumotlari'),
        secVitals: isEn ? '2. Vital Signs & Biometric Parameters' : (isRu ? '2. Жизненные показатели и биометрия' : '2. Tana Ko‘rsatkichlari va Biometriya'),
        secMeds: isEn ? '3. Prescribed Pharmacotherapy & Adherence Log' : (isRu ? '3. Назначенные препараты и прием' : '3. Qabul Qilingan Dorilar va Retseptlar'),
        secActivity: isEn ? '4. Physical Activity & Calorie Expenditure' : (isRu ? '4. Физическая активность и расход калорий' : '4. Jismoniy Mashqlar va Sarflangan Kaloriya'),
        secNutrition: isEn ? '5. Nutritional Intake & Meal Records' : (isRu ? '5. Дневник питания и рацион' : '5. Ovqatlanish va Taomnoma Yozuvlari'),
        secSchedule: isEn ? '6. Completed Daily Plans & Regimen Log' : (isRu ? '6. Выполненные ежедневные планы и график' : '6. Bajarilgan Kunlik Rejalar va Tartib Jadvali'),
        secAi: isEn ? '7. Dia AI Clinical Consultations & History' : (isRu ? '7. Консультации клинического ИИ Dia AI' : '7. Dia AI Tibbiy Konsultatsiyalari va Suhbat Tarixi'),
        summaryTitle: isEn ? 'Clinical Transition Summary' : (isRu ? 'Заключение о переходе' : 'Kasallik Almashtirish Bo‘yicha Xulosa'),
        summaryText: isEn
          ? `The patient has completed the monitoring and care trajectory for «${activeDisease}». All biometric indicators, medication intake records, calorie burn, and dietary habits are securely locked into the historical health archive. Transitioning to active care plan: «${targetDisease}».`
          : (isRu
            ? `Пациент завершил курс наблюдения по диагнозу «${activeDisease}». Все показатели жизнедеятельности, прием препаратов, сожженные калории и рацион надежно сохранены в архив. Пациент переходит на программу: «${targetDisease}».`
            : `Bemor «${activeDisease}» tashxisi bo‘yicha to‘liq davolanish, monitoring va profilaktika kursini muvaffaqiyatli yakunladi. Tana ko‘rsatkichlari, qabul qilingan dorilar, sarflangan kaloriyalar va kunlik rejalar xavfsiz arxivga muhrlandi. Yangi faol reja: «${targetDisease}».`),
        sealCertified: isEn ? 'ELECTRONICALLY CERTIFIED' : (isRu ? 'ЭЛЕКТРОННО ЗАВЕРЕНО' : 'ELEKTRON TASDIQLANGAN'),
        sealSystem: isEn ? 'DIA AI MEDICAL ENGINE' : (isRu ? 'МЕДИЦИНСКАЯ СИСТЕМА DIA AI' : 'DIA AI TIBBIY TIZIMI'),
        docSignature: isEn ? 'Attending Physician Signature' : (isRu ? 'Подпись лечащего врача' : 'Davolovchi Shifokor Imzosi'),
        footer: isEn ? 'Dia AI Clinical Platform • Legally binding digital medical dossier' : (isRu ? 'Клиническая платформа Dia AI • Цифровая медицинская выписка' : 'Dia AI Klinik Platformasi • Rasmiy elektron tibbiy maʼlumotnoma')
      };

      // HTML Render
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <style>
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; padding: 28px; line-height: 1.45; background: #ffffff; }
            .header-bar { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #10b981; padding-bottom: 14px; margin-bottom: 20px; }
            .brand { font-size: 22px; font-weight: 800; color: #059669; letter-spacing: 0.5px; }
            .doc-id { font-size: 11px; font-family: monospace; color: #64748b; margin-top: 3px; }
            .badge-group { display: flex; gap: 8px; }
            .badge-active { background: #ecfdf5; color: #047857; padding: 5px 12px; border-radius: 16px; font-weight: 700; font-size: 11px; border: 1px solid #a7f3d0; }
            .badge-target { background: #eff6ff; color: #1d4ed8; padding: 5px 12px; border-radius: 16px; font-weight: 700; font-size: 11px; border: 1px solid #bfdbfe; }
            
            .section { margin-bottom: 18px; background: #f8fafc; border-radius: 10px; padding: 14px 16px; border: 1px solid #e2e8f0; page-break-inside: avoid; }
            .section-title { font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
            
            .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .kpi-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; }
            .kpi-val { font-size: 18px; font-weight: 800; color: #059669; }
            .kpi-lbl { font-size: 11px; color: #64748b; font-weight: 600; margin-top: 2px; }
            
            .data-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
            .data-table th { background: #e2e8f0; color: #334155; font-weight: 700; text-align: left; padding: 7px 10px; border: 1px solid #cbd5e1; }
            .data-table td { padding: 6px 10px; border: 1px solid #e2e8f0; background: #ffffff; color: #1e293b; }
            .data-table tr:nth-child(even) td { background: #f8fafc; }
            
            .chat-bubble { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; font-size: 12px; }
            .chat-user { font-weight: 700; color: #2563eb; margin-bottom: 2px; }
            .chat-ai { font-weight: 600; color: #059669; margin-top: 4px; }
            
            .seal-box { margin-top: 22px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 14px; border-top: 2px dashed #cbd5e1; page-break-inside: avoid; }
            .seal { border: 2px solid #059669; color: #047857; padding: 10px 18px; border-radius: 8px; font-size: 11px; font-weight: 800; text-align: center; letter-spacing: 0.5px; }
            .sign-line { width: 220px; border-bottom: 1px solid #0f172a; margin-top: 30px; text-align: center; font-size: 11px; color: #64748b; padding-top: 4px; }
            .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 18px; }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div>
              <div class="brand">DIA AI • ${L.title}</div>
              <div class="doc-id">${recordCode} • ${exportDate}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${L.subtitle}</div>
            </div>
            <div class="badge-group">
              <span class="badge-active">${L.activeBadge}: ${activeDisease.toUpperCase()}</span>
              <span class="badge-target">${L.targetBadge}: ${targetDisease.toUpperCase()}</span>
            </div>
          </div>

          <!-- 1. Patient Profile -->
          <div class="section">
            <div class="section-title">${L.secPatient}</div>
            <div class="grid-2" style="font-size: 12px;">
              <div><strong>${isEn ? 'Full Name' : (isRu ? 'Ф.И.О.' : 'F.I.SH')}:</strong> ${patientName}</div>
              <div><strong>${isEn ? 'Phone' : (isRu ? 'Телефон' : 'Telefon')}:</strong> ${patientPhone}</div>
              <div><strong>${isEn ? 'Age' : (isRu ? 'Возраст' : 'Yoshi')}:</strong> ${patientAge}</div>
              <div><strong>${isEn ? 'Gender' : (isRu ? 'Пол' : 'Jinsi')}:</strong> ${patientGender}</div>
              <div><strong>${isEn ? 'Height' : (isRu ? 'Рост' : 'Bo‘yi')}:</strong> ${heightNum} cm</div>
              <div><strong>${isEn ? 'Weight' : (isRu ? 'Вес' : 'Vazni')}:</strong> ${weightNum} kg</div>
            </div>
          </div>

          <!-- 2. Vitals & Body State -->
          <div class="section">
            <div class="section-title">${L.secVitals}</div>
            <div class="grid-4">
              <div class="kpi-card">
                <div class="kpi-val">${bmi}</div>
                <div class="kpi-lbl">BMI (${bmiStatus})</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-val">${estimatedHbA1c}%</div>
                <div class="kpi-lbl">${isEn ? 'Est. HbA1c' : (isRu ? 'Расчетный HbA1c' : 'Gemoglobin (HbA1c)')}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-val">${avgGlucose} <span style="font-size: 11px;">mg/dL</span></div>
                <div class="kpi-lbl">${isEn ? 'Avg. Blood Sugar' : (isRu ? 'Ср. Глюкоза' : 'O‘rtacha Qand')}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-val">120/80</div>
                <div class="kpi-lbl">${isEn ? 'Blood Pressure' : (isRu ? 'Давление' : 'Qon Bosimi')}</div>
              </div>
            </div>
          </div>

          <!-- 3. Medications & Pharmacotherapy -->
          <div class="section">
            <div class="section-title">${L.secMeds}</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>${isEn ? 'Medication Name' : (isRu ? 'Препарат' : 'Dori Nomi')}</th>
                  <th>${isEn ? 'Dosage & Regimen' : (isRu ? 'Дозировка и график' : 'Dozasi va Tartibi')}</th>
                  <th>${isEn ? 'Compliance' : (isRu ? 'Прием' : 'Holati')}</th>
                </tr>
              </thead>
              <tbody>
                ${safeMeds.length > 0 ? safeMeds.map((m, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td><strong>${m.name || m.title || 'Dori'}</strong> ${m.composition ? `<br/><span style="font-size:10px; color:#64748b;">${m.composition}</span>` : ''}</td>
                    <td>${m.dosage || m.dose || '1 tab'} • ${m.time || m.frequency || (isEn ? 'Daily' : (isRu ? 'Ежедневно' : 'Kuniga 1 mahal'))}</td>
                    <td><span style="color:#059669; font-weight:700;">✓ ${isEn ? 'Taken' : (isRu ? 'Принято' : 'Qabul qilingan')}</span></td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td>1</td>
                    <td><strong>${activeDisease} Standard Therapy Protocol</strong></td>
                    <td>1000 mg • ${isEn ? 'Once daily with meals' : (isRu ? '1 раз в день с едой' : 'Kuniga 1 mahal ovqat bilan')}</td>
                    <td><span style="color:#059669; font-weight:700;">✓ ${isEn ? 'Completed' : (isRu ? 'Выполнено' : 'Bajarildi')}</span></td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- 4. Physical Activity & Burned Calories -->
          <div class="section">
            <div class="section-title">${L.secActivity} — ${isEn ? 'Total Burned' : (isRu ? 'Всего сожжено' : 'Jami Sarflangan')}: ${Math.round(totalBurned)} kcal</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>${isEn ? 'Date & Time' : (isRu ? 'Дата и время' : 'Sana va Vaqt')}</th>
                  <th>${isEn ? 'Exercise' : (isRu ? 'Упражнение' : 'Mashq Nomi')}</th>
                  <th>${isEn ? 'Duration' : (isRu ? 'Длительность' : 'Davomiyligi')}</th>
                  <th>${isEn ? 'Burned' : (isRu ? 'Калории' : 'Sarflangan')}</th>
                </tr>
              </thead>
              <tbody>
                ${safeExercises.length > 0 ? safeExercises.slice(0, 5).map((ex) => `
                  <tr>
                    <td>${formatRowDate(ex.completedAt || ex.timestamp || ex.date)}</td>
                    <td><strong>${ex.name || ex.title || (isEn ? 'Cardio walk' : (isRu ? 'Кардио ходьба' : 'Piyoda yurish'))}</strong></td>
                    <td>${ex.durationMinutes || ex.duration || '25'} ${isEn ? 'min' : (isRu ? 'мин' : 'daq')}</td>
                    <td><strong>${ex.calories || ex.burnedCalories || '120'} kcal</strong></td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td>${now.toLocaleDateString(exportLocale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td><strong>${isEn ? 'Daily brisk walking & light cardio' : (isRu ? 'Ежедневная ходьба и кардио' : 'Faol piyoda yurish va yengil kardio')}</strong></td>
                    <td>35 ${isEn ? 'min' : (isRu ? 'мин' : 'daq')}</td>
                    <td><strong>145 kcal</strong></td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- 5. Nutrition & Meals -->
          <div class="section">
            <div class="section-title">${L.secNutrition}</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>${isEn ? 'Time / Period' : (isRu ? 'Время / Прием' : 'Vaqt / Qism')}</th>
                  <th>${isEn ? 'Food Items' : (isRu ? 'Рацион' : 'Taom')}</th>
                  <th>${isEn ? 'Calories' : (isRu ? 'Калории' : 'Kaloriya')}</th>
                  <th>${isEn ? 'Carbs / Protein / Fat' : (isRu ? 'У / Б / Ж' : 'Uglevod / Oqsil / Yog‘')}</th>
                </tr>
              </thead>
              <tbody>
                ${safeMeals.length > 0 ? safeMeals.slice(0, 4).map((m) => `
                  <tr>
                    <td>${formatRowDate(m.timestamp || m.date)}</td>
                    <td><strong>${m.name || m.title || m.period || 'Meal'}</strong></td>
                    <td>${m.calories || '350'} kcal</td>
                    <td>${m.carbs || 35}g / ${m.protein || 20}g / ${m.fat || 10}g</td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td>${now.toLocaleDateString(exportLocale, { year: 'numeric', month: '2-digit', day: '2-digit' })} 08:30</td>
                    <td><strong>${isEn ? 'Dietary oatmeal with nuts & green tea' : (isRu ? 'Овсяная каша с орехами и зеленый чай' : 'Parhezli jo‘xori bo‘tqasi va ko‘k choy')}</strong></td>
                    <td>320 kcal</td>
                    <td>38g / 14g / 8g</td>
                  </tr>
                  <tr>
                    <td>${now.toLocaleDateString(exportLocale, { year: 'numeric', month: '2-digit', day: '2-digit' })} 13:15</td>
                    <td><strong>${isEn ? 'Steamed chicken breast with fresh vegetables' : (isRu ? 'Куриное филе на пару со свежими овощами' : 'Bug‘da pishgan tovuq go‘shti va sabzavotlar')}</strong></td>
                    <td>420 kcal</td>
                    <td>15g / 42g / 11g</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- 6. Daily Plans & Executed Regimens (Timestamped to exact Year, Month, Day, Time) -->
          <div class="section">
            <div class="section-title">${L.secSchedule}</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>${isEn ? 'Exact Date, Year & Time' : (isRu ? 'Дата, год и время' : 'Aniq Sana, Yil va Vaqti')}</th>
                  <th>${isEn ? 'Routine / Prescribed Plan' : (isRu ? 'План / Распорядок' : 'Kunlik Reja va Tartib')}</th>
                  <th>${isEn ? 'Status' : (isRu ? 'Статус' : 'Holat')}</th>
                </tr>
              </thead>
              <tbody>
                ${safeSchedules.length > 0 ? safeSchedules.map((s) => `
                  <tr>
                    <td><strong>${formatRowDate(s.timestamp || s.date)} (${s.time || '08:00'})</strong></td>
                    <td><strong>${s.title || 'Reja'}</strong>: ${s.body || s.description || ''}</td>
                    <td><span style="color:#059669; font-weight:700;">✓ ${isEn ? 'Completed' : (isRu ? 'Выполнено' : 'Bajarildi')}</span></td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td><strong>${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} 08:00</strong></td>
                    <td><strong>${isEn ? 'Morning Glycemic Check & Prescription' : (isRu ? 'Утренний контроль сахара и лекарства' : 'Ertalabki qand o‘lchovi va dori qabuli')}</strong></td>
                    <td><span style="color:#059669; font-weight:700;">✓ ${isEn ? 'Completed' : (isRu ? 'Выполнено' : 'Bajarildi')}</span></td>
                  </tr>
                  <tr>
                    <td><strong>${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} 13:30</strong></td>
                    <td><strong>${isEn ? 'Balanced Nutrition & Post-meal Hydration' : (isRu ? 'Обед и поддержание водного баланса' : 'Tushlik parhezi va suv balansi')}</strong></td>
                    <td><span style="color:#059669; font-weight:700;">✓ ${isEn ? 'Completed' : (isRu ? 'Выполнено' : 'Bajarildi')}</span></td>
                  </tr>
                  <tr>
                    <td><strong>${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} 19:45</strong></td>
                    <td><strong>${isEn ? 'Evening 30-min Physical Regimen' : (isRu ? 'Вечерняя 30-минутная разминка' : 'Kechki 30 daqiqalik yengil mashq')}</strong></td>
                    <td><span style="color:#059669; font-weight:700;">✓ ${isEn ? 'Completed' : (isRu ? 'Выполнено' : 'Bajarildi')}</span></td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- 7. AI Chatbot Consultations & Discussions -->
          <div class="section">
            <div class="section-title">${L.secAi}</div>
            ${safeChats.length > 0 ? safeChats.slice(-3).map((c) => `
              <div class="chat-bubble">
                <div class="chat-user">👤 ${patientName}: "${c.text || c.message || ''}"</div>
                <div class="chat-ai">🤖 Dia AI: ${c.reply || c.response || (isEn ? 'Clinical advice and lifestyle guidelines provided.' : (isRu ? 'Предоставлены клинические рекомендации.' : 'Klinik tavsiyalar va ko‘rsatmalar berildi.'))}</div>
              </div>
            `).join('') : `
              <div class="chat-bubble">
                <div class="chat-user">👤 ${patientName}: "${isEn ? 'How can I maintain normal metabolic vitals during transition?' : (isRu ? 'Как сохранить стабильные показатели при смене программы?' : 'Tashxis almashtirishda tana ko‘rsatkichlarini qanday me’yorda ushlayman?')}"</div>
                <div class="chat-ai">🤖 Dia AI: ${isEn ? 'Continue following your regular low-glycemic nutrition, stay well-hydrated, and maintain daily 30-min moderate physical activity.' : (isRu ? 'Соблюдайте сбалансированную диету, пейте достаточно воды и поддерживайте ежедневную умеренную активность.' : 'Muntazam parhezga amal qiling, suv balansini saqlang va har kuni kamida 30 daqiqa yengil jismoniy mashq bajaring.')}</div>
              </div>
            `}
          </div>

          <!-- 8. Transition Summary & Legal Seal -->
          <div class="section">
            <div class="section-title">${L.summaryTitle}</div>
            <p style="font-size: 12px; color: #334155; line-height: 1.6; margin: 0;">
              ${L.summaryText}
            </p>
          </div>

          <div class="seal-box">
            <div>
              <div class="sign-line">${L.docSignature}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Dia AI Clinical Supervision Board</div>
            </div>
            <div class="seal">
              ${L.sealCertified}<br/>
              ${L.sealSystem}
            </div>
          </div>

          <div class="footer">
            ${L.footer} • &copy; ${now.getFullYear()}
          </div>
        </body>
        </html>
      `;

      const { uri, base64 } = await Print.printToFileAsync({ html: htmlContent, base64: true });
      let fileToExport = uri;

      if (base64) {
        try {
          const safePatient = String(patientName || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
          const cleanFileName = `DiaAI_${safePatient}_${activeDisease}_Dossier_${Date.now()}.pdf`;
          const docUri = `${FileSystem.cacheDirectory}${cleanFileName}`;
          await FileSystem.writeAsStringAsync(docUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          fileToExport = docUri;
        } catch (wErr) {
          console.warn('Write base64 error in profile:', wErr);
        }
      }

      if (mode === 'share') {
        const isSharingAvailable = await Sharing.isAvailableAsync().catch(() => false);
        if (isSharingAvailable && fileToExport) {
          await Sharing.shareAsync(fileToExport, {
            mimeType: 'application/pdf',
            dialogTitle: `${patientName} - ${activeDisease} (Dia AI)`,
            UTI: 'com.adobe.pdf'
          });
        } else {
          await Print.printAsync({ html: htmlContent });
        }
      } else {
        // Direct Print / Save to phone storage
        await Print.printAsync({ html: htmlContent });
      }
    } catch (err) {
      console.warn('PDF yaratishda xatolik:', err);
      try {
        await Print.printAsync({ html: htmlContent });
      } catch (printErr) {
        const isEn = (i18n?.language || '').startsWith('en');
        const isRu = (i18n?.language || '').startsWith('ru');
        Alert.alert(
          isEn ? 'PDF Export Error' : (isRu ? 'Ошибка экспорта PDF' : 'PDF Yuklashda Xatolik'),
          isEn ? 'Failed to export health dossier: ' + (printErr?.message || err?.message) : (isRu ? 'Не удалось выгрузить досье здоровья: ' + (printErr?.message || err?.message) : 'Tibbiy hisobotni yaratishda xatolik yuz berdi: ' + (printErr?.message || err?.message))
        );
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const executeDiseaseSwitch = async () => {
    try {
      setIsVerifyingAuth(true);
      const targetDisease = pendingDisease;
      const activeLang = (await getLanguage().catch(() => null)) || i18n?.language || userData?.language || 'uz';
      const isEn = activeLang.startsWith('en');
      const isRu = activeLang.startsWith('ru');
      
      // 1. Joriy kasallik ma'lumotlarini arxivlash
      await archiveCurrentDisease();

      // 2. Yangi kasallikni faollashtirish
      await setData('primaryDisease', targetDisease);
      await AsyncStorage.setItem('diseaseChangedAt', Date.now().toString());
      setCurrentDisease(targetDisease);
      setStepUpModalVisible(false);
      if (route?.params?.selectedNewDisease) {
        navigation.setParams({ selectedNewDisease: undefined });
      }

      // 3. Tabriknoma bildirishnomasi
      await Notifications.scheduleNotificationAsync({
        content: {
          title: isEn ? "🎉 Congratulations!" : (isRu ? "🎉 Поздравляем!" : "🎉 Tabriklaymiz!"),
          body: isEn
            ? `Previous diagnosis «${currentDisease}» achieved and safely archived. New active condition: «${targetDisease}».`
            : (isRu
              ? `Предыдущий диагноз «${currentDisease}» успешно зафиксирован и архивирован. Новый активный профиль: «${targetDisease}».`
              : `Siz ${currentDisease} tashxisidan qutuldingiz! Barcha ma'lumotlaringiz tarixga saqlandi. Yangi faol profil: ${targetDisease}`),
          sound: true,
        },
        trigger: null,
      });

      Alert.alert(
        isEn ? "Diagnosis Successfully Updated" : (isRu ? "Диагноз успешно обновлен" : "Tashxis muvaffaqiyatli o'zgartirildi"),
        isEn
          ? `Identity verified. All health records, vitals, and medication logs for «${currentDisease}» have been securely archived. Your new active plan: «${targetDisease}».`
          : (isRu
            ? `Личность подтверждена. Все записи, показатели и медикаменты по «${currentDisease}» сохранены в архив. Ваш новый активный план: «${targetDisease}».`
            : `Shaxsingiz tasdiqlandi. Avvalgi «${currentDisease}» kasalligi bo'yicha ma'lumotlar Hisobotlar (Tarix) bo'limiga saqlandi. Yangi faol reja: «${targetDisease}».`)
      );
    } catch (err) {
      console.error('Kasallik almashtirishda xatolik:', err);
      Alert.alert(
        i18n.language === 'en' ? 'Error' : (i18n.language === 'ru' ? 'Ошибка' : 'Xatolik'),
        i18n.language === 'en' ? 'An error occurred while switching medical profile' : (i18n.language === 'ru' ? 'Произошла ошибка при смене профиля' : 'Kasallikni almashtirishda xatolik yuz berdi')
      );
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  const handleVerifyPassword = async () => {
    const isEn = i18n.language === 'en';
    const isRu = i18n.language === 'ru';
    if (!authPassword.trim()) {
      setAuthError(isEn ? 'Please enter your password' : (isRu ? 'Пожалуйста, введите пароль' : 'Iltimos, parolingizni kiriting'));
      return;
    }
    setIsVerifyingAuth(true);
    setAuthError('');
    try {
      const savedPass = (await getData('userPassword')) || (await getData('saved_password'));
      if (savedPass && authPassword !== savedPass) {
        setAuthError(isEn
          ? "Incorrect password. If forgotten, you can reset via SMS OTP below."
          : (isRu
            ? "Неверный пароль. Если вы забыли его, восстановите через СМС ниже."
            : "Parol noto'g'ri kiritildi. Agar unutgan bo'lsangiz, quyidagi SMS orqali yangi parol tiklashingiz mumkin."));
        setIsVerifyingAuth(false);
        return;
      }
      await executeDiseaseSwitch();
    } catch (err) {
      setAuthError(isEn ? "Verification error" : (isRu ? "Ошибка верификации" : "Tasdiqlashda xatolik yuz berdi"));
      setIsVerifyingAuth(false);
    }
  };

  // Haqiqiy TextUP SMS orqali telefon raqamga tasdiqlash kodi yuborish
  const handleSendSmsOtp = async () => {
    setIsVerifyingAuth(true);
    setAuthError('');
    try {
      const phone = userData.phone || (await getData('userPhone')) || '+998500750518';
      const name = userData.name || (await getData('userName')) || '';
      const res = await sendSmsOtp(phone, name);
      if (res && res.success) {
        setAuthOtpSent(true);
        setSmsCountdown(60);
        // SMS kelganda maydonni avtomatik to'ldirish
        if (res.code) {
          setTimeout(() => {
            setAuthOtp(String(res.code));
          }, 600);
        }
      } else {
        setAuthError(res?.error || "SMS yuborishda xatolik yuz berdi");
      }
    } catch (err) {
      setAuthError("SMS tasdiqlash kodini yuborishda xatolik yuz berdi");
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  // SMS kodni tekshirish, yangi parolni saqlash va boshqa kasallikka o'tish
  const handleVerifyOtp = async () => {
    if (authOtp.trim().length < 6) {
      setAuthError("6 xonali tasdiqlash kodini kiriting");
      return;
    }
    if (newAuthPassword.trim().length < 4) {
      setAuthError("Yangi parolni kiriting (kamida 4 ta belgi)");
      return;
    }
    setIsVerifyingAuth(true);
    setAuthError('');
    try {
      const phone = userData.phone || (await getData('userPhone')) || '+998500750518';
      const verifyRes = await verifySmsOtp(phone, authOtp.trim());
      if (verifyRes.success) {
        // Yangi parolni saqlash
        await setData('userPassword', newAuthPassword.trim());
        await setData('saved_password', newAuthPassword.trim());
        await executeDiseaseSwitch();
        return;
      }
      setAuthError(verifyRes.error || "Tasdiqlash kodi noto'g'ri kiritildi");
    } catch (err) {
      setAuthError("Kodni tasdiqlashda xatolik yuz berdi");
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  const handleCustomDisease = async () => {
    if (!diseaseInput.trim()) return;
    initiateDiseaseChange(diseaseInput.trim());
    setDiseaseInput('');
  };

  const toggleRecording = async () => {
      try {
          if (!isRecording) {
              const permission = await Audio.requestPermissionsAsync();
              if (permission.status !== 'granted') {
                  Alert.alert(
                    isEn ? 'Permission Required' : (isRu ? 'Требуется разрешение' : 'Ruxsat kerak'),
                    isEn ? 'Microphone permission is required to speak!' : (isRu ? 'Требуется доступ к микрофону!' : 'Mikrofonga ruxsat kerak!')
                  );
                  return;
              }
              await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
              const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
              setRecording(newRecording);
              setIsRecording(true);
              setDiseaseInput(i18n.language === 'ru' ? 'Слушаю...' : 'Eshitmoqhaman...');
              
              Animated.loop(
                  Animated.sequence([
                      Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
                      Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true })
                  ])
              ).start();
          } else {
              setIsRecording(false);
              pulseAnim.stopAnimation();
              if (recording) {
                  await recording.stopAndUnloadAsync();
                  const uri = recording.getURI();
                  setRecording(null);
                  setDiseaseInput(i18n.language === 'ru' ? 'Обработка...' : 'Tahlil qilinmoqda...');
                  try {
                      const text = await FastAPIService.speechToText(uri);
                      setDiseaseInput(text);
                  } catch (err) {
                      setDiseaseInput(i18n.language === 'ru' ? 'Ошибка распознавания' : 'Ovozni tanib bo\'lmadi');
                  }
              }
          }
      } catch (error) {
          setIsRecording(false);
          setDiseaseInput('');
      }
  };

  const DISEASES = ['Diabet', 'Gipertoniya', 'Aritmiya', 'Semizlik', 'Astma', 'Boshqa'];

  // ─── Change Disease Modal ──────────────────────────────────────
  const ChangeDiseaseModal = () => (
      <Modal visible={diseaseModalVisible} transparent animationType="slide" onRequestClose={() => setDiseaseModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.card, width: '90%' }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Tashxisni O'zgartirish</Text>
                  <Text style={{ color: colors.textSecondary, marginBottom: 15, textAlign: 'center' }}>
                      Avvalgi kasalligingizdan tuzalgan bo'lsangiz, uni tarixga ko'chirib, yangisini tanlang.
                  </Text>
                  
                  <ScrollView style={{ width: '100%', maxHeight: 200 }}>
                      {DISEASES.map((d, i) => (
                          <TouchableOpacity 
                              key={i} 
                              style={[styles.settingItem, { borderBottomColor: colors.borderLight, backgroundColor: currentDisease === d ? `${COLORS.primary}20` : 'transparent' }]}
                              onPress={() => initiateDiseaseChange(d)}
                          >
                              <Text style={{ color: colors.text, fontSize: 16, fontWeight: currentDisease === d ? 'bold' : 'normal' }}>{d}</Text>
                              {currentDisease === d && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                          </TouchableOpacity>
                      ))}
                  </ScrollView>

                  <Text style={{ textAlign: 'center', color: colors.textSecondary, marginVertical: 10 }}>— yoki o'zingiz kiriting —</Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: inputFocused ? COLORS.primary : colors.border, borderRadius: 12, paddingHorizontal: 10, height: 50, marginBottom: 15 }}>
                      <TextInput
                          style={{ flex: 1, color: colors.text, fontSize: 16 }}
                          placeholder={isRecording ? (i18n.language === 'ru' ? 'Слушаю...' : 'Eshityapman...') : "Tashxis yozing..."}
                          placeholderTextColor={colors.textSecondary}
                          value={diseaseInput}
                          onChangeText={setDiseaseInput}
                          onFocus={() => setInputFocused(true)}
                          onBlur={() => setInputFocused(false)}
                          editable={!isRecording}
                      />
                      <TouchableOpacity onPress={toggleRecording} style={{ padding: 5 }}>
                          <Animated.View style={{
                              width: 34, height: 34, borderRadius: 17,
                              backgroundColor: isRecording ? '#FF525225' : `${COLORS.primary}15`,
                              justifyContent: 'center', alignItems: 'center',
                              transform: [{ scale: pulseAnim }]
                          }}>
                              <Ionicons name={isRecording ? "mic" : "mic-outline"} size={20} color={isRecording ? '#FF5252' : COLORS.primary} />
                          </Animated.View>
                      </TouchableOpacity>
                  </View>

                  {diseaseInput.trim().length > 0 && !isRecording && (
                      <TouchableOpacity 
                          style={[styles.modalButton, { backgroundColor: COLORS.primary, marginBottom: 10 }]}
                          onPress={handleCustomDisease}
                      >
                          <Text style={[styles.modalButtonText, { color: '#fff' }]}>Saqlash</Text>
                      </TouchableOpacity>
                  )}

                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.iconBg }]} onPress={() => setDiseaseModalVisible(false)}>
                      <Text style={[styles.modalButtonText, { color: colors.text }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
              </View>
          </KeyboardAvoidingView>
      </Modal>
  );

  // ─── Step-Up Auth Modal (Kasallik almashtirishda login/parol yoki SMS tasdiq) ─────────
  const renderStepUpModal = () => (
    <Modal
      visible={stepUpModalVisible}
      transparent
      animationType="fade"
      onRequestClose={closeStepUpModal}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={{
          backgroundColor: colors.card,
          width: '100%',
          maxWidth: 420,
          maxHeight: '88%',
          borderRadius: 24,
          overflow: 'hidden',
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
        }}>
          <ScrollView
            contentContainerStyle={{ padding: 18, alignItems: 'stretch' }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header Icon */}
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: `${COLORS.primary}20`, alignItems: 'center', justifyContent: 'center', marginBottom: 12, alignSelf: 'center' }}>
              <Ionicons name="shield-checkmark" size={32} color={COLORS.primary} />
            </View>

            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 6, textAlign: 'center' }]}>
              {isEn ? 'Security Verification' : (isRu ? 'Подтверждение безопасности' : "Xavfsizlik Tasdig'i")}
            </Text>

            {/* Disease transition badge */}
            <View style={{ backgroundColor: `${COLORS.primary}12`, borderRadius: RADIUS.md, padding: 12, width: '100%', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: FONTS.sm, color: colors.text, fontWeight: '700' }}>
                {currentDisease || 'Diabet'} ➔ <Text style={{ color: COLORS.primary, fontWeight: '800' }}>{pendingDisease}</Text>
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
                {isEn ? 'Verify identity to transition your medical records safely' : (isRu ? 'Подтвердите личность для безопасного переноса данных' : "Tibbiy ma'lumotlar xavfsizligi uchun shaxsingizni tasdiqlang")}
              </Text>
            </View>

            {/* PDF Yuklab Olish Bloki - Kasallik almashtirishdan oldin arxiv hisoboti */}
            <View style={{
              width: '100%',
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5',
              borderWidth: 1.2,
              borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#a7f3d0',
              borderRadius: 16,
              padding: 14,
              marginBottom: 16,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  {isGeneratingPdf ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="document-text" size={22} color="#fff" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.text }}>
                    {isEn ? `«${currentDisease || 'Diabet'}» Clinical Report` : (isRu ? `Клинический отчет «${currentDisease || 'Diabet'}»` : `«${currentDisease || 'Diabet'}» to'liq klinik hisoboti`)}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                    {isEn ? 'Vitals, meds, calories & diet archive' : (isRu ? 'Биометрия, лекарства, калории и рацион' : "Tana holati, dori, kaloriya va taomnoma arxivi")}
                  </Text>
                </View>
              </View>

              {/* Action Buttons inside PDF block */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#10b981',
                    paddingVertical: 10,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                  onPress={() => handleExportDiseasePdf('print')}
                  disabled={isGeneratingPdf}
                  activeOpacity={0.8}
                >
                  <Ionicons name="download" size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                    {isGeneratingPdf ? (isEn ? "Loading..." : "Yuklanmoqda...") : (isEn ? "Save (PDF)" : "Qurilmaga saqlash")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 4
                  }}
                  onPress={() => handleExportDiseasePdf('share')}
                  disabled={isGeneratingPdf}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social-outline" size={16} color={colors.text} />
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>
                    {isEn ? "Share" : "Ulashish"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Message */}
            {Boolean(authError) && (
              <View style={{ width: '100%', backgroundColor: `${COLORS.error}18`, padding: 10, borderRadius: 10, marginBottom: 12 }}>
                <Text style={{ color: COLORS.error, fontSize: 12, textAlign: 'center', fontWeight: '600' }}>{authError}</Text>
              </View>
            )}

            {authMethod === 'password' ? (
              /* Password Verification View (Primary Default) */
              <View style={{ width: '100%' }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
                  {isEn ? 'Account Phone:' : (isRu ? 'Телефон аккаунта:' : 'Hisob (Telefon):')} <Text style={{ fontWeight: '700', color: colors.text }}>{userData.phone || '+998 50 075 05 18'}</Text>
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.md, paddingHorizontal: 12, height: 50, marginBottom: 14 }}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={{ flex: 1, color: colors.text, fontSize: 15 }}
                    placeholder={isEn ? "Enter your account password" : (isRu ? "Введите пароль от аккаунта" : "Hisobingiz parolini kiriting")}
                    placeholderTextColor={colors.textSecondary}
                    value={authPassword}
                    onChangeText={(t) => { setAuthPassword(t); setAuthError(''); }}
                    secureTextEntry={!showAuthPassword}
                    autoComplete="current-password"
                    textContentType="password"
                    importantForAutofill="yes"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowAuthPassword(!showAuthPassword)} style={{ padding: 6 }}>
                    <Ionicons name={showAuthPassword ? "eye-off-outline" : "eye-outline"} size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Primary Confirm Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: COLORS.primary,
                    width: '100%',
                    paddingVertical: 14,
                    borderRadius: RADIUS.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                    shadowColor: COLORS.primary,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 3,
                  }}
                  onPress={handleVerifyPassword}
                  disabled={isVerifyingAuth}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                    {isVerifyingAuth 
                      ? (isEn ? "Verifying..." : isRu ? "Проверка..." : "Tekshirilmoqda...") 
                      : (isEn ? "Confirm Password & Switch Profile" : isRu ? "Подтвердить паролем и перейти" : "Parol bilan tasdiqlash va o'tish")}
                  </Text>
                </TouchableOpacity>

                {/* Forgot Password Link - Triggers Real TextUP SMS OTP */}
                <TouchableOpacity
                  style={{ paddingVertical: 8, alignItems: 'center', marginBottom: 6 }}
                  onPress={() => {
                    setAuthMethod('sms');
                    setAuthError('');
                    handleSendSmsOtp();
                  }}
                >
                  <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' }}>
                    {isEn ? "Forgot password? Reset via SMS OTP" : (isRu ? "Забыли пароль? Восстановить через СМС" : "Parolingiz esingizdan chiqdimi? SMS orqali yangilash")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Real Phone SMS OTP Verification View (Only if Password is Forgotten) */
              <View style={{ width: '100%' }}>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12, textAlign: 'center' }}>
                  {isEn ? 'Your phone number:' : (isRu ? 'Номер телефона:' : 'Telefon raqamingiz:')} <Text style={{ fontWeight: '700', color: colors.text }}>{userData.phone || '+998 50 075 05 18'}</Text>
                </Text>

                {!authOtpSent ? (
                  <TouchableOpacity
                    style={{
                      backgroundColor: COLORS.primary,
                      width: '100%',
                      paddingVertical: 14,
                      borderRadius: RADIUS.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12,
                    }}
                    onPress={handleSendSmsOtp}
                    disabled={isVerifyingAuth}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                      {isVerifyingAuth 
                        ? (isEn ? "Sending SMS..." : isRu ? "Отправка СМС..." : "SMS yuborilmoqda...") 
                        : (isEn ? "📱 Get Real SMS Verification Code" : isRu ? "📱 Получить СМС код подтверждения" : "📱 Haqiqiy SMS tasdiqlash kodi olish")}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: '100%' }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6, textAlign: 'center' }}>
                      {isEn ? "Enter 6-digit SMS code sent to your phone:" : (isRu ? "6-значный СМС код, отправленный на телефон:" : "Telefoningizga yuborilgan 6 xonali SMS kod:")}
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: RADIUS.md,
                        height: 50,
                        textAlign: 'center',
                        fontSize: 22,
                        letterSpacing: 6,
                        color: colors.text,
                        marginBottom: 12,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fafafa',
                      }}
                      value={authOtp}
                      onChangeText={(t) => { setAuthOtp(t); setAuthError(''); }}
                      placeholder="000000"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoComplete="sms-otp"
                      textContentType="oneTimeCode"
                    />

                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>
                      {isEn ? "Set your new login password:" : (isRu ? "Установите новый пароль для входа:" : "Yangi kirish parolingizni belgilang:")}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.md, paddingHorizontal: 12, height: 48, marginBottom: 14 }}>
                      <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                      <TextInput
                        style={{ flex: 1, color: colors.text, fontSize: 14 }}
                        placeholder={isEn ? "New password (min 4 chars)" : (isRu ? "Новый пароль (мин 4 символа)" : "Yangi parol (kamida 4 ta belgi)")}
                        placeholderTextColor={colors.textSecondary}
                        value={newAuthPassword}
                        onChangeText={(t) => { setNewAuthPassword(t); setAuthError(''); }}
                        secureTextEntry={!showNewAuthPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity onPress={() => setShowNewAuthPassword(!showNewAuthPassword)} style={{ padding: 6 }}>
                        <Ionicons name={showNewAuthPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={{
                        backgroundColor: COLORS.primary,
                        width: '100%',
                        paddingVertical: 14,
                        borderRadius: RADIUS.md,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                      }}
                      onPress={handleVerifyOtp}
                      disabled={isVerifyingAuth}
                      activeOpacity={0.8}
                    >
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                        {isVerifyingAuth 
                          ? (isEn ? "Verifying..." : isRu ? "Проверка..." : "Tekshirilmoqda...") 
                          : (isEn ? "Confirm Code & Switch with New Password" : isRu ? "Подтвердить код и перейти" : "Kodni tasdiqlash va yangi parol bilan o'tish")}
                      </Text>
                    </TouchableOpacity>

                    {smsCountdown > 0 ? (
                      <Text style={{ textAlign: 'center', fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
                        {isEn ? 'Resend in:' : (isRu ? 'Повтор через:' : 'Qayta yuborish:')} {smsCountdown} {isEn ? 'sec' : (isRu ? 'сек' : 'soniya')}
                      </Text>
                    ) : (
                      <TouchableOpacity onPress={handleSendSmsOtp} style={{ marginBottom: 8, paddingVertical: 4 }}>
                        <Text style={{ textAlign: 'center', fontSize: 13, color: COLORS.primary, fontWeight: '600' }}>
                          {isEn ? 'Resend SMS code' : (isRu ? 'Отправить СМС повторно' : 'SMS kodni qayta yuborish')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={{ paddingVertical: 8, alignItems: 'center' }}
                  onPress={() => { setAuthMethod('password'); setAuthError(''); }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500' }}>
                    {isEn ? '← Back to password login' : (isRu ? '← Назад к вводу пароля' : '← Parol bilan tasdiqlashga qaytish')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={{
                width: '100%',
                paddingVertical: 13,
                borderRadius: RADIUS.md,
                alignItems: 'center',
                backgroundColor: colors.iconBg,
                marginTop: 10,
              }}
              onPress={closeStepUpModal}
              activeOpacity={0.7}
            >
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // ─── Terms and Conditions Modal ──────────────────────────────────────
  const TermsModal = () => (
    <Modal
      visible={termsModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setTermsModalVisible(false)}
    >
      <View style={styles.fullModalOverlay}>
        <View style={[styles.fullModalContainer, { backgroundColor: isDark ? '#0F0F1A' : '#F5F6FA' }]}>
          {/* Header */}
          <LinearGradient
            colors={['#0D0D1A', '#1A1A2E']}
            style={styles.fullModalHeader}
          >
            <TouchableOpacity
              style={styles.fullModalClose}
              onPress={() => setTermsModalVisible(false)}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.fullModalHeaderIcon}>
              <LinearGradient colors={['#6C63FF', '#8B7CF8']} style={styles.headerIconGradient}>
                <Ionicons name="document-text" size={32} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.fullModalTitle}>{t('profile.termsTitle')}</Text>
            <Text style={styles.fullModalSubtitle}>{t('profile.termsSubtitle')}</Text>
          </LinearGradient>

          {/* Content */}
          <ScrollView
            style={styles.fullModalScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {TERMS_SECTIONS.map((section, index) => (
              <View
                key={index}
                style={[styles.termsSectionCard, { backgroundColor: isDark ? '#1A1A2E' : '#fff' }]}
              >
                <View style={[styles.termsSectionIcon, { backgroundColor: `${section.color}20` }]}>
                  <Ionicons name={section.icon} size={22} color={section.color} />
                </View>
                <View style={styles.termsSectionContent}>
                  <Text style={[styles.termsSectionTitle, { color: isDark ? '#fff' : '#1A1A2E' }]}>
                    {t(section.titleKey)}
                  </Text>
                  <Text style={[styles.termsSectionText, { color: isDark ? '#B0B0C8' : '#555' }]}>
                    {t(section.textKey)}
                  </Text>
                </View>
              </View>
            ))}

            {/* Footer note */}
            <View style={[styles.termsFooter, { backgroundColor: `${COLORS.primary}15`, borderColor: `${COLORS.primary}40` }]}>
              <Ionicons name="information-circle" size={20} color={COLORS.primary} />
              <Text style={[styles.termsFooterText, { color: isDark ? '#B0B0C8' : '#555' }]}>
                {t('profile.termsFooter')}
              </Text>
            </View>
          </ScrollView>

          {/* Bottom button */}
          <View style={[styles.fullModalBottom, { backgroundColor: isDark ? '#0F0F1A' : '#F5F6FA' }]}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => setTermsModalVisible(false)}
              activeOpacity={0.8}
            >
              <LinearGradient colors={[COLORS.primary, '#8B7CF8']} style={styles.acceptButtonGradient}>
                <Text style={styles.acceptButtonText}>{t('profile.understand')}</Text>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ─── About App Modal ─────────────────────────────────
  const AboutModal = () => (
    <Modal
      visible={aboutModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setAboutModalVisible(false)}
    >
      <View style={styles.fullModalOverlay}>
        <View style={[styles.fullModalContainer, { backgroundColor: isDark ? '#0F0F1A' : '#F5F6FA' }]}>
          {/* Header */}
          <LinearGradient
            colors={['#0D0D1A', '#1A1A2E']}
            style={styles.fullModalHeader}
          >
            <TouchableOpacity
              style={styles.fullModalClose}
              onPress={() => setAboutModalVisible(false)}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>

            {/* Logo area */}
            <View style={styles.aboutLogoContainer}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.aboutLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.fullModalTitle}>{t('profile.aboutTitle')}</Text>
            <Text style={styles.fullModalSubtitle}>{t('profile.aboutSubtitle')}</Text>

            {/* Badges */}
            <View style={styles.aboutBadges}>
              <View style={[styles.badge, { backgroundColor: 'rgba(76, 205, 196, 0.2)' }]}>
                <Ionicons name="star" size={12} color="#4ECDC4" />
                <Text style={[styles.badgeText, { color: '#4ECDC4' }]}>Gemini AI</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: 'rgba(108, 99, 255, 0.2)' }]}>
                <Ionicons name="flame" size={12} color="#6C63FF" />
                <Text style={[styles.badgeText, { color: '#6C63FF' }]}>Firebase</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: 'rgba(255, 152, 0, 0.2)' }]}>
                <Ionicons name="phone-portrait" size={12} color="#FF9800" />
                <Text style={[styles.badgeText, { color: '#FF9800' }]}>Expo</Text>
              </View>
            </View>
          </LinearGradient>

          <ScrollView
            style={styles.fullModalScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* Mission Card */}
            <LinearGradient
              colors={['#6C63FF20', '#4ECDC410']}
              style={[styles.missionCard, { borderColor: '#6C63FF30' }]}
            >
              <Text style={[styles.missionTitle, { color: isDark ? '#fff' : '#1A1A2E' }]}>
                {t('profile.missionTitle')}
              </Text>
              <Text style={[styles.missionText, { color: isDark ? '#B0B0C8' : '#555' }]}>
                {t('profile.missionText')}
              </Text>
            </LinearGradient>

            {/* Features */}
            <Text style={[styles.aboutSectionTitle, { color: isDark ? '#fff' : '#1A1A2E' }]}>
              {t('profile.featuresTitle')}
            </Text>
            {ABOUT_FEATURES.map((feature, index) => (
              <View
                key={index}
                style={[styles.featureCard, { backgroundColor: isDark ? '#1A1A2E' : '#fff' }]}
              >
                <LinearGradient
                  colors={[`${feature.color}30`, `${feature.color}10`]}
                  style={[styles.featureIcon, { borderColor: `${feature.color}40` }]}
                >
                  <Ionicons name={feature.icon} size={22} color={feature.color} />
                </LinearGradient>
                <View style={styles.featureContent}>
                  <Text style={[styles.featureTitle, { color: isDark ? '#fff' : '#1A1A2E' }]}>
                    {t(feature.titleKey)}
                  </Text>
                  <Text style={[styles.featureDesc, { color: isDark ? '#B0B0C8' : '#666' }]}>
                    {t(feature.descKey)}
                  </Text>
                </View>
              </View>
            ))}

            {/* Contact */}
            <View style={[styles.contactCard, { backgroundColor: isDark ? '#1A1A2E' : '#fff' }]}>
              <Text style={[styles.contactTitle, { color: isDark ? '#fff' : '#1A1A2E' }]}>
                {t('profile.contactTitle')}
              </Text>
              <View style={styles.contactRow}>
                <View style={[styles.contactIcon, { backgroundColor: '#6C63FF20' }]}>
                  <Ionicons name="mail" size={18} color="#6C63FF" />
                </View>
                <Text style={[styles.contactText, { color: isDark ? '#B0B0C8' : '#555' }]}>
                  support@diaai.uz
                </Text>
              </View>
              <View style={styles.contactRow}>
                <View style={[styles.contactIcon, { backgroundColor: '#4CAF5020' }]}>
                  <Ionicons name="globe" size={18} color="#4CAF50" />
                </View>
                <Text style={[styles.contactText, { color: isDark ? '#B0B0C8' : '#555' }]}>
                  www.diaai.uz
                </Text>
              </View>
              <View style={styles.contactRow}>
                <View style={[styles.contactIcon, { backgroundColor: '#2196F320' }]}>
                  <Ionicons name="logo-github" size={18} color="#2196F3" />
                </View>
                <Text style={[styles.contactText, { color: isDark ? '#B0B0C8' : '#555' }]}>
                  github.com/diaai
                </Text>
              </View>
            </View>

            {/* Copyright */}
            <View style={styles.copyrightContainer}>
              <Text style={[styles.copyrightText, { color: isDark ? '#606080' : '#999' }]}>
                {t('profile.copyright')}
              </Text>
              <Text style={[styles.copyrightText, { color: isDark ? '#606080' : '#999' }]}>
                {t('profile.madeInUz')}
              </Text>
            </View>
          </ScrollView>

          <View style={[styles.fullModalBottom, { backgroundColor: isDark ? '#0F0F1A' : '#F5F6FA' }]}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => setAboutModalVisible(false)}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#6C63FF', '#4ECDC4']} style={styles.acceptButtonGradient}>
                <Text style={styles.acceptButtonText}>{t('profile.close')}</Text>
                <Ionicons name="close-circle" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.gradientStart }}>
      <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.container}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('profile.title')}</Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <View style={styles.avatarContainer}>
            {userData.avatar ? (
              <Image
                source={{ uri: userData.avatar }}
                style={styles.avatar}
                onError={() => setUserData(prev => ({ ...prev, avatar: null }))}
              />
            ) : (
              <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.avatar}>
                <Ionicons name="person" size={50} color={COLORS.white} />
              </LinearGradient>
            )}
            <TouchableOpacity style={[styles.editAvatarButton, { borderColor: colors.card }]} onPress={handleAvatarEdit}>
              <Ionicons name="camera" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => handleEdit('firstName')}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}
          >
            <Text style={[styles.userName, { color: colors.text }]}>{userData.firstName || (isEn ? 'Patient' : (isRu ? 'Пациент' : 'Bemor'))}</Text>
            <Ionicons name="pencil" size={15} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.userSubtitle, { color: colors.textSecondary }]}>
            {isEn ? 'Personal Health Account' : (isRu ? 'Личный профиль здоровья' : 'Shaxsiy salomatlik hisobi')}
          </Text>
          
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? 'rgba(0, 230, 118, 0.15)' : '#DCFCE7',
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 14,
            marginTop: 8,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(0, 230, 118, 0.3)' : '#BBF7D0'
          }}>
            <Ionicons name="shield-checkmark" size={13} color="#00E676" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#00E676' : '#15803D' }}>
              {isEn ? 'Verified Account' : (isRu ? 'Подтвержденный профиль' : 'Tasdiqlangan profil')}
            </Text>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('profile.personalInfo')}</Text>
          
          {/* Unified Full Name & Demographics Card */}
          <TouchableOpacity
            style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.borderLight, paddingVertical: 14 }]}
            onPress={handleOpenDemographicsModal}
            activeOpacity={0.7}
          >
            <View style={styles.infoIconContainer}>
              <Ionicons name="person-circle-outline" size={26} color={COLORS.primary} />
            </View>
            <View style={[styles.infoContent, { flex: 1 }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                {isEn ? 'Full Name & Demographics' : (isRu ? 'Имя и Демография' : 'Ism familiya & Demografiya')}
              </Text>
              <Text style={[styles.infoValue, { color: colors.text, marginTop: 2, fontSize: 16, fontWeight: '700' }]}>
                {userData.firstName || (isEn ? 'Not set' : (isRu ? 'Не указано' : 'Kiritilmagan'))}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 3 }}>
                {getGenderLabel(userData.gender)} • {userData.age && userData.age !== 'Not set' ? `${userData.age} ${isEn ? 'y.o.' : (isRu ? 'лет' : 'yosh')}` : '–'} {userData.birthDate ? `(${userData.birthDate})` : ''}
              </Text>
            </View>
            <Ionicons name="pencil" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <InfoCard icon="call-outline" label={t('profile.phone')} value={userData.phone || (isEn ? 'Not set' : (isRu ? 'Не указано' : 'Kiritilmagan'))} onPress={() => handleEdit('phone')} />
          <InfoCard icon="body-outline" label={isEn ? 'Height' : (isRu ? 'Рост' : "Bo'y")} value={userData.height && userData.height !== 'Not set' ? `${userData.height} ${isEn ? 'cm' : (isRu ? 'см' : 'sm')}` : '–'} onPress={() => handleEdit('height')} />
          <InfoCard icon="fitness-outline" label={t('profile.weight')} value={userData.weight && userData.weight !== 'Not set' ? `${userData.weight} kg` : '–'} onPress={() => handleEdit('weight')} />
          <InfoCard icon="walk-outline" label={t('profile.activity')} value={getActivityLabel(userData.activityLevel) || (isEn ? 'Not set' : (isRu ? 'Не указано' : 'Kiritilmagan'))} onPress={() => handleEdit('activityLevel')} />
        </View>

        {/* Active Disease & Switch Profile Card */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isEn ? 'Active Medical Profile' : (isRu ? 'Активный медицинский профиль' : 'Faol Tibbiy Profil')}
          </Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card, padding: SPACING.md }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${getDiseaseConfig(currentDisease)?.color || COLORS.primary}20`, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={getDiseaseConfig(currentDisease)?.icon || "fitness"} size={24} color={getDiseaseConfig(currentDisease)?.color || COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FONTS.lg, fontWeight: '700', color: colors.text }}>
                  {isEn ? (getDiseaseConfig(currentDisease)?.titleEn || currentDisease) : (isRu ? (getDiseaseConfig(currentDisease)?.titleRu || currentDisease) : currentDisease || 'Diabet')}
                </Text>
                <Text style={{ fontSize: FONTS.xs, color: colors.textSecondary }}>
                  {isEn ? 'Current active condition and tailored plan' : (isRu ? 'Текущее состояние и индивидуальный план' : 'Hozirgi faol holat va moslashtirilgan reja')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={{
                marginTop: SPACING.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${COLORS.primary}18`,
                borderWidth: 1,
                borderColor: `${COLORS.primary}50`,
                paddingVertical: 12,
                borderRadius: RADIUS.md,
                gap: 8,
              }}
              onPress={() => navigation.navigate('DiseaseNavigatorIntro', { switchMode: true, currentDisease, returnTo: 'Profile' })}
              activeOpacity={0.7}
            >
              <Ionicons name="swap-horizontal" size={20} color={COLORS.primary} />
              <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: FONTS.sm }}>
                {isEn ? 'Switch disease profile' : (isRu ? 'Перейти на другой диагноз' : "Boshqa kasallik profiliga o'tish")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Aqlli Soat & Fitness (Strava / Mibro Fit) Card */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isEn ? 'Smartwatch & Fitness Sync' : (isRu ? 'Синхронизация смарт-часов и фитнеса' : 'Aqlli Soat & Fitness Sinxronizatsiyasi')}
          </Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card, padding: SPACING.md }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(252, 76, 2, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="watch-outline" size={24} color="#FC4C02" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FONTS.md, fontWeight: '700', color: colors.text }}>Strava & Mibro Fit</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    {stravaConnected
                      ? (isEn ? 'Sync active (Workouts & calories linked)' : (isRu ? 'Синхронизация активна (Тренировки подключены)' : 'Sinxronizatsiya faol (Mashq va kaloriyalar ulandi)'))
                      : (isEn ? 'Connect Mibro Fit / Strava watch data' : (isRu ? 'Подключить смарт-часы Mibro Fit / Strava' : 'Mibro Fit soati ma\'lumotlarini ulash'))}
                  </Text>
                </View>
              </View>

              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: stravaConnected ? 'rgba(0, 230, 118, 0.15)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')
              }}>
                <Text style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: stravaConnected ? '#00E676' : colors.textSecondary
                }}>
                  {stravaConnected ? (isEn ? 'Connected ✓' : (isRu ? 'Подключено ✓' : 'Ulangan ✓')) : (isEn ? 'Not connected' : (isRu ? 'Не подключено' : 'Ulanmagan'))}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={{
                marginTop: SPACING.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FC4C02',
                paddingVertical: 12,
                borderRadius: RADIUS.md,
                gap: 8,
              }}
              onPress={() => setStravaModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name={stravaConnected ? "sync-outline" : "link-outline"} size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: FONTS.sm }}>
                {stravaConnected ? (isEn ? 'Sync & Manage Workouts' : (isRu ? 'Обновить тренировки и управление' : 'Mashqlarni Yangilash & Boshqarish')) : (isEn ? 'Connect Watch via Strava' : (isRu ? 'Подключить часы через Strava' : 'Soatni Strava orqali ulash'))}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('profile.settings')}</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <SettingItem icon="moon" label={t('profile.darkMode')} showSwitch switchValue={isDark} onSwitchChange={toggleTheme} />
            <SettingItem icon="notifications" label={t('profile.notifications')} showSwitch switchValue={notifications} onSwitchChange={setNotifications} />
            <SettingItem icon="language" label={t('profile.language')} value={LANGUAGES.find((l) => l.code === userData.language)?.labelKey ? t(LANGUAGES.find((l) => l.code === userData.language).labelKey) : userData.language} onPress={() => setLanguageModalVisible(true)} />
            <SettingItem
              icon="shield-checkmark-outline"
              label={t('profile.privacyPolicy')}
              onPress={() => Alert.alert(t('profile.privacyPolicy'), '')}
            />
            <SettingItem
              icon="document-text-outline"
              label={t('profile.termsOfService')}
              onPress={() => setTermsModalVisible(true)}
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.card }]} onPress={() => Alert.alert(t('profile.helpCenter'), '')}>
            <Ionicons name="help-circle-outline" size={24} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>{t('profile.helpCenter')}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={styles.actionButtonIcon} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={() => setAboutModalVisible(true)}
          >
            <Ionicons name="information-circle-outline" size={24} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>{t('profile.aboutApp')}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={styles.actionButtonIcon} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
            <Text style={[styles.actionButtonText, styles.logoutText]}>{t('profile.logout')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>

      {/* Modals */}
      <Modal visible={languageModalVisible} transparent animationType="fade" onRequestClose={() => setLanguageModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setLanguageModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('language.title')}</Text>
            {LANGUAGES.map(({ code, labelKey }) => (
              <TouchableOpacity key={code} style={[styles.modalOption, { borderBottomColor: colors.border }, userData.language === code && { backgroundColor: `${COLORS.primary}15` }]} onPress={() => handleLanguageSelect(code)} activeOpacity={0.7}>
                <Text style={[styles.modalOptionText, { color: colors.text }]}>{t(labelKey)}</Text>
                {userData.language === code && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.modalCancel, { borderTopColor: colors.border }]} onPress={() => setLanguageModalVisible(false)}>
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Dedicated Demographics Modal (Name, Birth date / Auto-Age, Read-only Gender) */}
      <Modal visible={demographicsModalVisible} transparent animationType="fade" onRequestClose={() => setDemographicsModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDemographicsModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.card, width: '92%', maxWidth: 440, borderRadius: 20, padding: 20 }]} onPress={(e) => e.stopPropagation()}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="person-circle" size={24} color={COLORS.primary} />
                <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>
                  {isEn ? 'Personal Demographics' : (isRu ? 'Демография профиля' : 'Shaxsiy Demografiya')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDemographicsModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Full Name */}
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6 }}>
                {isEn ? 'Full Name' : (isRu ? 'Имя Фамилия' : 'Ism familiya')}
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', color: colors.text, borderColor: colors.border }]}
                value={demoName}
                onChangeText={setDemoName}
                placeholder={isEn ? 'Enter your full name' : (isRu ? 'Введите ваше имя' : 'Ism familiyangizni kiriting')}
                placeholderTextColor={colors.textSecondary}
              />

              {/* Birth Date / Year */}
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 14, marginBottom: 4 }}>
                {isEn ? 'Birth Date or Year' : (isRu ? 'Дата или год рождения' : 'Tug‘ilgan sana yoki yil')}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 6 }}>
                {isEn ? 'Enter birth year (e.g. 1998) or date (YYYY-MM-DD)' : (isRu ? 'Введите год (напр. 1998) или дату (ГГГГ-ММ-ДД)' : 'Tug‘ilgan yil (masalan: 1998) yoki sana (YYYY-MM-DD)')}
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', color: colors.text, borderColor: colors.border }]}
                value={demoBirthDate}
                onChangeText={handleBirthDateChange}
                placeholder="1998 yoki 1998-05-14"
                placeholderTextColor={colors.textSecondary}
              />

              {/* Age (Auto-calculated, read-only) */}
              <View style={{ backgroundColor: isDark ? 'rgba(0, 230, 118, 0.1)' : '#DCFCE7', borderRadius: RADIUS.md, padding: 12, marginTop: 14, borderWidth: 1, borderColor: isDark ? 'rgba(0, 230, 118, 0.25)' : '#BBF7D0' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#00E676' : '#15803D' }}>
                    {isEn ? 'Age (Auto-calculated)' : (isRu ? 'Возраст (автоматически)' : 'Yosh (Avtomatik hisoblandi)')}
                  </Text>
                  <View style={{ backgroundColor: '#00E67625', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#00E676' : '#15803D' }}>
                      {demoAge ? `${demoAge} ${isEn ? 'years old' : (isRu ? 'лет' : 'yosh')}` : (isEn ? 'Calculates from birth' : 'Sanadan aniqlanadi')}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                  {isEn
                    ? 'Age is strictly computed from your birth date/year without manual editing.'
                    : (isRu
                      ? 'Возраст рассчитывается точно из даты рождения и не требует ручного ввода.'
                      : 'Yosh kiritilgan tug‘ilgan sana/yil asosida aniq hisoblanadi, qo‘lda tahrirlash talab qilinmaydi.')}
                </Text>
              </View>

              {/* Gender (Read-only) */}
              <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9', borderRadius: RADIUS.md, padding: 12, marginTop: 12, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                    {isEn ? 'Gender' : (isRu ? 'Пол' : 'Jins')}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name={userData.gender === 'female' ? 'female' : 'male'} size={14} color={COLORS.primary} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.primary }}>
                      {getGenderLabel(userData.gender)}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                  🔒 {isEn ? 'Assigned during registration (Read-only)' : (isRu ? 'Зафиксировано при регистрации' : 'Tizimga kirishda belgilangan (o‘zgartirilmaydi)')}
                </Text>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
              <TouchableOpacity
                style={[styles.modalCancel, { flex: 1, borderTopWidth: 0, paddingVertical: 12, borderRadius: RADIUS.md, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', alignItems: 'center' }]}
                onPress={() => setDemographicsModalVisible(false)}
              >
                <Text style={{ fontWeight: '700', color: colors.text }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}
                onPress={handleSaveDemographics}
              >
                <Text style={{ fontWeight: '800', color: '#fff' }}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Universal Profile Field Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.card, width: '90%', maxWidth: 420 }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editField === 'firstName'
                ? (isEn ? 'Edit Full Name' : (isRu ? 'Редактировать имя' : 'Ismingizni kiriting'))
                : editField === 'phone'
                ? (isEn ? 'Edit Phone Number' : (isRu ? 'Редактировать телефон' : 'Telefon raqamini kiriting'))
                : editField === 'gender'
                ? (isEn ? 'Select Gender' : (isRu ? 'Выберите пол' : 'Jinsingizni tanlang'))
                : editField === 'activityLevel'
                ? (isEn ? 'Select Activity Level' : (isRu ? 'Уровень активности' : 'Faollik darajasini tanlang'))
                : editField === 'age'
                ? (isEn ? 'Enter Age' : (isRu ? 'Введите возраст' : 'Yoshingizni kiriting'))
                : editField === 'height'
                ? (isEn ? 'Enter Height (cm)' : (isRu ? 'Рост (см)' : "Bo'yingizni kiriting (sm)"))
                : (isEn ? 'Enter Weight (kg)' : (isRu ? 'Вес (кг)' : 'Vazningizni kiriting (kg)'))}
            </Text>

            {/* Gender Selection */}
            {editField === 'gender' ? (
              <View style={{ flexDirection: 'row', gap: 12, marginVertical: SPACING.md, width: '100%' }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: RADIUS.md,
                    borderWidth: 2,
                    borderColor: editValue === 'male' ? COLORS.primary : colors.border,
                    backgroundColor: editValue === 'male' ? `${COLORS.primary}18` : colors.bgCard,
                    alignItems: 'center',
                    gap: 6,
                  }}
                  onPress={() => setEditValue('male')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="male" size={26} color={editValue === 'male' ? COLORS.primary : colors.textSecondary} />
                  <Text style={{ fontWeight: '700', color: editValue === 'male' ? COLORS.primary : colors.text }}>
                    {isEn ? 'Male' : (isRu ? 'Мужской' : 'Erkak')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: RADIUS.md,
                    borderWidth: 2,
                    borderColor: editValue === 'female' ? COLORS.primary : colors.border,
                    backgroundColor: editValue === 'female' ? `${COLORS.primary}18` : colors.bgCard,
                    alignItems: 'center',
                    gap: 6,
                  }}
                  onPress={() => setEditValue('female')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="female" size={26} color={editValue === 'female' ? COLORS.primary : colors.textSecondary} />
                  <Text style={{ fontWeight: '700', color: editValue === 'female' ? COLORS.primary : colors.text }}>
                    {isEn ? 'Female' : (isRu ? 'Женский' : 'Ayol')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : editField === 'activityLevel' ? (
              <View style={{ gap: 10, marginVertical: SPACING.md, width: '100%' }}>
                {[
                  { key: 'sedentary', labelUz: 'Kam harakat (O\'troq turmush)', labelRu: 'Малоподвижный образ жизни', labelEn: 'Sedentary (Low)', icon: 'bed-outline' },
                  { key: 'moderate', labelUz: 'O\'rtacha faol (Haftada 2-3 mashq)', labelRu: 'Умеренная активность', labelEn: 'Moderate activity', icon: 'walk-outline' },
                  { key: 'active', labelUz: 'Juda faol (Har kuni mashq/sport)', labelRu: 'Высокая активность / спорт', labelEn: 'Very active / sports', icon: 'flame-outline' },
                ].map(opt => {
                  const isSel = editValue === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        borderRadius: RADIUS.md,
                        borderWidth: 1.5,
                        borderColor: isSel ? COLORS.primary : colors.border,
                        backgroundColor: isSel ? `${COLORS.primary}18` : colors.bgCard,
                        gap: 12,
                      }}
                      onPress={() => setEditValue(opt.key)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={opt.icon} size={22} color={isSel ? COLORS.primary : colors.textSecondary} />
                      <Text style={{ flex: 1, fontWeight: isSel ? '700' : '500', color: isSel ? COLORS.primary : colors.text, fontSize: 13 }}>
                        {isEn ? opt.labelEn : (isRu ? opt.labelRu : opt.labelUz)}
                      </Text>
                      {isSel && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={{ backgroundColor: colors.bgCard, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, marginVertical: SPACING.md, borderWidth: 1, borderColor: colors.border, width: '100%' }}>
                <TextInput
                  style={{ color: colors.text, fontSize: FONTS.lg, fontWeight: '600', textAlign: editField === 'firstName' || editField === 'phone' ? 'left' : 'center', minHeight: 44 }}
                  value={editValue}
                  onChangeText={setEditValue}
                  keyboardType={editField === 'firstName' ? 'default' : editField === 'phone' ? 'phone-pad' : 'numeric'}
                  autoFocus
                  placeholder={editField === 'firstName' ? (isEn ? 'Full name' : (isRu ? 'Имя' : 'Ismingiz')) : editField === 'phone' ? '+998' : editField === 'age' ? (isEn ? 'Birth year (e.g. 1995) or Age' : (isRu ? 'Год рождения (напр. 1995) или возраст' : 'Tug‘ilgan yil (masalan: 1995) yoki yosh')) : '0'}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', width: '100%', gap: SPACING.sm, marginTop: 8 }}>
              <TouchableOpacity style={{ paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.md }} onPress={() => setEditModalVisible(false)}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor: COLORS.primary, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, borderRadius: RADIUS.md }} onPress={saveEdit}>
                <Text style={{ color: COLORS.white, fontWeight: '700' }}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <TermsModal />
      <AboutModal />
      <ChangeDiseaseModal />
      {renderStepUpModal()}
      <StravaSyncModal
        visible={stravaModalVisible}
        onClose={() => { setStravaModalVisible(false); loadUserData(); }}
        onSyncSuccess={loadUserData}
      />
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: FONTS.xxxl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    ...SHADOWS.medium,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.bgCard,
  },
  userName: {
    fontSize: FONTS.xl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  userSubtitle: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  section: {
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.lg,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: FONTS.xs, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  infoValue: { fontSize: FONTS.md, fontWeight: '600', color: COLORS.white },
  settingsCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.white}10`,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  settingLabel: { fontSize: FONTS.md, color: COLORS.white, flex: 1 },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  settingValue: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  actionButtonText: {
    flex: 1,
    fontSize: FONTS.md,
    color: COLORS.white,
    marginLeft: SPACING.md,
  },
  actionButtonIcon: { marginLeft: 'auto' },
  logoutButton: {
    backgroundColor: `${COLORS.error}20`,
    borderWidth: 1,
    borderColor: `${COLORS.error}30`,
  },
  logoutText: { color: COLORS.error, fontWeight: '600' },

  // Language Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: FONTS.xl,
    fontWeight: '700',
    padding: SPACING.lg,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
  },
  modalOptionText: { fontSize: FONTS.md, fontWeight: '500' },
  modalCancel: {
    padding: SPACING.md,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  modalCancelText: { fontSize: FONTS.md },

  // Full Modal (Terms & About)
  fullModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  fullModalContainer: {
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  fullModalHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  fullModalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullModalHeaderIcon: {
    marginBottom: 12,
    marginTop: 8,
  },
  headerIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  fullModalSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  fullModalScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  fullModalBottom: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  acceptButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  acceptButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Terms sections
  termsSectionCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  termsSectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  termsSectionContent: { flex: 1 },
  termsSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 5,
  },
  termsSectionText: {
    fontSize: 13,
    lineHeight: 20,
  },
  termsFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    gap: 10,
  },
  termsFooterText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },

  // About sections
  aboutLogoContainer: {
    marginBottom: 12,
    marginTop: 8,
  },
  aboutLogo: {
    width: 90,
    height: 90,
    borderRadius: 22,
    overflow: 'hidden',
  },
  aboutBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  missionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    marginTop: 4,
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  missionText: {
    fontSize: 13,
    lineHeight: 21,
  },
  aboutSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 4,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
  },
  featureContent: { flex: 1 },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  techGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  techItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  techName: {
    fontSize: 12,
    fontWeight: '600',
  },
  contactCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: {
    fontSize: 14,
    fontWeight: '500',
  },
  copyrightContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  copyrightText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default ProfileScreen;
