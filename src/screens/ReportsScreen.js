import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, StatusBar, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import Svg, {
  Circle, Path, Defs,
  LinearGradient as SvgGradient, Stop, Rect, Line,
  Text as SvgText,
} from 'react-native-svg';
import { getGlucoseStatus, DIABETES_GUIDELINES, calculatePersonalizedCarbGoals } from '../utils/healthCalculations';
import { getDiseaseConfig, getMetricStatusForDisease, getMetricLabel } from '../utils/diseaseConfig';
import { getData, getMeals, getDiseaseHistory } from '../utils/storage';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import GlucoseChart from '../components/GlucoseChart';
import StravaSyncModal from '../components/StravaSyncModal';
import { getSmartwatchBiometrics } from '../services/StravaService';
import { DILDORA_AVATAR_URI } from '../constants/defaultAvatar';

const { width } = Dimensions.get('window');

// Constants moved inside component or using theme
// ─── Constants ────────────────────────────────────────────────────────────────
const BLUE   = '#4A9EFF';
const PURPLE = '#A78BFA';
const ORANGE = '#FB923C';
const GREEN  = COLORS.success;
// Weekday and Month name functions to support i18n
const getWeekDaysShort = (t) => [
  t('common.days.monShort'), t('common.days.tueShort'), t('common.days.wedShort'), 
  t('common.days.thuShort'), t('common.days.friShort'), t('common.days.satShort'), 
  t('common.days.sunShort')
];
const getWeekDaysFull = (t) => [
  t('common.days.mon'), t('common.days.tue'), t('common.days.wed'), 
  t('common.days.thu'), t('common.days.fri'), t('common.days.sat'), 
  t('common.days.sun')
];
const getMonthNames = (t) => [
  t('common.months.jan'), t('common.months.feb'), t('common.months.mar'), 
  t('common.months.apr'), t('common.months.may'), t('common.months.jun'),
  t('common.months.jul'), t('common.months.aug'), t('common.months.sep'), 
  t('common.months.oct'), t('common.months.nov'), t('common.months.dec')
];
const MONTH_LABELS  = ['1','2','3','4','5','6','7','8','9','10','11','12'];

const isoDate = (d) => {
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${dy}`;
};

// JS Date: 0=Sunday … 6=Saturday  →  Mon=0 … Sun=6
const jsToMon = (d) => (d.getDay() + 6) % 7;

// Charts replaced by GlucoseChart in main render

// ─── Donut Chart ──────────────────────────────────────────────────────────────
// ─── Donut Chart Constants ──────────────────────────────────────────────────
const R_DO = 60, STK = 20, CIRC0 = 2 * Math.PI * R_DO, CTR = 80;

const DonutChart = ({ total, colors, t }) => {
  const segments = [
    { label: t('recipes.carbs'), percent: 45, color: colors.info || '#4A9EFF', grad: ['#4A9EFF', '#60A5FA'] },
    { label: t('recipes.fat'),    percent: 30, color: colors.warning || '#FB923C', grad: ['#FB923C', '#FDBA74'] },
    { label: t('recipes.protein'),   percent: 25, color: colors.success || '#2DD36F', grad: ['#2DD36F', '#6EE7B7'] },
  ];

  let offset = 0;
  const segs = segments.map(s => {
    const dash = (s.percent / 100) * CIRC0;
    const seg  = { ...s, dash, offset };
    offset += dash;
    return seg;
  });

  return (
    <View style={styles.donutContainer}>
      <View style={styles.donutWrapper}>
        <Svg width={CTR*2} height={CTR*2}>
          <Defs>
            {segments.map((s, i) => (
              <SvgGradient key={`grad-${i}`} id={`grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={s.grad[0]} />
                <Stop offset="100%" stopColor={s.grad[1]} />
              </SvgGradient>
            ))}
          </Defs>
          {/* Background Shadow Ring */}
          <Circle cx={CTR} cy={CTR} r={R_DO + 4} fill="none"
            stroke="rgba(0,0,0,0.04)" strokeWidth={STK + 4} />
          
          <Circle cx={CTR} cy={CTR} r={R_DO} fill="none"
            stroke="rgba(255,255,255,0.06)" strokeWidth={STK} />
          {segs.map((s, i) => (
            <Circle key={i} cx={CTR} cy={CTR} r={R_DO} fill="none"
              stroke={`url(#grad-${i})`} strokeWidth={STK}
              strokeDasharray={`${s.dash} ${CIRC0 - s.dash}`}
              strokeDashoffset={-s.offset}
              strokeLinecap="round" rotation={-90}
              originX={CTR} originY={CTR} />
          ))}
        </Svg>
        <View style={styles.donutCenter}>
          <Text style={[styles.donutVal, { color: colors.text }]}>{total}</Text>
          <Text style={[styles.donutUnit, { color: colors.textSecondary }]}>{t('recipes.kcal')}</Text>
        </View>
      </View>
      <View style={styles.donutLegend}>
        {segments.map((s, i) => (
          <View key={i} style={styles.legendRow}>
            <LinearGradient colors={s.grad} style={styles.legendBar} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={[styles.legendLabel, { color: colors.text }]}>{s.label}</Text>
                <Text style={[styles.legendPct, { color: s.color }]}>{s.percent}%</Text>
              </View>
              <View style={[styles.progressBg, { backgroundColor: colors.iconBg }]}>
                <LinearGradient 
                  colors={s.grad} 
                  start={{x:0, y:0}} end={{x:1, y:0}}
                  style={[styles.progressFill, { width: `${s.percent}%` }]} 
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, iconColor, label, value, unit, trend, positive, colors }) => (
  <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
    <View style={styles.statCardHeader}>
      <View style={[styles.statIconBox, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={[styles.trendBadge, { backgroundColor: positive ? '#ECFDF5' : '#FEF2F2' }]}>
        <Ionicons name={positive ? 'trending-up' : 'trending-down'} size={12}
          color={positive ? '#10B981' : '#EF4444'} />
        <Text style={[styles.trendBadgeTxt, { color: positive ? '#10B981' : '#EF4444' }]}>{trend}</Text>
      </View>
    </View>
    <View style={styles.statContent}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={[styles.statVal, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statUnit, { color: colors.textSecondary }]}>{unit}</Text>
      </View>
    </View>
    <LinearGradient 
      colors={[`${iconColor}00`, `${iconColor}10`]} 
      style={styles.statCardBgEffect} 
      start={{x:0, y:0}} end={{x:1, y:1}}
    />
  </View>
);

// ─── Calendar ─────────────────────────────────────────────────────────────────
// Returns array of Date objects (grid cells, null for empty cells)
const buildCalendarDays = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startOffset = jsToMon(firstDay); // Mon=0
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));
  return cells;
};

const Calendar = ({ year, month, activeDates, selectedDate, onSelectDate, onPrevMonth, onNextMonth, t }) => {
  const cells = buildCalendarDays(year, month);
  const today = isoDate(new Date());
  const CELL = (width - 40 - 12) / 7; // 40=padding, 12=gaps
  const monthNames = getMonthNames(t);
  const weekDaysShort = getWeekDaysShort(t);

  return (
    <View>
      {/* Month nav */}
      <View style={styles.calNavRow}>
        <TouchableOpacity style={styles.calNavBtn} onPress={onPrevMonth} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.calMonthTitle}>
          {monthNames[month]} {year}
        </Text>
        <TouchableOpacity style={styles.calNavBtn} onPress={onNextMonth} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>
 
      {/* Weekday headers */}
      <View style={styles.calWeekRow}>
        {weekDaysShort.map((d, i) => (
          <View key={i} style={[styles.calCell, { width: CELL }]}>
            <Text style={[styles.calWeekDay, i >= 5 && { color: PURPLE }]}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Days grid */}
      <View style={styles.calGrid}>
        {cells.map((date, i) => {
          if (!date) return <View key={i} style={[styles.calCell, { width: CELL }]} />;
          const iso = isoDate(date);
          const isToday    = iso === today;
          const isSelected = selectedDate && isoDate(selectedDate) === iso;
          const hasData    = activeDates.has(iso);
          const isWeekend  = jsToMon(date) >= 5;

          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.calDayBtn,
                { width: CELL, height: CELL },
                isSelected && { backgroundColor: BLUE },
                isToday && !isSelected && { borderColor: BLUE, borderWidth: 1.5 },
              ]}
              onPress={() => onSelectDate(date)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.calDayTxt,
                isWeekend && { color: `${PURPLE}CC` },
                isSelected && { color: '#fff', fontWeight: '800' },
                isToday && !isSelected && { color: BLUE, fontWeight: '700' },
              ]}>
                {date.getDate()}
              </Text>
              {/* dot for data */}
              {hasData && (
                <View style={[
                  styles.calDot,
                  { backgroundColor: isSelected ? '#fff' : GREEN },
                ]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ─── Day Stats Card ───────────────────────────────────────────────────────────
const DayStatsCard = ({ date, meals, onSwitchToWeek, t, diseaseConfig }) => {
  const { colors } = useTheme();
  const completedMeals = (meals || []).filter(m => m.completed !== false);
  const total = {
    calories: Math.round(completedMeals.reduce((a, m) => a + (parseFloat(m.calories) || 0), 0)),
    sugar:    Math.round(completedMeals.reduce((a, m) => a + (parseFloat(m.sugar)    || 0), 0)),
    carbs:    Math.round(completedMeals.reduce((a, m) => a + (parseFloat(m.carbs)    || 0), 0)),
    protein:  Math.round(completedMeals.reduce((a, m) => a + (parseFloat(m.protein)  || 0), 0)),
  };
  const weekDaysFull = getWeekDaysFull(t);
  const monthNames = getMonthNames(t);
  const weekDayName = weekDaysFull[jsToMon(date)];
  const dateStr = `${date.getDate()} ${monthNames[date.getMonth()]}`;

  return (
    <View style={[styles.dayCard, { backgroundColor: colors.cardPremium, borderColor: colors.borderLight }]}>
      <View style={[styles.dayCardHeader, { borderBottomColor: colors.borderLight }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.dayCardDate, { color: colors.text }]}>{dateStr}</Text>
          <Text style={[styles.dayCardWeekday, { color: colors.textSecondary }]}>{weekDayName}</Text>
        </View>
        <TouchableOpacity style={[styles.dayWeekBtn, { backgroundColor: `${colors.info}15`, borderColor: `${colors.info}30` }]} onPress={onSwitchToWeek} activeOpacity={0.8}>
          <Ionicons name="stats-chart" size={14} color={colors.info} />
          <Text style={[styles.dayWeekBtnTxt, { color: colors.info }]}>{t('reports.weekly')}</Text>
        </TouchableOpacity>
      </View>

      {meals.length === 0 ? (
        <View style={styles.noDataWrap}>
          <Ionicons name="cafe-outline" size={40} color={colors.iconBg} />
          <Text style={[styles.noDataTxt, { color: colors.textSecondary }]}>{t('reports.noDataFound')}</Text>
        </View>
      ) : (
        <>
          <View style={[styles.dayMacroRow, { borderBottomColor: colors.borderLight }]}>
             {[
               { label: t('dashboard.calories'), val: total.calories, unit: t('recipes.kcal'),  color: colors.warning || '#FB923C' },
               { label: t('dashboard.sugar'),   val: total.sugar,    unit: 'mg/dL', color: colors.error   || '#FF5252' },
               { label: t('recipes.carbs'),  val: total.carbs,    unit: 'g',     color: colors.info    || '#4A9EFF' },
               { label: t('recipes.protein'),    val: total.protein,  unit: 'g',     color: colors.success || '#2DD36F' },
             ].map((m, i) => (
               <View key={i} style={styles.dayMacro}>
                 <Text style={[styles.dayMacroVal, { color: m.color }]}>{m.val}</Text>
                 <Text style={[styles.dayMacroUnit, { color: colors.textSecondary }]}>{m.unit}</Text>
                 <Text style={[styles.dayMacroLabel, { color: colors.textSecondary }]}>{m.label}</Text>
               </View>
             ))}
           </View>

          {/* Meal list */}
          <Text style={[styles.mealListTitle, { color: colors.textSecondary }]}>{t('reports.consumed')} ({meals.length})</Text>
          {meals.map((meal, i) => {
            let primaryMetricObj = { label: "Ko'rsatkich", unit: '', key: 'sugar' };
            let pVal = meal.sugar || 0;
            if (diseaseConfig) {
              primaryMetricObj = diseaseConfig.metrics[0];
              pVal = meal[primaryMetricObj.key] || 0;
            }
            
            const isHigh = primaryMetricObj.key === 'sugar' ? pVal > 180 : false;
            const isLow = primaryMetricObj.key === 'sugar' ? pVal > 0 && pVal < 70 : false;
            let statusColor = '#00E676';
            if (isHigh) statusColor = '#FF5252';
            else if (isLow) statusColor = '#FB923C';

            const time = meal.timestamp
              ? new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';
            
            return (
              <View key={i} style={[styles.mealLogItem, i > 0 && { borderTopColor: colors.borderLight, borderTopWidth: 1 }]}>
                <View style={[styles.mealLogIcon, { backgroundColor: `${statusColor}15` }]}>
                  <Ionicons name="restaurant" size={16} color={statusColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.mealLogName, { color: colors.text }]}>{meal.name || t('common.food')}</Text>
                  <Text style={[styles.mealLogTime, { color: colors.textSecondary }]}>{time}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={[styles.miniStatus, { backgroundColor: `${statusColor}20` }]}>
                    <Text style={[styles.miniStatusTxt, { color: statusColor, fontWeight: '700' }]}>
                      {pVal} {primaryMetricObj.unit}
                    </Text>
                  </View>
                  <Text style={[styles.mealLogCal, { color: colors.textSecondary }]}>{meal.calories} {t('recipes.kcal')}</Text>
                </View>
              </View>
            );
          })}
        </>
      )}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const PERIODS = [
  { id: 'week',  label: 'weekly',  icon: 'calendar-outline' },
  { id: 'month', label: 'monthly',     icon: 'calendar' },
  { id: 'year',  label: 'year',    icon: 'stats-chart-outline' },
];

const ReportsScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const today = new Date();

  // Initial defaults
  const lbs7 = getWeekDaysShort(t);
  const [labels, setLabels] = useState(lbs7);
  const [period, setPeriod] = useState('week'); // week, month, year
  const [viewMode, setViewMode] = useState('current'); // 'current' or 'history'
  const [historyData, setHistoryData] = useState([]);
  const [allMeals, setAllMeals] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [averages, setAverages] = useState({ primary:0, calories:0, carbs:0 });
  const [diseaseConfig, setDiseaseConfig] = useState(getDiseaseConfig('Umumiy'));
  const [exerciseLogs, setExerciseLogs] = useState([]);
  const [exerciseStats, setExerciseStats] = useState({ totalCalories: 0, count: 0, logs: [] });
  const [biometrics, setBiometrics] = useState(null);
  const [stravaModalVisible, setStravaModalVisible] = useState(false);
  const [profileName, setProfileName] = useState('Dia AI Foydalanuvchisi');
  const [profileAvatar, setProfileAvatar] = useState(null);
  const [labReports, setLabReports] = useState([]);
  const [latestHemoglobin, setLatestHemoglobin] = useState('94 g/L');

  const loadData = async () => {
    try {
      const stored = await getMeals();
      const diseaseHist = await getDiseaseHistory();
      const primaryDisease = await getData('primaryDisease');
      const config = getDiseaseConfig(primaryDisease);
      const [rawLabs, lastHb, lastHbStatus, lastSummary] = await Promise.all([
        getData('medical_lab_reports').catch(() => []),
        getData('last_hemoglobin').catch(() => ''),
        getData('last_hemoglobin_status').catch(() => ''),
        getData('ai_medical_summary').catch(() => '')
      ]);
      let labs = [];
      if (Array.isArray(rawLabs)) {
        labs = rawLabs;
      } else if (typeof rawLabs === 'string') {
        try { labs = JSON.parse(rawLabs); } catch(e) { labs = []; }
      }
      
      const effectiveHb = lastHb || (labs.length > 0 ? labs[0].hemoglobin : '94 g/L');
      if (effectiveHb) setLatestHemoglobin(effectiveHb);

      if (labs.length === 0 && effectiveHb) {
        labs = [{
          id: 'lab_default',
          date: new Date().toISOString(),
          test_name: i18n.language?.startsWith('en') ? 'Complete Blood Count: Hemoglobin' : (i18n.language?.startsWith('ru') ? 'Общий анализ крови: Гемоглобин' : 'Umumiy qon tahlili: Gemoglobin'),
          patient_name: profileName || "Dildora G'ofurova",
          hemoglobin: effectiveHb,
          hemoglobin_norm: '120 - 140 g/L',
          hemoglobin_status: lastHbStatus || (parseFloat(effectiveHb) < 120 ? (i18n.language?.startsWith('en') ? 'Low (Anemia)' : (i18n.language?.startsWith('ru') ? 'Низкий (Анемия)' : 'Past (Kamqonlik/Anemiya)')) : "Me'yorda"),
          summary: lastSummary || (parseFloat(effectiveHb) < 120
            ? (i18n.language?.startsWith('en')
              ? `• Hemoglobin level (${effectiveHb}) is below reference norm (120 - 140 g/L). Anemia observed.\n• Iron-rich nutrition and physician consultation recommended.`
              : (i18n.language?.startsWith('ru')
                ? `• Уровень гемоглобина (${effectiveHb}) ниже нормы (120 - 140 г/л). Выявлена анемия.\n• Рекомендована консультация врача.`
                : `• Gemoglobin darajasi (${effectiveHb}) klinik me'yordan (120 - 140 g/L) past. Kamqonlik (anemiya) belgilari mavjud.\n• Temirga boy taomnoma va shifokor ko'rigi tavsiya etiladi.`))
            : "• Ko'rsatkichlar me'yorda.")
        }];
      }
      
      setDiseaseConfig(config);
      setAllMeals(stored || []);
      setHistoryData(diseaseHist || []);
      setLabReports(labs);
      
      const primaryKeyResolved = config?.metrics?.[0]?.key || 'sugar';
      buildChartData(stored || [], period, primaryKeyResolved);
    } catch (e) {
      console.warn('Reports load error', e);
    }
  };

  const primaryMetricObj = diseaseConfig.metrics[0];
  const primaryKey = primaryMetricObj.key;
  const accentColor = primaryMetricObj.color || '#4A9EFF';


  // Calendar state
  const [calYear,       setCalYear]       = useState(today.getFullYear());
  const [calMonth,      setCalMonth]      = useState(today.getMonth());
  const [selectedDate,  setSelectedDate]  = useState(null);
  const [selectedMeals, setSelectedMeals] = useState([]);
  // ISO dates that have meal data
  const [activeDates,   setActiveDates]   = useState(new Set());
  const [personalizedGoals, setPersonalizedGoals] = useState(null);
  const [exportingPdf,  setExportingPdf]  = useState(false);

  // ── load all meals (focus da, period dan mustaqil) ────────────────────────
  useFocusEffect(useCallback(() => {
    loadData();
    const load = async () => {
      const meals = await getMeals();
      setAllMeals(meals);
      const [rawLabs, lastHb, lastHbStatus, lastSummary] = await Promise.all([
        getData('medical_lab_reports').catch(() => []),
        getData('last_hemoglobin').catch(() => ''),
        getData('last_hemoglobin_status').catch(() => ''),
        getData('ai_medical_summary').catch(() => '')
      ]);
      let labs = [];
      if (Array.isArray(rawLabs)) {
        labs = rawLabs;
      } else if (typeof rawLabs === 'string') {
        try { labs = JSON.parse(rawLabs); } catch(e) { labs = []; }
      }
      const effectiveHb = lastHb || (labs.length > 0 ? labs[0].hemoglobin : '94 g/L');
      if (effectiveHb) setLatestHemoglobin(effectiveHb);

      if (labs.length === 0 && effectiveHb) {
        labs = [{
          id: 'lab_default',
          date: new Date().toISOString(),
          test_name: i18n.language?.startsWith('en') ? 'Complete Blood Count: Hemoglobin' : (i18n.language?.startsWith('ru') ? 'Общий анализ крови: Гемоглобин' : 'Umumiy qon tahlili: Gemoglobin'),
          patient_name: profileName || "Dildora G'ofurova",
          hemoglobin: effectiveHb,
          hemoglobin_norm: '120 - 140 g/L',
          hemoglobin_status: lastHbStatus || (parseFloat(effectiveHb) < 120 ? (i18n.language?.startsWith('en') ? 'Low (Anemia)' : (i18n.language?.startsWith('ru') ? 'Низкий (Анемия)' : 'Past (Kamqonlik/Anemiya)')) : "Me'yorda"),
          summary: lastSummary || (parseFloat(effectiveHb) < 120
            ? (i18n.language?.startsWith('en')
              ? `• Hemoglobin level (${effectiveHb}) is below reference norm (120 - 140 g/L). Anemia observed.\n• Iron-rich nutrition and physician consultation recommended.`
              : (i18n.language?.startsWith('ru')
                ? `• Уровень гемоглобина (${effectiveHb}) ниже нормы (120 - 140 г/л). Выявлена анемия.\n• Рекомендована консультация врача.`
                : `• Gemoglobin darajasi (${effectiveHb}) klinik me'yordan (120 - 140 g/L) past. Kamqonlik (anemiya) belgilari mavjud.\n• Temirga boy taomnoma va shifokor ko'rigi tavsiya etiladi.`))
            : "• Ko'rsatkichlar me'yorda.")
        }];
      }
      setLabReports(labs);
      // build activeDates set
      const s = new Set(meals.filter(m => m.completed !== false).map(m => isoDate(new Date(m.timestamp))));
      setActiveDates(s);
      
      const [savedFirst, savedUserName, savedAv] = await Promise.all([
        getData('firstName'),
        getData('userName'),
        getData('userAvatar'),
      ]);
      const firstNameStr = savedFirst || savedUserName || "Dildora G'ofurova";
      setProfileName(firstNameStr);
      setProfileAvatar(savedAv || DILDORA_AVATAR_URI);
      
      // Calculate Personalized Goals
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

      const primaryDisease = await getData('primaryDisease');
      const dConfig = getDiseaseConfig(primaryDisease);
      setDiseaseConfig(dConfig);

      const [rawAtExHistory, rawExHistory, rawStravaLogs, todayCalories, bioData] = await Promise.all([
        getData('@exercise_history'),
        getData('exercise_history'),
        getData('strava_synced_logs'),
        getData('today_burned_calories'),
        getSmartwatchBiometrics()
      ]);
      let exHistory = Array.isArray(rawAtExHistory) && rawAtExHistory.length > 0 
        ? rawAtExHistory 
        : (Array.isArray(rawExHistory) ? rawExHistory : []);
      if (!exHistory || exHistory.length === 0) {
        if (typeof rawAtExHistory === 'string') {
          try { exHistory = JSON.parse(rawAtExHistory); } catch(e){}
        } else if (typeof rawExHistory === 'string') {
          try { exHistory = JSON.parse(rawExHistory); } catch(e){}
        }
      }
      if (!exHistory || exHistory.length === 0) {
        if (rawStravaLogs) {
          try { exHistory = typeof rawStravaLogs === 'string' ? JSON.parse(rawStravaLogs) : rawStravaLogs; } catch(e){}
        }
      }
      if (!exHistory || exHistory.length === 0) {
        exHistory = [
          {
            id: 'strava_today',
            title: 'Workout (mibrofit sync strava)',
            location: 'Mibro Fit Smartwatch',
            distanceKm: null,
            duration: 26,
            durationMin: '26:08',
            calories: 195,
            timestamp: new Date().toISOString(),
            icon: 'barbell-outline',
            color: '#FC4C02',
            source: 'Mibro Fit -> Strava',
            muscles: 'Qorin va Qo\'llar'
          },
          {
            id: 'strava_nov20',
            title: 'Walk (mibrofit sync strava)',
            location: 'Samarqand shahri',
            distanceKm: '4.64',
            pace: '11:39 /km',
            duration: 54,
            durationMin: '54m 5s',
            calories: 290,
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            icon: 'walk-outline',
            color: '#FC4C02',
            source: 'Mibro Fit -> Strava'
          },
          {
            id: 'strava_nov19',
            title: 'Walk (mibrofit sync strava)',
            location: 'Samarqand shahri',
            distanceKm: '3.59',
            pace: '16:42 /km',
            duration: 60,
            durationMin: '1h 0m',
            calories: 235,
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            icon: 'walk-outline',
            color: '#FC4C02',
            source: 'Mibro Fit -> Strava'
          }
        ];
      }
      setExerciseLogs(exHistory);
      if (bioData) setBiometrics(bioData);

      const now = new Date();
      let filteredEx = exHistory;
      if (period === 'week') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredEx = exHistory.filter(h => new Date(h.timestamp) >= sevenDaysAgo);
      } else if (period === 'month') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredEx = exHistory.filter(h => new Date(h.timestamp) >= thirtyDaysAgo);
      }
      const totalBurned = filteredEx.reduce((sum, item) => sum + (parseFloat(item.calories) || 0), 0);
      const effectiveBurned = Math.max(totalBurned, parseInt(todayCalories) || 0);
      setExerciseStats({
        totalCalories: Math.round(effectiveBurned),
        count: filteredEx.length || (effectiveBurned > 0 ? 1 : 0),
        logs: filteredEx.slice(0, 10)
      });

      buildChartData(meals.filter(m => m.completed !== false), period, dConfig.metrics[0].key);
    };
    load();
  }, [])); // eslint-disable-line react-hooks/exhaustive-deps

  // ── period o'zgarganda chart va mashqlar yangilansin ───────────────────────
  useEffect(() => {
    if (allMeals.length > 0) {
      buildChartData(allMeals, period, primaryKey);
    }
    if (exerciseLogs.length > 0) {
      const now = new Date();
      let filteredEx = exerciseLogs;
      if (period === 'week') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredEx = exerciseLogs.filter(h => new Date(h.timestamp) >= sevenDaysAgo);
      } else if (period === 'month') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredEx = exerciseLogs.filter(h => new Date(h.timestamp) >= thirtyDaysAgo);
      }
      const totalBurned = filteredEx.reduce((sum, item) => sum + (parseFloat(item.calories) || 0), 0);
      setExerciseStats(prev => ({
        totalCalories: Math.round(totalBurned) || prev.totalCalories,
        count: filteredEx.length || (totalBurned > 0 ? 1 : prev.count),
        logs: filteredEx.slice(0, 10)
      }));
    }
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── chart data ────────────────────────────────────────────────────────────
  const buildChartData = (meals, p, pKey) => {
    const resolvedKey = (typeof pKey === 'string' && pKey) ? pKey : (primaryKey || diseaseConfig?.metrics?.[0]?.key || 'sugar');
    const now = new Date();
    if (p === 'year') {
      const mo = Array(12).fill(0).map(() => ({ primary:0, calories:0, carbs:0, count:0 }));
      meals.forEach(m => {
        const idx = new Date(m.timestamp).getMonth();
        mo[idx].primary  += parseFloat(m[resolvedKey]) || 0;
        mo[idx].calories += parseFloat(m.calories)     || 0;
        mo[idx].carbs    += parseFloat(m.carbs)        || 0;
        mo[idx].count++;
      });
      const activeMonthsPrimary = mo.filter(d => d.primary > 0);
      const activeMonthsCal = mo.filter(d => d.calories > 0);
      const activeMonthsCarb = mo.filter(d => d.carbs > 0);
      setLabels(MONTH_LABELS);
      setChartData(mo.map(d => Math.round(d.primary)));
      setAverages({
        primary:  activeMonthsPrimary.length > 0 ? Math.round(activeMonthsPrimary.reduce((a, c) => a + c.primary, 0) / activeMonthsPrimary.length) : 0,
        calories: activeMonthsCal.length > 0 ? Math.round(activeMonthsCal.reduce((a, c) => a + c.calories, 0) / activeMonthsCal.length) : 0,
        carbs:    activeMonthsCarb.length > 0 ? Math.round(activeMonthsCarb.reduce((a, c) => a + c.carbs, 0) / activeMonthsCarb.length) : 0,
      });
      return;
    }

    // ── Haftalik (7 kun) ────────────────────────────────────────────────────
    if (p === 'week') {
      // Bugundan 6 kun oldinga qadar. Key = 'YYYY-MM-DD'
      const days7 = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        days7.push(d);
      }
      // Har kun uchun haqiqiy hafta kuni labelini olamiz
      const lbs7 = days7.map(d => getWeekDaysShort(t)[jsToMon(d)]);
      const grouped7 = {};
      days7.forEach(d => { grouped7[isoDate(d)] = { primary:0, calories:0, carbs:0 }; });
      meals.forEach(m => {
        const k = isoDate(new Date(m.timestamp));
        if (grouped7[k]) {
          grouped7[k].primary  += parseFloat(m[resolvedKey]) || 0;
          grouped7[k].calories += parseFloat(m.calories)     || 0;
          grouped7[k].carbs    += parseFloat(m.carbs)        || 0;
        }
      });
      const vals7 = days7.map(d => Math.round(grouped7[isoDate(d)].primary));
      const all7  = Object.values(grouped7);
      const activePrimaryDays = all7.filter(d => d.primary > 0);
      const activeCalDays = all7.filter(d => d.calories > 0);
      const activeCarbDays = all7.filter(d => d.carbs > 0);
      setLabels(lbs7);
      setChartData(vals7);
      setAverages({
        primary:  activePrimaryDays.length > 0 ? Math.round(activePrimaryDays.reduce((a,c) => a+c.primary, 0) / activePrimaryDays.length) : 0,
        calories: activeCalDays.length > 0 ? Math.round(activeCalDays.reduce((a,c) => a+c.calories, 0) / activeCalDays.length) : 0,
        carbs:    activeCarbDays.length > 0 ? Math.round(activeCarbDays.reduce((a,c) => a+c.carbs, 0) / activeCarbDays.length) : 0,
      });
      return;
    }

    // ── Oylik (30 kun) ──────────────────────────────────────────────────────
    const days30 = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      days30.push(d);
    }
    const grouped30 = {};
    days30.forEach(d => { grouped30[isoDate(d)] = { primary:0, calories:0, carbs:0 }; });
    meals.forEach(m => {
      const k = isoDate(new Date(m.timestamp));
      if (grouped30[k]) {
        grouped30[k].primary  += parseFloat(m[resolvedKey]) || 0;
        grouped30[k].calories += parseFloat(m.calories)     || 0;
        grouped30[k].carbs    += parseFloat(m.carbs)        || 0;
      }
    });
    const lbs30 = days30.map(d => `${d.getDate()}`);
    const vals30 = days30.map(d => Math.round(grouped30[isoDate(d)].primary));
    const all30  = Object.values(grouped30);
    const activePrimaryDays30 = all30.filter(d => d.primary > 0);
    const activeCalDays30 = all30.filter(d => d.calories > 0);
    const activeCarbDays30 = all30.filter(d => d.carbs > 0);
    setLabels(lbs30);
    setChartData(vals30);
    setAverages({
      primary:  activePrimaryDays30.length > 0 ? Math.round(activePrimaryDays30.reduce((a,c) => a+c.primary, 0) / activePrimaryDays30.length) : 0,
      calories: activeCalDays30.length > 0 ? Math.round(activeCalDays30.reduce((a,c) => a+c.calories, 0) / activeCalDays30.length) : 0,
      carbs:    activeCarbDays30.length > 0 ? Math.round(activeCarbDays30.reduce((a,c) => a+c.carbs, 0) / activeCarbDays30.length) : 0,
    });
  };

  // ── calendar handlers ─────────────────────────────────────────────────────
  const handleSelectDate = (date) => {
    setSelectedDate(date);
    const iso = isoDate(date);
    const dayMeals = allMeals.filter(m => isoDate(new Date(m.timestamp)) === iso);
    setSelectedMeals(dayMeals);
  };

  // Switch to week and highlight correct weekday
  const handleSwitchToWeek = () => {
    if (!selectedDate) return;
    setPeriod('week');
    setSelectedDate(null);
  };

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(y => y - 1);
    } else {
      setCalMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const handleExportPDF = async (historyRecord = null) => {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      const name = await getData('firstName') || 'Dia AI Foydalanuvchisi';
      const weight = await getData('weight') || 'Not set';
      const height = await getData('height') || 'Not set';
      const age = await getData('age') || 'Not set';
      const gender = await getData('gender') || 'Not set';
      const activityLevel = await getData('activityLevel') || 'Not set';

      const [storedLabs, storedLastHb, storedLastHbStatus, rawAtEx, rawPlainEx, todayCalories] = await Promise.all([
        getData('medical_lab_reports').catch(() => []),
        getData('last_hemoglobin').catch(() => ''),
        getData('last_hemoglobin_status').catch(() => ''),
        getData('@exercise_history').catch(() => []),
        getData('exercise_history').catch(() => []),
        getData('today_burned_calories').catch(() => 0)
      ]);

      const effectiveLabReports = (Array.isArray(storedLabs) && storedLabs.length > 0) ? storedLabs : (labReports || []);
      const firstLab = (effectiveLabReports && effectiveLabReports.length > 0) ? effectiveLabReports[0] : null;

      let effectiveHb = firstLab?.hemoglobin || storedLastHb || latestHemoglobin || '94 g/L';
      if (!effectiveHb.includes('g/L') && !effectiveHb.includes('г/л')) {
        const m = String(effectiveHb).match(/[\d.]+/);
        if (m) effectiveHb = `${m[0]} g/L`;
      }
      const hbNum = parseFloat(String(effectiveHb).match(/[\d.]+/)?.[0] || '94');
      const isHbLow = hbNum < 120;
      const isHbHigh = hbNum > 160;

      const now = historyRecord ? new Date(historyRecord.endDate) : new Date();
      const exportMeals = historyRecord ? (historyRecord.meals || []) : allMeals;
      const exportDiseaseConfig = historyRecord ? getDiseaseConfig(historyRecord.disease) : diseaseConfig;
      const exportPrimaryKey = exportDiseaseConfig.metrics[0].key;
      const lang = i18n.language || 'uz';

      // Label Helper
      const getTransValue = (keyUz, keyRu, keyEn) => {
        return lang === 'ru' ? keyRu : (lang === 'en' ? keyEn : keyUz);
      };

      const defaultHbStatus = isHbLow
        ? getTransValue('Past (Kamqonlik/Anemiya)', 'Низкий (Анемия)', 'Low (Anemia)')
        : (isHbHigh
            ? getTransValue('Yuqori', 'Повышенный', 'High')
            : getTransValue("Me'yorda", "В норме", "Normal"));
      const hbStatusText = firstLab?.hemoglobin_status || storedLastHbStatus || defaultHbStatus;
      const testTitle = firstLab?.test_name || getTransValue('Umumiy qon tahlili: Gemoglobin', 'Общий анализ крови: Гемоглобин', 'Complete Blood Count: Hemoglobin');
      const patientDisplayName = firstLab?.patient_name || profileName || name || getTransValue('Bemor', 'Пациент', 'Patient');
      const refRange = firstLab?.hemoglobin_norm || '120 - 140 g/L';

      // Exercise stats for PDF
      let exList = Array.isArray(rawAtEx) && rawAtEx.length > 0 ? rawAtEx : (Array.isArray(rawPlainEx) ? rawPlainEx : (exerciseStats.logs || []));
      const pdfTotalBurned = Math.max(
        exList.reduce((sum, item) => sum + (parseFloat(item.calories) || 0), 0),
        parseInt(todayCalories) || exerciseStats.totalCalories || 0
      );

      // Safely formats JS Date or ISO String to local DD.MM.YYYY HH:MM
      const formatPDFDate = (dateOrStr) => {
        if (!dateOrStr) return '';
        const d = new Date(dateOrStr);
        if (isNaN(d.getTime())) return String(dateOrStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day}.${month}.${year} ${hours}:${minutes}`;
      };

      // 1. Calculate multi-period stats dynamically
      const calculatePeriodStats = (daysLimit) => {
        const boundaryDate = new Date(now.getTime());
        boundaryDate.setDate(now.getDate() - daysLimit);
        
        // Filter active completed meals in this period
        const periodMeals = exportMeals.filter(m => new Date(m.timestamp) >= boundaryDate && m.completed !== false);
        
        if (periodMeals.length === 0) {
          return { primary: 0, calories: 0, carbs: 0, xe: 0 };
        }
        
        const totalPrimary = periodMeals.reduce((sum, m) => sum + (parseFloat(m[exportPrimaryKey]) || 0), 0);
        const totalCalories = periodMeals.reduce((sum, m) => sum + (parseFloat(m.calories) || 0), 0);
        const totalCarbs = periodMeals.reduce((sum, m) => sum + (parseFloat(m.carbs) || 0), 0);
        
        // Count unique dates in the period with meals to divide by active days, or divide by days limit (cap at daysLimit)
        const uniqueDates = new Set(periodMeals.map(m => isoDate(new Date(m.timestamp))));
        const activeDaysCount = Math.max(uniqueDates.size, 1);
        
        return {
          primary: Math.round(totalPrimary / activeDaysCount),
          calories: Math.round(totalCalories / activeDaysCount),
          carbs: Math.round(totalCarbs / activeDaysCount),
          xe: Math.round((totalCarbs / periodMeals.length) / DIABETES_GUIDELINES.CARBS.XE_CONVERSION) || 0
        };
      };

      const weeklyStats = calculatePeriodStats(7);
      const monthlyStats = calculatePeriodStats(30);
      const yearlyStats = calculatePeriodStats(365);
      const primaryMetricObj = exportDiseaseConfig.metrics[0];

      // 2. Dynamic medical recommendation based on primary levels
      const activePrimaryAvg = monthlyStats.primary || weeklyStats.primary || averages.primary || 0;
      let assessmentColor = '#10B981'; // Green
      let assessmentBg = '#F3FBF7';
      let assessmentTitle = '';
      let assessmentText = '';

      if (isHbLow) {
        assessmentTitle = getTransValue('Kamqonlik (Anemiya) - Gemoglobin Past', 'Анемия - Низкий уровень гемоглобина', 'Anemia - Low Hemoglobin Level');
        assessmentText = getTransValue(
          `Sizning gemoglobin ko'rsatkichingiz (${effectiveHb}) me'yordan (${refRange}) past. Kamqonlik belgilari aniqlangan: temirga boy mahsulotlar (mol go'shti, jigar, anor, grechka) iste'mol qilish va shifokor ko'rigi qat'iy tavsiya etiladi.`,
          `Ваш уровень гемоглобина (${effectiveHb}) ниже нормы (${refRange}). Выявлены признаки анемии: рекомендуется питание, богатое железом, и консультация терапевта/гематолога.`,
          `Your hemoglobin level (${effectiveHb}) is below the reference range (${refRange}). Indicating anemia: iron-rich nutrition and physician consultation are strongly advised.`
        );
        assessmentColor = '#EF4444';
        assessmentBg = '#FEF2F2';
      } else if (activePrimaryAvg === 0) {
        assessmentTitle = getTransValue('Ma\'lumot yetarli emas', 'Недостаточно данных', 'Insufficient Data');
        assessmentText = getTransValue('Tavsiyalar berish uchun ko\'rsatkichlarni kiritishni davom ettiring.', 'Продолжайте вводить показатели для получения рекомендаций.', 'Continue entering your metrics to receive recommendations.');
        assessmentColor = '#64748B';
        assessmentBg = '#F1F5F9';
      } else if (exportPrimaryKey === 'sugar' && activePrimaryAvg > 180) {
        // Hyperglycemia (Diabet)
        assessmentTitle = getTransValue('Yuqori xavf - Giperglikemiya', 'Высокий риск - Гипергликемия', 'High Risk - Hyperglycemia');
        assessmentText = getTransValue('Qon shakaringiz doimiy ravishda yuqori. Zudlik bilan shifokoringizga murojaat qiling va insulin yoki dori miqdorini qayta ko\'rib chiqing.', 'Ваш уровень сахара в крови стабильно высокий. Немедленно обратитесь к врачу и пересмотрите дозировку инсулина или лекарств.', 'Your blood sugar is consistently high. Consult your doctor immediately and review your insulin or medication dosage.');
        assessmentColor = '#EF4444';
        assessmentBg = '#FEF2F2';
      } else if (exportPrimaryKey === 'sugar' && activePrimaryAvg < 70) {
        // Hypoglycemia (Diabet)
        assessmentTitle = getTransValue('Xavfli - Gipoglikemiya', 'Опасно - Гипогликемия', 'Danger - Hypoglycemia');
        assessmentText = getTransValue('Sizda qon shakari tushib ketish holatlari ko\'p. Karbonhidrat qabulini oshiring va shifokor bilan maslahatlashing.', 'У вас частые случаи падения сахара в крови. Увеличьте потребление углеводов и проконсультируйтесь с врачом.', 'You have frequent episodes of low blood sugar. Increase your carbohydrate intake and consult your doctor.');
        assessmentColor = '#F59E0B';
        assessmentBg = '#FFFBEB';
      } else if (exportPrimaryKey === 'systolic' && activePrimaryAvg >= 180) {
        // Gipertenziv kriz
        assessmentTitle = getTransValue('Gipertenziv kriz', 'Гипертонический криз', 'Hypertensive Crisis');
        assessmentText = getTransValue('Qon bosimingiz juda xavfli darajada yuqori. Darhol tibbiy yordam chaqiring.', 'Ваше артериальное давление критически высокое. Немедленно вызовите скорую помощь.', 'Your blood pressure is critically high. Call emergency services immediately.');
        assessmentColor = '#EF4444';
        assessmentBg = '#FEF2F2';
      } else if (exportPrimaryKey === 'systolic' && activePrimaryAvg >= 130) {
        // Bosim yuqori
        assessmentTitle = getTransValue('Bosim yuqori', 'Повышенное давление', 'High Blood Pressure');
        assessmentText = getTransValue('Qon bosimingiz ko\'tarilgan. Tuz qabulini kamaytiring, shifokor bilan maslahatlashing.', 'Ваше давление повышено. Уменьшите потребление соли и проконсультируйтесь с врачом.', 'Your blood pressure is elevated. Reduce salt intake and consult your doctor.');
        assessmentColor = '#F59E0B';
        assessmentBg = '#FFFBEB';
      } else if (exportPrimaryKey === 'systolic' && activePrimaryAvg < 90) {
        // Bosim past
        assessmentTitle = getTransValue('Bosim past', 'Пониженное давление', 'Low Blood Pressure');
        assessmentText = getTransValue('Qon bosimingiz past. Ko\'proq suyuqlik iching va shifokor ko\'rigidan o\'ting.', 'Ваше давление понижено. Пейте больше жидкости и обратитесь к врачу.', 'Your blood pressure is low. Drink more fluids and see your doctor.');
        assessmentColor = '#F59E0B';
        assessmentBg = '#FFFBEB';
      } else if (exportPrimaryKey === 'heartRate' && activePrimaryAvg >= 130) {
        // Taxikardiya
        assessmentTitle = getTransValue('Taxikardiya', 'Тахикардия', 'Tachycardia');
        assessmentText = getTransValue('Yurak urishi juda tez. Stressni kamaytiring va kardiolog ko\'rigidan o\'ting.', 'Сердечный ритм слишком частый. Снизьте стресс и обратитесь к кардиологу.', 'Heart rate is too fast. Reduce stress and see a cardiologist.');
        assessmentColor = '#EF4444';
        assessmentBg = '#FEF2F2';
      } else if (exportPrimaryKey === 'heartRate' && activePrimaryAvg < 55) {
        // Bradikardiya
        assessmentTitle = getTransValue('Bradikardiya', 'Брадикардия', 'Bradycardia');
        assessmentText = getTransValue('Yurak urishi juda sekin. Darhol kardiolog bilan maslahatlashing.', 'Сердечный ритм слишком медленный. Немедленно обратитесь к кардиологу.', 'Heart rate is too slow. Consult a cardiologist immediately.');
        assessmentColor = '#EF4444';
        assessmentBg = '#FEF2F2';
      } else if (exportPrimaryKey === 'spo2' && activePrimaryAvg < 95) {
        // Kislorod past
        assessmentTitle = getTransValue('Kislorod past', 'Низкий уровень кислорода', 'Low Oxygen Level');
        assessmentText = getTransValue('Qondagi kislorod darajasi past. Darhol tibbiy ko\'rikdan o\'ting.', 'Уровень кислорода в крови низкий. Немедленно обратитесь к врачу.', 'Blood oxygen level is low. Seek medical attention immediately.');
        assessmentColor = '#EF4444';
        assessmentBg = '#FEF2F2';
      } else if ((exportPrimaryKey === 'weight' || exportPrimaryKey === 'bmi') && activePrimaryAvg > 30) {
        // Semizlik
        assessmentTitle = getTransValue('Semizlik nazorati', 'Контроль ожирения', 'Obesity Management');
        assessmentText = getTransValue('Ko\'rsatkichlaringiz semizlik chegarasida. Faol harakat va parhez tavsiya etiladi.', 'Ваши показатели в зоне ожирения. Рекомендуется физическая активность и диета.', 'Your metrics indicate obesity range. Physical activity and diet are recommended.');
        assessmentColor = '#F59E0B';
        assessmentBg = '#FFFBEB';
      } else {
        // Normal / Default (barcha kasalliklar uchun)
        assessmentTitle = getTransValue('Yaxshi Nazorat', 'Хороший контроль', 'Good Control');
        assessmentText = getTransValue('Sizning ko\'rsatkichlaringiz maqsadli diapazonda. Shu tarzda davom eting va ovqatlanish rejangizga qat\'iy rioya qiling.', 'Ваши показатели находятся в целевом диапазоне. Продолжайте в том же духе и строго следуйте плану питания.', 'Your metrics are within the target range. Keep it up and strictly follow your nutrition plan.');
      }

      // 3. Filter and sort detailed daily logs (last 30 days, limit to 60 logs)
      const detailedMeals = exportMeals
        .filter(m => m.completed !== false)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 60);

      // 4. Build HTML
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>${historyRecord ? historyRecord.disease + ' - ' + getTransValue('Arxiv Hisoboti', 'Архивный отчет', 'Archive Report') : t('reports.title')}</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #333333;
              background-color: #ffffff;
              padding: 25px;
              margin: 0;
            }
            .header {
              border-bottom: 2px solid #4A9EFF;
              padding-bottom: 15px;
              margin-bottom: 25px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .logo-title {
              font-size: 26px;
              font-weight: 800;
              color: #4A9EFF;
            }
            .report-info {
              text-align: right;
              font-size: 13px;
              color: #666666;
              line-height: 18px;
            }
            .section-title {
              font-size: 16px;
              font-weight: 700;
              color: #2c3e50;
              margin-top: 25px;
              margin-bottom: 12px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 5px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .profile-grid {
              display: flex;
              flex-wrap: wrap;
              background-color: #f8fafc;
              border-radius: 12px;
              padding: 12px 18px;
              margin-bottom: 20px;
              gap: 12px 25px;
              border: 1px solid #e2e8f0;
            }
            .profile-item {
              font-size: 13px;
              min-width: 180px;
            }
            .profile-item strong {
              color: #475569;
            }
            .stats-container {
              display: flex;
              gap: 12px;
              margin-bottom: 20px;
            }
            .stat-card {
              flex: 1;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 12px;
              text-align: center;
            }
            .stat-value {
              font-size: 18px;
              font-weight: 800;
              color: #1e293b;
              margin-top: 4px;
            }
            .stat-label {
              font-size: 10px;
              color: #64748b;
              text-transform: uppercase;
              font-weight: 700;
            }
            .assessment-box {
              border-radius: 12px;
              padding: 15px 18px;
              margin-bottom: 25px;
              border: 1px solid rgba(0,0,0,0.03);
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th {
              background-color: #f1f5f9;
              color: #475569;
              font-weight: 700;
              text-align: left;
              padding: 8px 10px;
              font-size: 12px;
              border-bottom: 2px solid #cbd5e1;
            }
            td {
              padding: 8px 10px;
              font-size: 12px;
              border-bottom: 1px solid #e2e8f0;
            }
            .status-badge {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 5px;
              font-weight: 700;
              font-size: 10px;
            }
            .status-normal {
              background-color: #ecfdf5;
              color: #10b981;
            }
            .status-high {
              background-color: #fef2f2;
              color: #ef4444;
            }
            .status-low {
              background-color: #fff7ed;
              color: #f97316;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 10px;
              color: #94a3b8;
              border-top: 1px solid #eeeeee;
              padding-top: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo-title">Dia AI</div>
              <div style="font-size: 13px; color: #64748b; margin-top: 3px;">${t('reports.subtitle')}</div>
            </div>
            <div class="report-info">
              <div><strong>${getTransValue('Hisobot turi', 'Тип отчета', 'Report Type')}:</strong> ${historyRecord ? historyRecord.disease + ' ' + getTransValue('Arxiv Hisoboti', 'Архивный отчет', 'Archive Report') : getTransValue('Kengaytirilgan Tibbiy Hisobot', 'Расширенный медицинский отчет', 'Comprehensive Medical Report')}</div>
              <div><strong>${getTransValue('Yaratilgan vaqt', 'Время создания', 'Created at')}:</strong> ${formatPDFDate(new Date())}</div>
            </div>
          </div>

          <div class="section-title">${t('profile.personalInfo')}</div>
          <div class="profile-grid">
            <div class="profile-item"><strong>${getTransValue('Ism Familiya', 'Имя Фамилия', 'Full Name')}:</strong> ${name}</div>
            <div class="profile-item"><strong>${t('profile.gender')}:</strong> ${gender === 'male' ? t('gender.male') : (gender === 'female' ? t('gender.female') : gender)}</div>
            <div class="profile-item"><strong>${t('profile.weight')}:</strong> ${weight} kg</div>
            <div class="profile-item"><strong>${t('profile.activity')}:</strong> ${activityLevel === 'low' ? t('activity.low') : (activityLevel === 'medium' ? t('activity.medium') : (activityLevel === 'high' ? t('activity.high') : activityLevel))}</div>
          </div>

          <div class="section-title">${t('reports.comparativeStats')}</div>
          <div class="stats-container">
            <div class="stat-card" style="border-top: 3px solid #4A9EFF;">
              <div class="stat-label">${t('reports.weeklyAverages')}</div>
              <div class="stat-value" style="color: #4A9EFF;">${weeklyStats.primary || 0} <span style="font-size: 10px">${primaryMetricObj.unit}</span></div>
              <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
                ${weeklyStats.calories || 0} kkal · ${weeklyStats.carbs || 0}g · ${weeklyStats.xe || 0} ${t('reports.xeShort')}
              </div>
            </div>
            <div class="stat-card" style="border-top: 3px solid #2DD36F;">
              <div class="stat-label">${t('reports.monthlyAverages')}</div>
              <div class="stat-value" style="color: #2DD36F;">${monthlyStats.primary || 0} <span style="font-size: 10px">${primaryMetricObj.unit}</span></div>
              <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
                ${monthlyStats.calories || 0} kkal · ${monthlyStats.carbs || 0}g · ${monthlyStats.xe || 0} ${t('reports.xeShort')}
              </div>
            </div>
            <div class="stat-card" style="border-top: 3px solid #FB923C;">
              <div class="stat-label">${t('reports.yearlyAverages')}</div>
              <div class="stat-value" style="color: #FB923C;">${yearlyStats.primary || 0} <span style="font-size: 10px">${primaryMetricObj.unit}</span></div>
              <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
                ${yearlyStats.calories || 0} kkal · ${yearlyStats.carbs || 0}g · ${yearlyStats.xe || 0} ${t('reports.xeShort')}
              </div>
            </div>
          </div>

          <div class="section-title">${getTransValue('Jismoniy Faollik & Sarflangan Kaloriya', 'Физическая активность и расход калорий', 'Physical Activity & Calorie Burn')}</div>
          <div style="display: flex; gap: 12px; margin-bottom: 20px;">
            <div style="flex: 1; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 12px; text-align: center;">
              <div style="font-size: 11px; color: #9a3412; font-weight: 700;">${getTransValue('Sarflangan kaloriya', 'Сожжено калорий', 'Burned Calories')}</div>
              <div style="font-size: 18px; font-weight: 800; color: #ea580c; margin-top: 4px;">🔥 ${pdfTotalBurned} kcal</div>
            </div>
            <div style="flex: 1; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px; text-align: center;">
              <div style="font-size: 11px; color: #166534; font-weight: 700;">${getTransValue('Bajarilgan mashqlar', 'Тренировки', 'Workouts Done')}</div>
              <div style="font-size: 18px; font-weight: 800; color: #16a34a; margin-top: 4px;">🏃 ${exList.length || (pdfTotalBurned > 0 ? 1 : 0)} ta</div>
            </div>
            <div style="flex: 1; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; text-align: center;">
              <div style="font-size: 11px; color: #475569; font-weight: 700;">${getTransValue('Sof energiya balansi', 'Чистый баланс', 'Net Energy Balance')}</div>
              <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px;">${Math.max(0, (weeklyStats.calories || averages.calories || 0) - pdfTotalBurned)} kcal</div>
            </div>
          </div>

          <div class="section-title">${t('reports.healthAssessment')}</div>
          <div class="assessment-box" style="background-color: ${assessmentBg}; border-left: 5px solid ${assessmentColor};">
            <div style="font-weight: 800; font-size: 15px; color: ${assessmentColor}; margin-bottom: 6px;">
              ${assessmentTitle}
            </div>
            <div style="font-size: 13px; line-height: 18px; color: #334155;">
              ${assessmentText}
            </div>
          </div>

          <div class="section-title">${getTransValue('Klinik Laboratoriya & Gemoglobin Tahlillari', 'Клинические анализы и Гемоглобин', 'Clinical Diagnostics & Hemoglobin')}</div>
          <div style="background-color: #f8fafc; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; border: 1px solid #cbd5e1;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
              <div>
                <strong style="color: #0f172a; font-size: 14px;">${testTitle}</strong><br/>
                <span style="font-size: 12px; color: #64748b;">${getTransValue('Bemor', 'Пациент', 'Patient')}: <strong>${patientDisplayName}</strong> ${firstLab?.date ? ' | ' + formatPDFDate(firstLab.date) : ''}</span>
              </div>
              <div style="padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 13px; ${isHbLow ? 'background:#fee2e2; color:#b91c1c; border: 1px solid #fca5a5;' : 'background:#d1fae5; color:#047857; border: 1px solid #86efac;'}">
                Hb: ${effectiveHb} (${hbStatusText})
              </div>
            </div>

            <table style="margin-top: 6px; margin-bottom: 10px; width: 100%;">
              <thead>
                <tr>
                  <th style="font-size: 11px;">${getTransValue('Ko‘rsatkich', 'Показатель', 'Parameter')}</th>
                  <th style="font-size: 11px;">${getTransValue('Natija', 'Результат', 'Result')}</th>
                  <th style="font-size: 11px;">${getTransValue('Me‘yor (Norma)', 'Норма', 'Reference Range')}</th>
                  <th style="font-size: 11px;">${getTransValue('Holat', 'Статус', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Gemoglobin (Hb)</strong></td>
                  <td><strong style="${isHbLow ? 'color:#b91c1c;' : 'color:#047857;'}">${effectiveHb}</strong></td>
                  <td>${refRange}</td>
                  <td><span class="${isHbLow ? 'status-low' : 'status-normal'}">${hbStatusText}</span></td>
                </tr>
                ${firstLab?.glucose ? `
                  <tr>
                    <td><strong>${getTransValue('Qondagi qand (Glyukoza)', 'Глюкоза в крови', 'Blood Glucose')}</strong></td>
                    <td><strong>${firstLab.glucose}</strong></td>
                    <td>3.9 - 6.1 mmol/L</td>
                    <td><span class="status-normal">${getTransValue("Me'yor", "Норма", "Normal")}</span></td>
                  </tr>
                ` : ''}
              </tbody>
            </table>

            <div style="font-size: 12px; color: #334155; line-height: 18px; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
              <strong>${getTransValue('AI Shifokor Xulosasi', 'Заключение AI-врача', 'AI Physician Summary')}:</strong><br/>
              ${firstLab?.summary || (isHbLow
                ? getTransValue(`Gemoglobin darajasi (${effectiveHb}) normadan (${refRange}) past. Kamqonlik (anemiya) alomatlari mavjud, temir preparatlari va shifokor ko'rigi zarur.`, `Уровень гемоглобина (${effectiveHb}) ниже нормы (${refRange}). Имеются признаки анемии, необходима консультация врача.`, `Hemoglobin (${effectiveHb}) is below the reference range (${refRange}). Anemia indicated; clinical consultation advised.`)
                : getTransValue("Laborator ko'rsatkichlar me'yorda baholandi. Bemor holatiga mos klinik tavsiyalar belgilandi.", "Показатели оценены. Назначены индивидуальные рекомендации.", "Laboratory indicators evaluated. Clinical recommendations tailored."))}
            </div>
          </div>

          <div class="section-title">${t('reports.consumed')} (${getTransValue('Oxirgi 60 ta qayd', 'Последние 60 записей', 'Last 60 records')})</div>
          ${detailedMeals.length === 0 ? `
            <div style="text-align: center; color: #64748b; padding: 25px; background-color: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1;">
              ${t('reports.noDataFound')}
            </div>
          ` : `
            <table>
              <thead>
                <tr>
                  <th>${getTransValue('Sana / Vaqt', 'Дата / Время', 'Date / Time')}</th>
                  <th>${getTransValue('Taom nomi', 'Название блюда', 'Food Name')}</th>
                  <th>${t('dashboard.calories')}</th>
                  <th>${getMetricLabel(primaryMetricObj, lang)} (${primaryMetricObj.unit})</th>
                  <th>${t('recipes.carbs')}</th>
                  <th>${t('reports.doctorNotes')}</th>
                </tr>
              </thead>
              <tbody>
                ${detailedMeals.map(meal => {
                  const dateTimeStr = formatPDFDate(meal.timestamp);
                  const pVal = parseFloat(meal[exportPrimaryKey] ?? meal.sugar ?? 0);
                  const statusInfo = getMetricStatusForDisease(exportDiseaseConfig, exportPrimaryKey, pVal);
                  const statusClass = statusInfo.status === 'normal' ? 'status-normal' : ((statusInfo.status === 'high' || statusInfo.status === 'critical') ? 'status-high' : 'status-low');
                  
                  const statusText = lang === 'en' ? (statusInfo.labelEn || statusInfo.label) : (lang === 'ru' ? (statusInfo.labelRu || statusInfo.label) : statusInfo.label);
                  
                  const doctorNoteText = statusInfo.status === 'normal'
                    ? getTransValue('Me\'yor (Barqaror)', 'Норма (Стабильно)', 'Normal (Stable)')
                    : ((statusInfo.status === 'high' || statusInfo.status === 'critical')
                        ? getTransValue('Yuqori (Nazorat qiling)', 'Высокий (Требует контроля)', 'High (Needs monitoring)')
                        : getTransValue('Past (Nazorat qiling)', 'Низкий (Требует контроля)', 'Low (Needs monitoring)'));

                  const doctorNoteColor = statusInfo.status === 'normal' ? '#10b981' : ((statusInfo.status === 'high' || statusInfo.status === 'critical') ? '#ef4444' : '#d97706');

                  return `
                    <tr>
                      <td>${dateTimeStr}</td>
                      <td><strong>${meal.name || t('common.food')}</strong></td>
                      <td>${meal.calories || 0} ${t('recipes.kcal')}</td>
                      <td>
                        <span class="status-badge ${statusClass}">
                          ${pVal} ${primaryMetricObj.unit} (${statusText})
                        </span>
                      </td>
                      <td>${meal.carbs || 0} g</td>
                      <td style="font-weight: 700; color: ${doctorNoteColor};">
                        ${doctorNoteText}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `}

          <div class="footer">
            Dia AI - ${getTransValue("Diabet nazorati va sog'lom hayot bo'yicha sizning shaxsiy yordamchingiz.", "Ваш личный помощник по контролю диабета и здоровому образу жизни.", "Your personal assistant for diabetes control and healthy lifestyle.")}<br/>
            &copy; ${now.getFullYear()} Dia AI. ${getTransValue("Barcha huquqlar himoyalangan.", "Все права защищены.", "All rights reserved.")}
          </div>
        </body>
        </html>
      `;

      // 4. Print HTML to PDF with base64 for 100% Android FileProvider compatibility
      const { uri, base64 } = await Print.printToFileAsync({ html: htmlContent, base64: true });
      let fileToExport = uri;
      
      if (base64) {
        try {
          const cleanFileName = `DiaAI_Health_Report_${Date.now()}.pdf`;
          const docUri = `${FileSystem.cacheDirectory}${cleanFileName}`;
          await FileSystem.writeAsStringAsync(docUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          fileToExport = docUri;
        } catch (copyErr) {
          console.warn('Write base64 error in reports:', copyErr);
          fileToExport = uri;
        }
      }

      // 5. Options Alert to guarantee direct Save as PDF or Share
      Alert.alert(
        t('reports.title') || 'PDF Hisoboti',
        getTransValue(
          'PDF hisobotni qanday saqlashni tanlang:',
          'Выберите способ сохранения отчета:',
          'Choose how to save your PDF report:'
        ),
        [
          {
            text: getTransValue('Qurilmaga saqlash (PDF)', 'Сохранить на телефон', 'Save to Device (PDF)'),
            onPress: async () => {
              try {
                await Print.printAsync({ html: htmlContent });
              } catch (printErr) {
                console.warn('PrintAsync error:', printErr);
                await Sharing.shareAsync(fileToExport, {
                  mimeType: 'application/pdf',
                  dialogTitle: `${t('reports.title')} - Dia AI`,
                  UTI: 'com.adobe.pdf'
                });
              }
            }
          },
          {
            text: getTransValue('Ulashish / Yuborish', 'Поделиться', 'Share / Send'),
            onPress: async () => {
              try {
                await Sharing.shareAsync(fileToExport, {
                  mimeType: 'application/pdf',
                  dialogTitle: `${t('reports.title')} - Dia AI`,
                  UTI: 'com.adobe.pdf'
                });
              } catch (shareErr) {
                console.warn('Share error:', shareErr);
              }
            }
          },
          {
            text: getTransValue('Yopish', 'Закрыть', 'Close'),
            style: 'cancel'
          }
        ]
      );

      // Also trigger Native Share Sheet automatically
      try {
        const isSharingAvailable = await Sharing.isAvailableAsync().catch(() => false);
        if (isSharingAvailable) {
          await Sharing.shareAsync(fileToExport, {
            mimeType: 'application/pdf',
            dialogTitle: `${t('reports.title')} - Dia AI`,
            UTI: 'com.adobe.pdf'
          });
        }
      } catch (shareErr) {
        console.log('Auto-share handled or dismissed:', shareErr);
      }
      
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert(t('common.error'), error.message || 'PDF hisobotini tayyorlashda xatolik yuz berdi.');
    } finally {
      setExportingPdf(false);
    }
  };

  const periodAccentColor = period === 'week' ? colors.info : period === 'month' ? colors.success : colors.warning;
  const chartMainTitle  = period === 'week' ? t('reports.weeklyReport') : period === 'month' ? t('reports.monthlyAnalysis') : t('reports.yearlyStats');

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? COLORS.bgDark : '#fff' }}>
      <LinearGradient colors={colors.bgGradient} style={styles.root}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.pageTitle, { color: colors.text }]}>{t('reports.title')}</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>{t('reports.subtitle')}</Text>
          </View>
          <View style={[styles.headerBadge, { backgroundColor: `${colors.primary}15`, borderColor: colors.borderLight }]}>
            <Ionicons name="stats-chart" size={20} color={colors.primary} />
          </View>
        </View>

        {/* Top View Toggle: Current vs History */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.iconBg, borderRadius: RADIUS.lg, padding: 4, marginBottom: SPACING.lg }}>
            <TouchableOpacity onPress={() => setViewMode('current')} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: viewMode === 'current' ? colors.primary : 'transparent', borderRadius: RADIUS.md }}>
                <Text style={{ color: viewMode === 'current' ? '#fff' : colors.textSecondary, fontWeight: '600' }}>{i18n.language === 'en' ? 'Current Diagnosis' : (i18n.language === 'ru' ? 'Текущий диагноз' : 'Joriy Kasallik')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setViewMode('history')} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: viewMode === 'history' ? colors.primary : 'transparent', borderRadius: RADIUS.md }}>
                <Text style={{ color: viewMode === 'history' ? '#fff' : colors.textSecondary, fontWeight: '600' }}>{i18n.language === 'en' ? 'Archive (History)' : (i18n.language === 'ru' ? 'Архив (История)' : 'Arxiv (Tarix)')}</Text>
            </TouchableOpacity>
        </View>

        {viewMode === 'history' ? (
            <View style={{ paddingBottom: 40 }}>
                {historyData.length === 0 ? (
                    <View style={{ alignItems: 'center', marginTop: 40 }}>
                        <Ionicons name="folder-open-outline" size={60} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                        <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Sizda avvalgi kasalliklar tarixi yo'q</Text>
                    </View>
                ) : (
                    historyData.map((hist, idx) => (
                        <View key={hist.id || idx} style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.borderLight, marginBottom: 15 }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ionicons name="shield-checkmark" size={24} color={GREEN} />
                                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>{hist.disease}</Text>
                                </View>
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{new Date(hist.endDate).toLocaleDateString()}</Text>
                            </View>
                            <Text style={{ color: colors.textSecondary, marginBottom: 5 }}>Tuzalgan vaqt: {new Date(hist.endDate).toLocaleDateString()}</Text>
                            <Text style={{ color: colors.textSecondary, marginBottom: 10 }}>Yozuvlar (Natijalar) soni: {hist.meals?.length || 0}</Text>
                            <TouchableOpacity 
                                onPress={() => handleExportPDF(hist)}
                                style={{ backgroundColor: `${BLUE}15`, padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 5 }}
                            >
                                <Text style={{ color: BLUE, fontWeight: '600' }}>Arxiv ma'lumotlarini yuklash (PDF)</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </View>
        ) : (
          <>
            {/* ── Thenx Style My Progress Profile Header ── */}
            <View style={{
              backgroundColor: isDark ? '#16181D' : '#F9FAFB',
              borderRadius: 22,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Avatar */}
                <View style={{
                  width: 54,
                  height: 54,
                  borderRadius: 16,
                  backgroundColor: isDark ? '#2A2D35' : '#E5E7EB',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                  overflow: 'hidden',
                  borderWidth: 1.5,
                  borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'
                }}>
                  {profileAvatar ? (
                    <Image
                      source={{ uri: profileAvatar }}
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <Ionicons name="person" size={26} color={colors.primary || '#00E676'} />
                  )}
                </View>

                {/* User Name & Info */}
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                    {profileName}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                    Beginner • Build Strength • Mibro Fit Active
                  </Text>
                </View>

                {/* Settings / Strava link button */}
                <TouchableOpacity
                  onPress={() => setStravaModalVisible(true)}
                  style={{
                    padding: 8,
                    borderRadius: 12,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
                  }}
                >
                  <Ionicons name="watch" size={18} color="#FC4C02" />
                </TouchableOpacity>
              </View>

              {/* Pill badges row (Workouts, Steps, Calories) */}
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#262930' : '#E5E7EB', paddingVertical: 7, paddingHorizontal: 4, borderRadius: 20 }}>
                  <Ionicons name="barbell-outline" size={13} color="#E5E7EB" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                    14 {i18n.language === 'en' ? 'Exercises' : (i18n.language === 'ru' ? 'Упражнений' : 'Mashq')}
                  </Text>
                </View>

                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#262930' : '#E5E7EB', paddingVertical: 7, paddingHorizontal: 4, borderRadius: 20 }}>
                  <Ionicons name="footsteps-outline" size={13} color="#00E676" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                    9,240 {i18n.language === 'en' ? 'Steps' : (i18n.language === 'ru' ? 'Шагов' : 'Qadam')}
                  </Text>
                </View>

                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#262930' : '#E5E7EB', paddingVertical: 7, paddingHorizontal: 4, borderRadius: 20 }}>
                  <Ionicons name="flame" size={13} color="#FF5722" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                    475 {i18n.language === 'en' ? 'kcal' : (i18n.language === 'ru' ? 'ккал' : 'kkal')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Period Tabs */}
            <View style={[styles.tabRow, { backgroundColor: colors.iconBg }]}>
              {PERIODS.map(p => {
                const active = period === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.tab, active && { backgroundColor: colors.primary }]}
                    onPress={() => {
                      setPeriod(p.id);
                      setSelectedDate(null);
                      buildChartData(allMeals, p.id);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={p.icon} size={14} color={active ? '#fff' : colors.textSecondary} />
                    <Text style={[styles.tabTxt, active ? { color: '#fff' } : { color: colors.textSecondary }]}>{t(`reports.${p.label}`)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

        {/* Stat Cards */}
        <View style={styles.grid4}>
          <StatCard icon="water"    iconColor={colors.info}    label={getMetricLabel(primaryMetricObj, i18n?.language)} value={averages.primary}    unit={primaryMetricObj.unit} trend="+5%"  positive colors={colors} />
          <StatCard icon="flame"    iconColor={colors.warning} label={t('reports.calories')}        value={averages.calories} unit={t('recipes.kcal')}  trend="-2%"  positive={false} colors={colors} />
          <StatCard icon="nutrition" iconColor={colors.success} label={t('reports.carbs')}      value={averages.carbs}    unit="g"     trend="+8%"  positive colors={colors} />
          <TouchableOpacity style={{ width: (width - 52) / 2 }} onPress={() => Alert.alert(`📊 ${t('reports.whatIsXe')}`, t('reports.xeInfo'))}>
            <StatCard icon="medical"  iconColor={colors.primary} label={t('reports.breadUnits')}     value={Math.round(averages.carbs/DIABETES_GUIDELINES.CARBS.XE_CONVERSION)} unit={t('reports.xeShort')} trend="+2%" positive colors={colors} />
          </TouchableOpacity>
        </View>

        {/* ── Jismoniy Faollik va Sarflangan Kaloriya (Workout & Burned Calories) ── */}
        <View style={[styles.chartCard, { backgroundColor: colors.cardPremium, borderColor: colors.borderLight, marginBottom: 20 }]}>
          <View style={styles.chartHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="flame" size={20} color="#FF5722" />
                <Text style={[styles.chartTitle, { color: colors.text }]} numberOfLines={1}>
                  {i18n.language === 'en' ? 'Physical Activity & Burn' : (i18n.language === 'ru' ? 'Активность и Расход' : 'Jismoniy Faollik & Sarf')}
                </Text>
              </View>
              <Text style={[styles.chartSub, { color: colors.textSecondary }]} numberOfLines={1}>
                {period === 'week' 
                  ? (i18n.language === 'en' ? 'Weekly workouts & calorie burn' : (i18n.language === 'ru' ? 'Еженедельные тренировки и расход' : 'Haftalik mashqlar va kaloriya sarfi')) 
                  : (period === 'month' 
                    ? (i18n.language === 'en' ? 'Monthly workouts & calorie burn' : (i18n.language === 'ru' ? 'Ежемесячные тренировки и расход' : 'Oylik mashqlar va kaloriya sarfi')) 
                    : (i18n.language === 'en' ? 'Yearly workouts & calorie burn' : (i18n.language === 'ru' ? 'Годовые тренировки и расход' : 'Yillik mashqlar va sarf')))}
              </Text>
            </View>
            <View style={{ backgroundColor: '#FF572220', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
              <Text style={{ color: '#FF5722', fontWeight: '800', fontSize: 12 }} numberOfLines={1}>
                🔥 {exerciseStats.totalCalories} {i18n.language === 'en' ? 'kcal' : (i18n.language === 'ru' ? 'ккал' : 'kkal')}
              </Text>
            </View>
          </View>

          {/* Quick Balance Metrics */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 14 }}>
            <View style={{ flex: 1, backgroundColor: colors.iconBg, padding: 8, borderRadius: RADIUS.md, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 2 }} numberOfLines={1}>
                {i18n.language === 'en' ? 'Burned' : (i18n.language === 'ru' ? 'Сожжено' : 'Sarflangan')}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#FF5722' }} numberOfLines={1}>🔥 {exerciseStats.totalCalories}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.iconBg, padding: 8, borderRadius: RADIUS.md, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 2 }} numberOfLines={1}>
                {i18n.language === 'en' ? 'Workouts' : (i18n.language === 'ru' ? 'Тренировки' : 'Mashqlar')}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }} numberOfLines={1}>
                🏃 {exerciseStats.count} {i18n.language === 'en' ? 'activities' : (i18n.language === 'ru' ? 'трен.' : 'ta')}
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.iconBg, padding: 8, borderRadius: RADIUS.md, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 2 }} numberOfLines={1}>
                {i18n.language === 'en' ? 'Net Balance' : (i18n.language === 'ru' ? 'Чистый баланс' : 'Sof Balans')}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                {Math.max(0, averages.calories - exerciseStats.totalCalories)} {i18n.language === 'en' ? 'kcal' : (i18n.language === 'ru' ? 'ккал' : 'kkal')}
              </Text>
            </View>
          </View>

          {/* Smartwatch Biometrics (Qadamlar, Uyqu, Kislorod, Nafas) */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            <View style={{ flex: 1, minWidth: '47%', backgroundColor: colors.iconBg, padding: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="footsteps" size={16} color="#00E676" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '700' }} numberOfLines={1}>
                  {i18n.language === 'en' ? 'STEPS' : (i18n.language === 'ru' ? 'ШАГИ' : 'QADAMLAR')}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }} numberOfLines={1}>{(biometrics?.steps || 9240).toLocaleString()}</Text>
              </View>
            </View>

            <View style={{ flex: 1, minWidth: '47%', backgroundColor: colors.iconBg, padding: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="moon" size={16} color="#A78BFA" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '700' }} numberOfLines={1}>
                  {i18n.language === 'en' ? 'SLEEP' : (i18n.language === 'ru' ? 'СОН' : 'UYQU')}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#A78BFA' }} numberOfLines={1}>
                  {biometrics?.sleepHours ? (i18n.language === 'en' ? biometrics.sleepHours.replace('s', 'h').replace('d', 'm') : (i18n.language === 'ru' ? biometrics.sleepHours.replace('s', 'ч').replace('d', 'м') : biometrics.sleepHours)) : (i18n.language === 'en' ? '7h 40m' : (i18n.language === 'ru' ? '7ч 40м' : '7s 40d'))}
                </Text>
              </View>
            </View>

            <View style={{ flex: 1, minWidth: '47%', backgroundColor: colors.iconBg, padding: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="water" size={16} color="#00BCD4" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '700' }} numberOfLines={1}>
                  {i18n.language === 'en' ? 'OXYGEN (SpO2)' : (i18n.language === 'ru' ? 'КИСЛОРОД (SpO2)' : 'KISLOROD (SpO2)')}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#00BCD4' }} numberOfLines={1}>{biometrics?.spo2 || 98}%</Text>
              </View>
            </View>

            <View style={{ flex: 1, minWidth: '47%', backgroundColor: colors.iconBg, padding: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="pulse" size={16} color="#4A9EFF" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '700' }} numberOfLines={1}>
                  {i18n.language === 'en' ? 'RESPIRATION' : (i18n.language === 'ru' ? 'ДЫХАНИЕ' : 'NAFAS OLISH')}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#4A9EFF' }} numberOfLines={1}>
                  {biometrics?.respirationRate || 15} {i18n.language === 'en' ? '/min' : (i18n.language === 'ru' ? '/мин' : '/daq')}
                </Text>
              </View>
            </View>
          </View>

          {/* Real Burned Calories Weekly Bar Chart */}
          <View style={{ marginTop: 16, backgroundColor: colors.iconBg, borderRadius: RADIUS.md, padding: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 }} numberOfLines={1}>
                {i18n.language === 'en' ? '📊 Weekly Burned Calories Dynamics' : (i18n.language === 'ru' ? '📊 Динамика сожжённых калорий за неделю' : '📊 Haftalik sarflangan kaloriya dinamikasi')}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
                {i18n.language === 'en' ? 'Mibro Fit & Workouts' : (i18n.language === 'ru' ? 'Mibro Fit & Тренировки' : 'Mibro Fit & Mashqlar')}
              </Text>
            </View>

            {/* 7-Day Bar Chart */}
            {(() => {
              const days = i18n.language === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : (i18n.language === 'ru' ? ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] : ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan']);
              const now = new Date();
              const weeklyBars = [];
              for (let i = 6; i >= 0; i--) {
                const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                const iso = d.toISOString().slice(0, 10);
                const dayName = days[d.getDay()];
                const dayWorkouts = (exerciseLogs || []).filter(l => l.timestamp && l.timestamp.startsWith(iso));
                const calories = dayWorkouts.reduce((sum, w) => sum + (parseFloat(w.calories) || 0), 0);
                weeklyBars.push({ day: dayName, calories, isToday: i === 0 });
              }
              const maxCal = Math.max(300, ...weeklyBars.map(b => b.calories));
              const chartHeight = 80;

              return (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: chartHeight + 24, paddingTop: 10 }}>
                  {weeklyBars.map((bar, idx) => {
                    const barHeight = Math.max(6, (bar.calories / maxCal) * chartHeight);
                    const isPositive = bar.calories > 0;
                    return (
                      <View key={idx} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                        {bar.calories > 0 && (
                          <Text style={{ fontSize: 9, fontWeight: '800', color: bar.isToday ? '#FC4C02' : colors.text, marginBottom: 2 }}>
                            {Math.round(bar.calories)}
                          </Text>
                        )}
                        <View
                          style={{
                            width: 14,
                            height: barHeight,
                            borderRadius: 7,
                            backgroundColor: bar.isToday
                              ? '#FC4C02'
                              : (isPositive ? (isDark ? '#FFA726' : '#FB8C00') : (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0')),
                          }}
                        />
                        <Text style={{ fontSize: 10, marginTop: 4, fontWeight: bar.isToday ? '800' : '600', color: bar.isToday ? '#FC4C02' : colors.textSecondary }}>
                          {bar.day}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })()}
          </View>

          {/* Exercise Activity Log List */}
          {exerciseStats.logs && exerciseStats.logs.length > 0 ? (
            <View style={{ marginTop: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 }}>
                {i18n.language === 'en' ? 'Completed workouts:' : (i18n.language === 'ru' ? 'Список выполненных упражнений:' : "Bajarilgan mashqlar ro'yxati:")}
              </Text>
              {exerciseStats.logs.slice(0, 5).map((log, index) => (
                <View key={log.id || index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: index > 0 ? 1 : 0, borderTopColor: colors.borderLight }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(252, 76, 2, 0.15)', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                      <Ionicons name={log.icon || "walk-outline"} size={18} color="#FC4C02" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                        {i18n.language === 'en' 
                          ? (log.titleEn || (log.title?.toLowerCase().includes('ertalabki yugurish') ? 'Morning Jogging' : (log.title?.toLowerCase().includes('ertalabki') ? 'Morning Routine' : (log.title?.toLowerCase().includes('workout') ? 'Strength Workout (Mibro Fit)' : (log.title?.toLowerCase().includes('walk') ? 'Walking (Mibro Fit)' : log.title)))))
                          : (i18n.language === 'ru' 
                              ? (log.titleRu || (log.title?.toLowerCase().includes('ertalabki yugurish') ? 'Утренняя пробежка' : (log.title?.toLowerCase().includes('ertalabki') ? 'Утренняя зарядка' : (log.title?.toLowerCase().includes('workout') ? 'Силовая тренировка (Mibro Fit)' : (log.title?.toLowerCase().includes('walk') ? 'Ходьба (Mibro Fit)' : log.title)))))
                              : log.title)}
                      </Text>
                      {log.location ? (
                        <Text style={{ fontSize: 11, color: '#FC4C02', marginTop: 2 }}>
                          📍 {log.location}
                        </Text>
                      ) : null}
                      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1} ellipsizeMode="tail">
                        {log.distanceKm ? `🏃 ${log.distanceKm} km · ` : ''}
                        {log.pace ? `⚡ ${log.pace} · ` : ''}
                        ⏱️ {log.duration} {i18n.language === 'en' ? 'min' : (i18n.language === 'ru' ? 'мин' : 'daqiqa')} · {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                    <View style={{ backgroundColor: '#FF572218', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 }}>
                      <Text style={{ color: '#FF5722', fontWeight: '800', fontSize: 12 }}>
                        +{log.calories} {i18n.language === 'en' ? 'kcal' : (i18n.language === 'ru' ? 'ккал' : 'kkal')}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 3 }}>
                      ⌚️ Mibro Fit
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 14 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginBottom: 8 }}>
                {i18n.language === 'en' ? 'No workouts logged for this period yet.' : (i18n.language === 'ru' ? 'За этот период тренировок пока нет.' : 'Ushbu davrda hali mashqlar bajarilmagan.')}
              </Text>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${colors.primary}15`, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.round }}
                onPress={() => navigation?.navigate('Exercises')}
              >
                <Ionicons name="play" size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
                  {i18n.language === 'en' ? 'Start workouts ➔' : (i18n.language === 'ru' ? 'Начать тренировку ➔' : 'Mashqlarni boshlash ➔')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Strava / Smartwatch sync button */}
          <TouchableOpacity
            onPress={() => setStravaModalVisible(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(252, 76, 2, 0.12)',
              borderWidth: 1,
              borderColor: 'rgba(252, 76, 2, 0.35)',
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: RADIUS.md,
              gap: 8,
              marginTop: 14,
            }}
          >
            <Ionicons name="watch-outline" size={17} color="#FC4C02" />
            <Text style={{ color: '#FC4C02', fontWeight: '800', fontSize: 12 }}>
              ⌚️ Strava / Mibro Fit bilan sinxronlash
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Laboratoriya Tahlillari & Gemoglobin (AI Xulosasi) ── */}
        <View style={[styles.chartCard, { backgroundColor: colors.cardPremium, borderColor: colors.borderLight, marginBottom: 20 }]}>
          <View style={[styles.chartHeader, { flexWrap: 'wrap', gap: 8, alignItems: 'center' }]}>
            <View style={{ flex: 1, minWidth: 180, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="flask" size={20} color="#00E676" />
                <Text style={[styles.chartTitle, { color: colors.text }]} numberOfLines={2}>
                  {i18n.language?.startsWith('en') ? 'Laboratory & Hemoglobin' : (i18n.language?.startsWith('ru') ? 'Лаборатория и Гемоглобин' : 'Laboratoriya & Gemoglobin')}
                </Text>
              </View>
              <Text style={[styles.chartSub, { color: colors.textSecondary, marginTop: 4, lineHeight: 18 }]}>
                {i18n.language?.startsWith('en') ? 'Clinical diagnostic findings & AI evaluation' : (i18n.language?.startsWith('ru') ? 'Клинические анализы и оценка ИИ' : 'Klinik tahlillar va sun’iy intellekt xulosasi')}
              </Text>
            </View>
            {(() => {
              const firstLab = (labReports && labReports.length > 0) ? labReports[0] : null;
              const hbVal = firstLab?.hemoglobin || latestHemoglobin || '94 g/L';
              const hbNum = parseFloat(String(hbVal).match(/[\d.]+/)?.[0] || '94');
              const isHbLow = hbNum < 120;
              const badgeBg = isHbLow ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 230, 118, 0.15)';
              const badgeBorder = isHbLow ? '#EF4444' : '#00E676';
              const badgeText = isHbLow ? '#EF4444' : '#00E676';
              return (
                <View style={{ backgroundColor: badgeBg, borderWidth: 1, borderColor: badgeBorder, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: badgeText }}>
                    {hbVal}
                  </Text>
                </View>
              );
            })()}
          </View>

          {labReports && labReports.length > 0 ? (() => {
            const firstLab = labReports[0];
            const hbVal = firstLab.hemoglobin || latestHemoglobin || '94 g/L';
            const hbNum = parseFloat(String(hbVal).match(/[\d.]+/)?.[0] || '94');
            const isHbLow = hbNum < 120;
            const isEn = i18n.language?.startsWith('en');
            const isRu = i18n.language?.startsWith('ru');
            const statusLabel = firstLab.hemoglobin_status || (isHbLow ? (isEn ? 'Low (Anemia)' : (isRu ? 'Низкий (Анемия)' : 'Past (Kamqonlik)')) : (isEn ? 'Normal' : (isRu ? 'Норма' : "Me'yorda")));
            const title = firstLab.test_name || firstLab.name || (isEn ? 'Complete Blood Count' : (isRu ? 'Общий анализ крови' : 'Umumiy qon tahlili'));
            const patientName = firstLab.patient_name || profileName;

            return (
              <View style={{ backgroundColor: colors.iconBg, borderRadius: RADIUS.md, padding: 14, marginTop: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, flex: 1, minWidth: 160 }}>
                    📋 {title}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    {firstLab.date ? new Date(firstLab.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                  </Text>
                </View>

                {/* Patient & Hemoglobin Details */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight, gap: 8 }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, flexShrink: 1, minWidth: 140 }}>
                    {isEn ? 'Patient' : (isRu ? 'Пациент' : 'Bemor')}: <Text style={{ fontWeight: '700', color: colors.text }}>{patientName}</Text>
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <View style={{ backgroundColor: isHbLow ? 'rgba(239, 68, 68, 0.12)' : 'rgba(0, 230, 118, 0.12)', borderWidth: 1, borderColor: isHbLow ? '#EF4444' : '#00E676', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: isHbLow ? '#EF4444' : '#00E676' }}>
                        Hb: {hbVal}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: isHbLow ? '#EF4444' : colors.textSecondary }}>
                      {statusLabel}
                    </Text>
                  </View>
                </View>

                <Text style={{ fontSize: 12.5, color: colors.textSecondary, lineHeight: 19, marginTop: 10 }}>
                  {firstLab.summary || (isEn ? 'Laboratory evaluation saved successfully.' : (isRu ? 'Клинический анализ сохранен.' : "Laborator ko'rsatkichlar me'yorda baholandi."))}
                </Text>
              </View>
            );
          })() : (
            <View style={{ backgroundColor: colors.iconBg, borderRadius: RADIUS.md, padding: 12, marginTop: 8 }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18, textAlign: 'center' }}>
                {i18n.language?.startsWith('en')
                  ? 'No lab reports uploaded yet. Upload a PDF or photo report on the Dashboard to see automatic AI medical analysis and hemoglobin tracking.'
                  : (i18n.language?.startsWith('ru')
                    ? 'Анализы пока не загружены. Загрузите PDF или фото на Главной для автоматического анализа ИИ и контроля гемоглобина.'
                    : 'Hozircha tahlillar yuklanmagan. Asosiy ekranda PDF yoki rasm tahlilingizni yuklab, tezkor AI xulosasi va gemoglobin monitoringini oling.')}
              </Text>
            </View>
          )}
        </View>

        {/* ── MONTH: Calendar section ── */}
        {period === 'month' && (
          <View style={[styles.chartCard, { backgroundColor: colors.cardPremium, borderColor: colors.borderLight }]}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={[styles.chartTitle, { color: colors.text }]}>{t('reports.dailyCalendar')}</Text>
                <Text style={[styles.chartSub, { color: colors.textSecondary }]}>{t('reports.selectDatePrompt')}</Text>
              </View>
              <Ionicons name="calendar" size={20} color={colors.success} />
            </View>

            <Calendar
              year={calYear}
              month={calMonth}
              activeDates={activeDates}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
              t={t}
            />

            {/* Legend */}
             <View style={styles.calLegend}>
               <View style={styles.calLegendItem}>
                 <View style={[styles.calDot, { backgroundColor: colors.success }]} />
                 <Text style={[styles.calLegendTxt, { color: colors.textSecondary }]}>{t('reports.dataAvailable')}</Text>
               </View>
               <View style={styles.calLegendItem}>
                 <View style={[styles.calDayBtnPreview, { borderColor: colors.info, borderWidth: 1.5 }]} />
                 <Text style={[styles.calLegendTxt, { color: colors.textSecondary }]}>{t('common.today')}</Text>
               </View>
             </View>
          </View>
        )}

        {/* Tanlangan kun statistikasi */}
        {period === 'month' && selectedDate && (
          <DayStatsCard
            date={selectedDate}
            meals={selectedMeals}
            onSwitchToWeek={handleSwitchToWeek}
            t={t}
            diseaseConfig={diseaseConfig}
          />
        )}

        {/* ── WEEK + YEAR: Area / Bar chart ── */}
        {period !== 'month' && (
          <View style={[styles.chartCard, { backgroundColor: colors.cardPremium, borderColor: colors.borderLight }]}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={[styles.chartTitle, { color: colors.text }]}>{getMetricLabel(primaryMetricObj, i18n?.language)}</Text>
                <Text style={[styles.chartSub, { color: colors.textSecondary }]}>
                  {period === 'week' ? t('reports.weekly') : (period === 'month' ? t('reports.monthly') : t('reports.yearly'))}
                </Text>
              </View>
              <View style={[styles.chartBigBadge, { backgroundColor: `${accentColor}15` }]}>
                <Text style={[styles.chartBigVal, { color: accentColor }]}>{averages.primary}</Text>
                <Text style={[styles.chartBigUnit, { color: colors.textSecondary }]}>{primaryMetricObj.unit}</Text>
              </View>
            </View>
            <View style={styles.chartWrap}>
              <GlucoseChart 
                data={chartData.length > 0 ? chartData : [0,0,0,0,0,0,0]} 
                labels={labels.length > 0 ? labels : getWeekDaysShort(t)} 
                bare 
                chartColor={accentColor} 
                extraData={labels}
                limit={personalizedGoals?.sugarG?.target}
              />
            </View>
            <View style={[styles.chartFooter, { borderTopColor: colors.borderLight }]}>
              <View style={styles.chartLegendItem}>
                <View style={[styles.chartDot, { backgroundColor: accentColor }]} />
                <Text style={[styles.chartLegendTxt, { color: colors.textSecondary }]}>
                  {period === 'week' ? t('reports.sevenDaysStats') : t('reports.twelveMonthsStats')}
                </Text>
              </View>
              <Text style={[styles.chartTrend, { color: colors.success }]}>↑ 5.0%</Text>
            </View>
          </View>
        )}

        {/* Macros */}
        <View style={[styles.chartCard, { backgroundColor: colors.cardPremium, borderColor: colors.borderLight }]}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={[styles.chartTitle, { color: colors.text }]}>{t('reports.macronutrients')}</Text>
              <Text style={[styles.chartSub, { color: colors.textSecondary }]}>{t('reports.distributionRatio')}</Text>
            </View>
            <Ionicons name="pie-chart" size={20} color={colors.textSecondary} />
          </View>
          <View style={{ marginTop: 20 }}>
            <DonutChart total={averages.calories || 0} colors={colors} t={t} />
          </View>
        </View>

        {/* Tip */}
        <LinearGradient
          colors={isDark ? ['rgba(45, 211, 111, 0.15)', 'rgba(74, 158, 255, 0.1)'] : ['#E8F5E9', '#E3F2FD']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.tipCard, { borderColor: `${colors.primary}30` }]}
        >
          <View style={[styles.tipIcon, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="bulb" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tipTitle, { color: colors.text }]}>{t('reports.healthTip')}</Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              {t('reports.healthTipDesc')}
            </Text>
          </View>
        </LinearGradient>

        {/* PDF Export Button */}
        <TouchableOpacity
          style={[styles.pdfButton, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
          onPress={handleExportPDF}
          activeOpacity={0.8}
          disabled={exportingPdf}
        >
          <LinearGradient
            colors={isDark ? ['rgba(74, 158, 255, 0.15)', 'rgba(167, 139, 250, 0.1)'] : ['#E3F2FD', '#EDE7F6']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.pdfGradient}
          >
            {exportingPdf ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Ionicons name="document-text" size={20} color={colors.primary} />
            )}
            <Text style={[styles.pdfButtonTxt, { color: colors.text }]}>
              {exportingPdf ? t('reports.generatingPdf') : t('reports.exportPdf')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
          </>
        )}

      </ScrollView>

      <StravaSyncModal
        visible={stravaModalVisible}
        onClose={() => setStravaModalVisible(false)}
        onSyncSuccess={loadData}
      />
      </LinearGradient>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { paddingTop: 52, paddingHorizontal: 20 },

  headerRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 24,
  },
  pageTitle:    { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: 0.3 },
  pageSubtitle: { color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 2 },
  headerBadge: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, padding: 4, marginBottom: 20, gap: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 10, borderRadius: 13, gap: 5,
  },
  tabTxt:       { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' },
  tabTxtActive: { color: '#fff', fontWeight: '700' },

  // Grid
  grid4: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: {
    width: (width - 52) / 2,
    borderRadius: 24, 
    padding: 16,
    borderWidth: 1, 
    overflow: 'hidden',
    position: 'relative',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    zIndex: 2,
  },
  statIconBox: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  trendBadgeTxt: {
    fontSize: 10,
    fontWeight: '800',
  },
  statContent: {
    zIndex: 2,
  },
  statLabel: { 
    fontSize: 11, 
    fontWeight: '600', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statVal: { 
    fontSize: 24, 
    fontWeight: '800' 
  },
  statUnit: { 
    fontSize: 12, 
    fontWeight: '500',
  },
  statCardBgEffect: {
    position: 'absolute',
    bottom: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    zIndex: 1,
  },

  // Chart card
  chartCard: {
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 16,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  chartHeader: {
    flexDirection: 'row', 
    alignItems: 'flex-start',
    justifyContent: 'space-between', 
    marginBottom: 12,
  },
  chartTitle:    { fontSize: 17, fontWeight: '800' },
  chartSub:      { fontSize: 13, marginTop: 2 },
  chartBigBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  chartBigVal:   { fontSize: 24, fontWeight: '800' },
  chartBigUnit:  { fontSize: 11, fontWeight: '600' },
  chartWrap:     { marginTop: 8, marginLeft: -8, marginRight: -8 },
  chartFooter: {
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'space-between', 
    marginTop: 16,
    paddingTop: 16, 
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  chartLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chartDot:        { width: 10, height: 10, borderRadius: 5 },
  chartLegendTxt:  { fontSize: 13, fontWeight: '500' },
  chartTrend:      { fontSize: 14, fontWeight: '800' },

  // Donut
  donutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  donutWrapper: {
    position: 'relative',
  },
  donutCenter: {
    position: 'absolute', 
    top: 0, 
    left: 0,
    width: CTR*2, 
    height: CTR*2,
    alignItems: 'center', 
    justifyContent: 'center',
  },
  donutVal:    { fontSize: 22, fontWeight: '900' },
  donutUnit:   { fontSize: 12, fontWeight: '500' },
  donutLegend: {
    flex: 1,
    gap: 16,
  },
  legendRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  legendBar:   { width: 5, height: 40, borderRadius: 2.5 },
  legendLabel: { fontSize: 13, fontWeight: '700' },
  legendPct:   { fontSize: 13, fontWeight: '800' },
  progressBg:  { height: 6, borderRadius: 3, marginTop: 4, overflow: 'hidden' },
  progressFill:{ height: 6, borderRadius: 3 },

  // Tip
  tipCard: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16,
    padding: 18, 
    borderRadius: 20, 
    marginBottom: 10,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  tipIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  tipTitle:{ fontSize: 15, fontWeight: '800', marginBottom: 4 },
  tipText: { fontSize: 13, lineHeight: 20 },
  pdfButton: {
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  pdfGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  pdfButtonTxt: {
    fontSize: 16,
    fontWeight: '800',
  },

  // ── Calendar ──────────────────────────────────────────────────────────────
  calNavRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  calNavBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center', justifyContent: 'center',
  },
  calMonthTitle: { fontSize: 18, fontWeight: '800' },
  calWeekRow:    { flexDirection: 'row', marginBottom: 8 },
  calCell:       { alignItems: 'center', justifyContent: 'center' },
  calWeekDay:    { fontSize: 12, fontWeight: '700' },
  calGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  calDayBtn: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, marginVertical: 2,
  },
  calDayTxt: { fontSize: 15, fontWeight: '600' },
  calDot:    { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  calLegend: { flexDirection: 'row', gap: 20, marginTop: 20, justifyContent: 'center' },
  calLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calLegendTxt:  { fontSize: 12, fontWeight: '500' },
  calDayBtnPreview: { width: 16, height: 16, borderRadius: 5 },

  // ── Day Stats ─────────────────────────────────────────────────────────────
  dayCard: {
    borderRadius: 20, marginBottom: 16,
    borderWidth: 1, overflow: 'hidden',
  },
  dayCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16, paddingBottom: 14,
    borderBottomWidth: 1,
  },
  dayCardDate:    { fontSize: 16, fontWeight: '800' },
  dayCardWeekday: { fontSize: 12, marginTop: 2 },
  dayWeekBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1,
  },
  dayWeekBtnTxt: { fontSize: 12, fontWeight: '700' },

  noDataWrap: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  noDataTxt:  { color: 'rgba(255,255,255,0.25)', fontSize: 14 },

  dayMacroRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 16, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  dayMacro:      { alignItems: 'center', gap: 2 },
  dayMacroVal:   { fontSize: 18, fontWeight: '800' },
  dayMacroUnit:  { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
  dayMacroLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '500' },

  mealListTitle: {
    color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  mealItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  mealDot:  { width: 8, height: 8, borderRadius: 4 },
  mealName: { color: 'white', fontSize: 13, fontWeight: '600' },
  mealMeta: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  mealTime: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },

  // New Meal Log Styles
  mealLogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mealLogIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mealLogName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  mealLogTime: {
    fontSize: 11,
  },
  mealLogCal: {
    fontSize: 11,
    marginTop: 4,
  },
  miniStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  miniStatusTxt: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ReportsScreen;
