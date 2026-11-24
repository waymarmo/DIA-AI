import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Modal,
    ScrollView,
    Animated,
    Dimensions,
    Alert,
    TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { SPACING, RADIUS } from '../constants/theme';
import { getDiseaseConfig } from '../utils/diseaseConfig';
import { getData, setData } from '../utils/storage';
import * as Speech from 'expo-speech';

const { width } = Dimensions.get('window');

const ExercisesScreen = ({ navigation }) => {
    const { colors, isDark } = useTheme();
    const { t, i18n } = useTranslation();
    const lang = i18n.language || 'uz';
    const tLang = (uz, ru, en) => {
        if (lang === 'en') return en;
        if (lang === 'ru') return ru;
        return uz;
    };

    const getIntensityText = (ex) => {
        if (!ex) return '';
        if (lang === 'en') {
            if (ex.intensityEn) return ex.intensityEn;
            if (ex.intensity === 'Yengil') return 'Light';
            if (ex.intensity === 'Juda yengil') return 'Very Light';
            if (ex.intensity === 'Faol') return 'Active';
            return 'Moderate';
        }
        if (lang === 'ru') {
            if (ex.intensityRu) return ex.intensityRu;
            if (ex.intensity === 'Yengil') return 'Лёгкая';
            if (ex.intensity === 'Juda yengil') return 'Очень лёгкая';
            if (ex.intensity === 'Faol') return 'Активная';
            return 'Средняя';
        }
        return ex.intensityUz || ex.intensity || 'Yengil';
    };

    const getSafetyTipText = (ex) => {
        if (!ex) return '';
        if (lang === 'en') return ex.safetyTipEn || ex.safetyTip || ex.safetyTipUz;
        if (lang === 'ru') return ex.safetyTipRu || ex.safetyTip || ex.safetyTipUz;
        return ex.safetyTipUz || ex.safetyTip || '';
    };

    const getDiseaseExerciseAdvice = (config, currentLang) => {
        const key = (config?.key || '').toLowerCase();
        const advices = {
            diabet: {
                en: 'Maintain a steady, comfortable pace. Stay well-hydrated and check your glucose level before and after exercise.',
                ru: 'Тренируйтесь в спокойном комфортном темпе. Пейте воду и контролируйте уровень сахара до и после упражнений.',
                uz: 'Mashqlarni me\'yoriy sur\'atda bajaring. Suv ichishni unutmang va mashqdan oldin hamda keyin qand miqdorini nazorat qiling.'
            },
            gipertenziya: {
                en: 'Avoid heavy breath-holding or sudden movements. Breathe smoothly and keep your cardiac rhythm steady.',
                ru: 'Избегайте задержки дыхания и резких движений. Дышите ровно и контролируйте ритм сердца.',
                uz: 'Nafasni ushlab zo\'riqishdan va keskin harakatlardan saqlaning. Sokin nafas oling va yurak urishini me\'yorda tuting.'
            },
            aritmiya: {
                en: 'Perform gentle, therapeutic movements. If your heart rate spikes sharply, stop immediately and rest.',
                ru: 'Выполняйте лёгкие кардио-упражнения. При резком повышении пульса сразу отдохните.',
                uz: 'Yengil va davolovchi kardio-harakatlarni bajaring. Puls keskin oshsa darhol dam oling.'
            },
            semizlik: {
                en: 'Focus on regular light cardio to boost calorie burn and support safe metabolic health.',
                ru: 'Фокусируйтесь на регулярном безопасном кардио для сжигания калорий и ускорения обмена веществ.',
                uz: 'Metabolizmni xavfsiz tezlashtirish va kaloriyalarni sarflash uchun tinch kardio mashqlariga e\'tibor qarating.'
            },
            astma: {
                en: 'Breathe gently through your nose in a warm room. Keep your inhaler accessible during routines.',
                ru: 'Дышите через нос в тёплом помещении. Держите ингалятор рядом во время тренировки.',
                uz: 'Iliq xonada burun orqali nafas oling. Mashq paytida ingalyatoringizni yoningizda saqlang.'
            },
            umumiy: {
                en: 'Exercise at a comfortable, gentle pace. Daily active movement strengthens health and immunity.',
                ru: 'Занимайтесь в комфортном темпе. Регулярная активность укрепляет здоровье и иммунитет.',
                uz: 'Mashqlarni sokin sur\'atda, o\'zingizni zo\'riqtirmasdan bajaring. Muntazam harakat immunitetni mustahkamlaydi.'
            }
        };
        const currentAdv = advices[key] || advices.umumiy;
        if (currentLang === 'en') return currentAdv.en;
        if (currentLang === 'ru') return currentAdv.ru;
        return currentAdv.uz;
    };

    const [diseaseConfig, setDiseaseConfig] = useState(getDiseaseConfig('Umumiy'));
    const [primaryDisease, setPrimaryDisease] = useState('Diabet');
    const [savedUserName, setSavedUserName] = useState('');
    const [completedMeds, setCompletedExercises] = useState({});
    const [totalBurnedCalories, setTotalBurnedCalories] = useState(0);

    // Active Timer State
    const [activeExercise, setActiveExercise] = useState(null);
    const [selectedGuideExercise, setSelectedGuideExercise] = useState(null);
    const [timerModalVisible, setTimerModalVisible] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const timerRef = useRef(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const loadData = useCallback(async () => {
        const storedDisease = await getData('primaryDisease');
        const activeName = storedDisease || 'Diabet';
        setPrimaryDisease(activeName);
        const config = getDiseaseConfig(activeName);
        setDiseaseConfig(config);

        const storedName = (await getData('firstName')) || (await getData('userName')) || '';
        setSavedUserName(storedName);

        const todayKey = `exercise_completed_${new Date().toISOString().slice(0, 10)}`;
        const raw = await getData(todayKey);
        if (raw) {
            try {
                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                setCompletedExercises(parsed.completed || {});
                setTotalBurnedCalories(parsed.calories || 0);
            } catch (e) {
                // Ignore parse errors
            }
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Timer pulse animation
    useEffect(() => {
        if (isRunning) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true })
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isRunning]);

    // Timer countdown ticker
    useEffect(() => {
        if (isRunning && secondsLeft > 0) {
            timerRef.current = setInterval(() => {
                setSecondsLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        setIsRunning(false);
                        handleFinishExercise(activeExercise);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRunning, secondsLeft, activeExercise]);

    const handleStartTimer = (exercise) => {
        setActiveExercise(exercise);
        setSecondsLeft(exercise.duration * 60);
        setIsRunning(true);
        setTimerModalVisible(true);
    };

    const handleTogglePause = () => {
        setIsRunning(!isRunning);
    };

    const speakExerciseDone = (exercise) => {
        const title = lang === 'en' && exercise.titleEn ? exercise.titleEn : (lang === 'ru' && exercise.titleRu ? exercise.titleRu : exercise.title);
        const voiceText = lang === 'en'
            ? `Great job! You finished ${title} and burned ${exercise.calories} calories.`
            : (lang === 'ru'
                ? `Отлично! Вы завершили ${title} и сожгли ${exercise.calories} калорий.`
                : `Ajoyib natija! Siz ${title} mashqini bajardingiz va ${exercise.calories} kaloriya sarfladingiz. Barakalla!`);
        try {
            Speech.speak(voiceText, { language: lang === 'en' ? 'en' : (lang === 'ru' ? 'ru' : 'uz') });
        } catch (e) {
            console.warn('[Speech] Error:', e?.message);
        }
    };

    const logExerciseToHistory = async (exercise, isAdding) => {
        try {
            const raw = (await getData('@exercise_history')) || (await getData('exercise_history'));
            const history = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : []);
            if (isAdding) {
                const newEntry = {
                    id: `ex-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    exerciseId: exercise.id,
                    title: exercise.title,
                    titleRu: exercise.titleRu || exercise.title,
                    titleEn: exercise.titleEn || exercise.title,
                    calories: parseFloat(exercise.calories) || 0,
                    duration: exercise.duration || 15,
                    timestamp: new Date().toISOString(),
                    disease: primaryDisease,
                    intensity: exercise.intensity || "O'rtacha"
                };
                const updated = [newEntry, ...history];
                await setData('@exercise_history', updated);
                await setData('exercise_history', updated);
                await setData('exerciseChangedAt', Date.now().toString());
            } else {
                const todayPrefix = new Date().toISOString().slice(0, 10);
                const filtered = history.filter(h => !(h.exerciseId === exercise.id && h.timestamp.startsWith(todayPrefix)));
                await setData('@exercise_history', filtered);
                await setData('exercise_history', filtered);
                await setData('exerciseChangedAt', Date.now().toString());
            }
        } catch (e) {
            console.warn('Exercise history logging error:', e);
        }
    };

    const handleFinishExercise = async (exercise) => {
        if (!exercise) return;
        const newCompleted = { ...completedMeds, [exercise.id]: true };
        const newCalories = totalBurnedCalories + (exercise.calories || 0);

        setCompletedExercises(newCompleted);
        setTotalBurnedCalories(newCalories);
        setTimerModalVisible(false);
        setIsRunning(false);

        const todayKey = `exercise_completed_${new Date().toISOString().slice(0, 10)}`;
        await setData(todayKey, {
            completed: newCompleted,
            calories: newCalories
        });
        await setData('today_burned_calories', newCalories);
        await logExerciseToHistory(exercise, true);

        speakExerciseDone(exercise);

        Alert.alert(
            tLang('🎉 Ajoyib natija!', '🎉 Отлично!', '🎉 Great job!'),
            tLang(
                `Siz "${exercise.title}" mashqini bajardingiz va ${exercise.calories} kkal sarfladingiz!`,
                `Вы завершили упражнение "${exercise.titleRu || exercise.title}" и сожгли ${exercise.calories} ккал!`,
                `You completed "${exercise.titleEn || exercise.title}" and burned ${exercise.calories} kcal!`
            )
        );
    };

    const handleQuickToggleDone = async (exercise) => {
        if (!exercise) return;
        const isDone = !!completedMeds[exercise.id];
        const newCompleted = { ...completedMeds };
        let newCalories = totalBurnedCalories;

        if (isDone) {
            delete newCompleted[exercise.id];
            newCalories = Math.max(0, totalBurnedCalories - (exercise.calories || 0));
            await logExerciseToHistory(exercise, false);
        } else {
            newCompleted[exercise.id] = true;
            newCalories = totalBurnedCalories + (exercise.calories || 0);
            await logExerciseToHistory(exercise, true);
            speakExerciseDone(exercise);
        }

        setCompletedExercises(newCompleted);
        setTotalBurnedCalories(newCalories);

        const todayKey = `exercise_completed_${new Date().toISOString().slice(0, 10)}`;
        await setData(todayKey, {
            completed: newCompleted,
            calories: newCalories
        });
        await setData('today_burned_calories', newCalories);
    };

    const formatTime = (totalSec) => {
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const exercises = diseaseConfig?.exercises || [];
    const completedCount = Object.keys(completedMeds).length;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
                >
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>

                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        {tLang('Jismoniy Mashqlar', 'Лечебная Гимнастика', 'Physical Exercises')}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 6 }}>
                        <Ionicons name={diseaseConfig.icon || "heart"} size={13} color={diseaseConfig.color || "#00E676"} />
                        <Text style={[styles.headerSubtitle, { color: diseaseConfig.color || colors.primary, fontWeight: '700' }]}>
                            {lang === 'en' ? (diseaseConfig.titleEn || diseaseConfig.title) : (lang === 'ru' ? (diseaseConfig.titleRu || diseaseConfig.title) : diseaseConfig.title)}
                        </Text>
                    </View>
                </View>

                <View style={[styles.calBadge, { backgroundColor: `${diseaseConfig.color || '#00E676'}15`, borderColor: `${diseaseConfig.color || '#00E676'}35` }]}>
                    <Ionicons name="flame" size={16} color="#FF9800" />
                    <Text style={[styles.calBadgeText, { color: colors.text }]}>
                        {totalBurnedCalories} {tLang('kkal', 'ккал', 'kcal')}
                    </Text>
                </View>
            </View>

            {/* Friendly Health Tip Banner (Soft, Calming Design) */}
            <View style={[styles.safetyBanner, { backgroundColor: isDark ? 'rgba(0, 230, 118, 0.08)' : '#E8F5E9', borderColor: isDark ? 'rgba(0, 230, 118, 0.2)' : '#C8E6C9' }]}>
                <Ionicons name="sparkles" size={20} color={diseaseConfig.color || "#00E676"} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                    <Text style={[styles.safetyTitle, { color: diseaseConfig.color || (isDark ? '#A7F3D0' : '#1B5E20') }]}>
                        {tLang('Shaxsiy mashq tavsiyasi', 'Персональная рекомендация', 'Personalized Exercise Advice')}
                    </Text>
                    <Text style={[styles.safetyText, { color: isDark ? '#D1FAE5' : '#2E7D32', lineHeight: 18 }]}>
                        {getDiseaseExerciseAdvice(diseaseConfig, lang)}
                    </Text>
                </View>
            </View>

            {/* Daily Summary Card */}
            <LinearGradient
                colors={isDark ? ['#1a2d24', '#0d1f17'] : ['#E8F5E9', '#C8E6C9']}
                style={styles.summaryCard}
            >
                <View style={styles.summaryRow}>
                    <View>
                        <Text style={[styles.summaryTitle, { color: isDark ? '#fff' : '#1B5E20' }]}>
                            {tLang('Bugungi harakat rejasi', 'План активности', "Today's Activity Plan")}
                        </Text>
                        <Text style={[styles.summarySub, { color: isDark ? '#A7F3D0' : '#2E7D32' }]}>
                            {completedCount} / {exercises.length} {tLang('bajarildi', 'выполнено', 'completed')}
                        </Text>
                    </View>
                    <View style={styles.progressCircle}>
                        <Text style={styles.progressPercentText}>
                            {exercises.length > 0 ? Math.round((completedCount / exercises.length) * 100) : 0}%
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Live Strava / Mibro Fit Synced Workout Card (Matches Strava Screenshot 2) */}
            <View style={{
                marginHorizontal: 16,
                marginBottom: 14,
                backgroundColor: isDark ? '#1C1917' : '#FFF7ED',
                borderRadius: 18,
                borderWidth: 1,
                borderColor: 'rgba(252, 76, 2, 0.4)',
                padding: 14,
                shadowColor: '#FC4C02',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 6,
                elevation: 3,
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="watch" size={17} color="#FC4C02" />
                        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                            {savedUserName ? savedUserName.toUpperCase() : (t('dashboard.user') || 'BEMOR')}
                        </Text>
                    </View>
                    <View style={{ backgroundColor: 'rgba(0, 230, 118, 0.15)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#00E676' }}>
                          {tLang('Mibro Fit Sinxronlandi ✓', 'Mibro Fit Синхронизировано ✓', 'Mibro Fit Synced ✓')}
                        </Text>
                    </View>
                </View>

                <View style={{ marginBottom: 4 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>
                        Workout (mibrofit sync strava)
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                        {tLang('Bugun, soat 14:34 da bajarildi • 10-Days Challenge 🎖', 'Выполнено сегодня в 14:34 • 10-Days Challenge 🎖', 'Completed today at 14:34 • 10-Days Challenge 🎖')}
                    </Text>
                </View>

                {/* Stat Grid matching Strava Screenshot 1 & 2 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600' }}>
                          {tLang('VAQT', 'ВРЕМЯ', 'TIME')}
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#FC4C02' }}>26:08</Text>
                    </View>
                    <View style={{ width: 1, height: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
                    <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600' }}>
                          {tLang('KALORIYA', 'КАЛОРИИ', 'CALORIES')}
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
                          195 {tLang('kkal', 'ккал', 'kcal')}
                        </Text>
                    </View>
                    <View style={{ width: 1, height: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
                    <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600' }}>
                          {tLang('PULS', 'ПУЛЬС', 'HEART RATE')}
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#EF4444' }}>124 bpm</Text>
                    </View>
                    <View style={{ width: 1, height: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
                    <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600' }}>
                          {tLang('FOKUS', 'ФОКУС', 'FOCUS')}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#00E676' }}>
                          {tLang('Qorin & Bilak', 'Пресс и руки', 'Core & Arms')}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Table Schedule Header */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginHorizontal: 16,
                marginBottom: 12,
                marginTop: 6
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="calendar-outline" size={18} color={diseaseConfig.color || '#00E676'} />
                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
                        {tLang('Mashqlar Jadvali', 'Расписание Упражнений', 'Exercise Schedule')}
                    </Text>
                </View>
                <View style={{ backgroundColor: `${diseaseConfig.color || '#00E676'}18`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: diseaseConfig.color || '#00E676' }}>
                        {exercises.length} {tLang('ta mashq', 'упражнений', 'exercises')}
                    </Text>
                </View>
            </View>

            {/* Exercise List */}
            <FlatList
                data={exercises || []}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                    const isDone = !!completedMeds[item.id];
                    return (
                        <View style={[styles.exCard, { backgroundColor: colors.card, borderColor: isDone ? '#00E676' : colors.borderLight }]}>
                            <View style={styles.exCardHeader}>
                                <View style={[styles.exIconWrap, { backgroundColor: `${item.color || '#00E676'}18` }]}>
                                    <Ionicons name={item.icon || 'walk-outline'} size={26} color={item.color || '#00E676'} />
                                </View>

                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.exTitle, { color: colors.text, textDecorationLine: isDone ? 'line-through' : 'none' }]}>
                                        {lang === 'en' && item.titleEn ? item.titleEn : (lang === 'ru' && item.titleRu ? item.titleRu : item.title)}
                                    </Text>
                                    <View style={styles.badgeRow}>
                                        <View style={[styles.pillBadge, { backgroundColor: `${item.color || '#00E676'}15` }]}>
                                            <Ionicons name="time-outline" size={12} color={item.color || '#00E676'} />
                                            <Text style={[styles.pillBadgeText, { color: item.color || '#00E676' }]}>
                                                {item.duration} {tLang('daqiqa', 'мин', 'min')}
                                            </Text>
                                        </View>
                                        <View style={[styles.pillBadge, { backgroundColor: '#FF980015' }]}>
                                            <Ionicons name="flame-outline" size={12} color="#FF9800" />
                                            <Text style={[styles.pillBadgeText, { color: '#FF9800' }]}>
                                                {item.calories} {tLang('kkal', 'ккал', 'kcal')}
                                            </Text>
                                        </View>
                                        <View style={[styles.pillBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6' }]}>
                                            <Text style={[styles.pillBadgeText, { color: colors.textSecondary }]}>
                                                {getIntensityText(item)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {isDone && (
                                    <Ionicons name="checkmark-circle" size={24} color="#00E676" />
                                )}
                            </View>

                            <Text style={[styles.exDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                                {lang === 'en' && item.descEn ? item.descEn : (lang === 'ru' && item.descRu ? item.descRu : item.descUz)}
                            </Text>

                            {(item.safetyTipUz || item.safetyTipEn || item.safetyTipRu) ? (
                                <View style={[styles.softTipWrap, { backgroundColor: isDark ? 'rgba(74, 158, 255, 0.08)' : '#F0F9FF', borderColor: isDark ? 'rgba(74, 158, 255, 0.2)' : '#BAE6FD' }]}>
                                    <Ionicons name="bulb-outline" size={13} color="#0284C7" />
                                    <Text style={[styles.softTipText, { color: isDark ? '#93C5FD' : '#0369A1' }]} numberOfLines={1}>
                                        {getSafetyTipText(item)}
                                    </Text>
                                </View>
                            ) : null}

                            {/* Action Buttons Row */}
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                                <TouchableOpacity
                                    onPress={() => setSelectedGuideExercise(item)}
                                    activeOpacity={0.8}
                                    style={[
                                        styles.startBtn,
                                        {
                                             flex: 1,
                                            marginTop: 0,
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                                            borderWidth: 1,
                                            borderColor: colors.borderLight
                                        }
                                    ]}
                                >
                                    <Ionicons name="information-circle-outline" size={17} color={colors.text} />
                                    <Text style={[styles.startBtnText, { color: colors.text, fontSize: 12 }]}>
                                        {tLang('Yo\'riqnoma', 'Инструкция', 'Guide')}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => handleStartTimer(item)}
                                    activeOpacity={0.8}
                                    style={[
                                        styles.startBtn,
                                        { flex: 1, marginTop: 0 },
                                        isDone
                                            ? { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb' }
                                            : { backgroundColor: item.color || '#00E676' }
                                    ]}
                                >
                                    <Ionicons
                                        name={isDone ? "reload-outline" : "play"}
                                        size={17}
                                        color={isDone ? colors.text : "#000"}
                                    />
                                    <Text style={[styles.startBtnText, { color: isDone ? colors.text : "#000", fontSize: 12 }]}>
                                        {tLang('Taymer', 'Таймер', 'Timer')}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => handleQuickToggleDone(item)}
                                    activeOpacity={0.8}
                                    style={[
                                        styles.startBtn,
                                        {
                                            flex: 1.2,
                                            marginTop: 0,
                                            backgroundColor: isDone ? '#00E676' : (isDark ? 'rgba(0, 230, 118, 0.12)' : '#E8F5E9'),
                                            borderWidth: 1,
                                            borderColor: '#00E676'
                                        }
                                    ]}
                                >
                                    <Ionicons
                                        name={isDone ? "checkmark-circle" : "checkmark-circle-outline"}
                                        size={17}
                                        color={isDone ? "#000" : "#00E676"}
                                    />
                                    <Text style={[styles.startBtnText, { color: isDone ? "#000" : (isDark ? "#00E676" : "#2E7D32"), fontSize: 12 }]}>
                                        {isDone
                                            ? tLang('Bajarildi ✓', 'Готово ✓', 'Done ✓')
                                            : tLang('Rejaga', 'Отметить', 'To plan')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                }}
            />

            {/* Exercise Detailed Guide Modal */}
            {selectedGuideExercise && (
                <Modal
                    visible={!!selectedGuideExercise}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setSelectedGuideExercise(null)}
                >
                    <View style={styles.timerOverlay}>
                        <View style={[styles.guideModalSheet, { backgroundColor: isDark ? '#141a17' : '#ffffff' }]}>
                            {/* Guide Header */}
                            <View style={styles.guideHeaderRow}>
                                <View style={[styles.guideIconBadge, { backgroundColor: `${selectedGuideExercise.color || '#00E676'}20` }]}>
                                    <Ionicons name={selectedGuideExercise.icon || 'walk-outline'} size={28} color={selectedGuideExercise.color || '#00E676'} />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.guideModalTitle, { color: colors.text }]}>
                                        {lang === 'en' && selectedGuideExercise.titleEn ? selectedGuideExercise.titleEn : (lang === 'ru' && selectedGuideExercise.titleRu ? selectedGuideExercise.titleRu : selectedGuideExercise.title)}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                        <View style={[styles.pillBadge, { backgroundColor: `${selectedGuideExercise.color || '#00E676'}15` }]}>
                                            <Ionicons name="time-outline" size={12} color={selectedGuideExercise.color || '#00E676'} />
                                            <Text style={[styles.pillBadgeText, { color: selectedGuideExercise.color || '#00E676' }]}>
                                                {selectedGuideExercise.duration} {tLang('daqiqa', 'мин', 'min')}
                                            </Text>
                                        </View>
                                        <View style={[styles.pillBadge, { backgroundColor: '#FF980015' }]}>
                                            <Ionicons name="flame-outline" size={12} color="#FF9800" />
                                            <Text style={[styles.pillBadgeText, { color: '#FF9800' }]}>
                                                {selectedGuideExercise.calories} {tLang('kkal', 'ккал', 'kcal')}
                                            </Text>
                                        </View>
                                        <View style={[styles.pillBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6' }]}>
                                            <Text style={[styles.pillBadgeText, { color: colors.textSecondary }]}>
                                                {getIntensityText(selectedGuideExercise)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedGuideExercise(null)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380, marginTop: 10 }}>
                                {/* Description */}
                                <View style={styles.guideSec}>
                                    <Text style={[styles.guideSecTitle, { color: colors.text }]}>
                                        📋 {tLang('Mashq tavsifi va foydasi:', 'Описание и польза:', 'Description & Benefits:')}
                                    </Text>
                                    <Text style={[styles.guideSecText, { color: colors.textSecondary }]}>
                                        {lang === 'en' && selectedGuideExercise.descEn ? selectedGuideExercise.descEn : (lang === 'ru' && selectedGuideExercise.descRu ? selectedGuideExercise.descRu : selectedGuideExercise.descUz)}
                                    </Text>
                                </View>

                                {/* Step by step */}
                                <View style={styles.guideSec}>
                                    <Text style={[styles.guideSecTitle, { color: colors.text }]}>
                                        🚶 {tLang('Bajarish bosqichlari:', 'Пошаговая инструкция:', 'Step-by-step instructions:')}
                                    </Text>
                                    <View style={styles.guideStepItem}>
                                        <Text style={[styles.guideStepNumber, { color: selectedGuideExercise.color || '#00E676' }]}>1</Text>
                                        <Text style={[styles.guideStepText, { color: colors.textSecondary }]}>
                                            {tLang('Isinish: 2-3 daqiqa chuqur nafas olib, yengil cho\'zilish harakatlari.', 'Разминка: 2-3 минуты спокойных вдохов и потягиваний.', 'Warm-up: 2-3 minutes of deep breathing and gentle stretching.')}
                                        </Text>
                                    </View>
                                    <View style={styles.guideStepItem}>
                                        <Text style={[styles.guideStepNumber, { color: selectedGuideExercise.color || '#00E676' }]}>2</Text>
                                        <Text style={[styles.guideStepText, { color: colors.textSecondary }]}>
                                            {tLang('Asosiy harakat: qomatni to\'g\'ri tuting, keskin harakatlarsiz tekis maromda bajaring.', 'Основное движение: держите осанку ровно, двигайтесь равномерно без резких рывков.', 'Main movement: maintain posture, move smoothly without sudden jerks.')}
                                        </Text>
                                    </View>
                                    <View style={styles.guideStepItem}>
                                        <Text style={[styles.guideStepNumber, { color: selectedGuideExercise.color || '#00E676' }]}>3</Text>
                                        <Text style={[styles.guideStepText, { color: colors.textSecondary }]}>
                                            {tLang('Nafas tartibi: burun orqali chuqur nafas oling, og\'iz orqali chiqaring. Nafasni ushlab turmang.', 'Дыхание: спокойный вдох через нос, выдох через рот. Никогда не задерживайте дыхание.', 'Breathing: inhale through nose, exhale through mouth. Never hold your breath.')}
                                        </Text>
                                    </View>
                                    <View style={styles.guideStepItem}>
                                        <Text style={[styles.guideStepNumber, { color: selectedGuideExercise.color || '#00E676' }]}>4</Text>
                                        <Text style={[styles.guideStepText, { color: colors.textSecondary }]}>
                                            {tLang('Yakunlash: sur\'atni asta-sekin pasaytirib, pulsni normallashtiring.', 'Завершение: снизьте темп и восстановите пульс перед отдыхом.', 'Cool-down: gradually lower pace and normalize pulse.')}
                                        </Text>
                                    </View>
                                </View>

                                {/* Safety Advice */}
                                <View style={[styles.guideWarnBox, { backgroundColor: isDark ? 'rgba(74, 158, 255, 0.08)' : '#F0F9FF', borderColor: isDark ? 'rgba(74, 158, 255, 0.2)' : '#BAE6FD' }]}>
                                    <Ionicons name="information-circle" size={20} color="#0284C7" style={{ marginRight: 8, marginTop: 2 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#93C5FD' : '#0369A1', marginBottom: 2 }}>
                                            {tLang('Shifokor xavfsizlik maslahati', 'Совет по безопасности', 'Doctor Safety Advice')}
                                        </Text>
                                        <Text style={{ fontSize: 13, color: isDark ? '#E0F2FE' : '#0C4A6E', lineHeight: 18 }}>
                                            {getSafetyTipText(selectedGuideExercise) || (lang === 'en' ? 'If you feel any discomfort, stop immediately and rest.' : (lang === 'ru' ? 'При дискомфорте немедленно прекратите упражнение и отдохните.' : 'O\'zingizni noqulay his qilsangiz, mashqni darhol to\'xtating va dam oling.'))}
                                        </Text>
                                    </View>
                                </View>
                            </ScrollView>

                            {/* Modal Action Buttons */}
                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                                <TouchableOpacity
                                    onPress={() => {
                                        const ex = selectedGuideExercise;
                                        setSelectedGuideExercise(null);
                                        handleStartTimer(ex);
                                    }}
                                    style={[styles.modalActionBtn, { flex: 1, backgroundColor: selectedGuideExercise.color || '#00E676' }]}
                                >
                                    <Ionicons name="play" size={18} color="#000" />
                                    <Text style={[styles.modalActionBtnText, { color: '#000' }]}>
                                        {tLang('Taymerni boshlash', 'Начать с таймером', 'Start with Timer')}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => {
                                        const ex = selectedGuideExercise;
                                        setSelectedGuideExercise(null);
                                        handleQuickToggleDone(ex);
                                    }}
                                    style={[styles.modalActionBtn, { flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }]}
                                >
                                    <Ionicons name="checkmark-circle-outline" size={18} color={colors.text} />
                                    <Text style={[styles.modalActionBtnText, { color: colors.text }]}>
                                        {tLang('Bajarildi deb belgilash', 'Отметить как выполненное', 'Mark as Completed')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}

            {/* Interactive Timer Modal */}
            <Modal
                visible={timerModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setTimerModalVisible(false)}
            >
                <View style={styles.timerOverlay}>
                    <View style={[styles.timerSheet, { backgroundColor: isDark ? '#141a17' : '#ffffff' }]}>
                        <View style={styles.timerHeader}>
                            <Text style={[styles.timerExerciseName, { color: colors.text }]} numberOfLines={1}>
                                {lang === 'en' && activeExercise?.titleEn ? activeExercise.titleEn : (lang === 'ru' && activeExercise?.titleRu ? activeExercise.titleRu : activeExercise?.title)}
                            </Text>
                            <TouchableOpacity onPress={() => setTimerModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Animated Countdown Circle */}
                        <Animated.View style={[styles.timerCircleWrap, { transform: [{ scale: pulseAnim }], borderColor: activeExercise?.color || '#00E676' }]}>
                            <Text style={[styles.timerSecondsText, { color: activeExercise?.color || '#00E676' }]}>
                                {formatTime(secondsLeft)}
                            </Text>
                            <Text style={[styles.timerLabel, { color: colors.textSecondary }]}>
                                {isRunning
                                    ? tLang('Mashq bajarilmoqda...', 'Идёт упражнение...', 'Exercise in progress...')
                                    : tLang('To\'xtatildi', 'Пауза', 'Paused')}
                            </Text>
                        </Animated.View>

                        {/* Control Buttons */}
                        <View style={styles.timerControlsRow}>
                            <TouchableOpacity
                                onPress={handleTogglePause}
                                style={[styles.controlBtn, { backgroundColor: isRunning ? '#FFA726' : '#00E676' }]}
                            >
                                <Ionicons name={isRunning ? "pause" : "play"} size={26} color="#000" />
                                <Text style={styles.controlBtnText}>
                                    {isRunning
                                        ? tLang('Pauza', 'Пауза', 'Pause')
                                        : tLang('Davom ettirish', 'Продолжить', 'Resume')}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleFinishExercise(activeExercise)}
                                style={[styles.finishBtn, { borderColor: '#00E676' }]}
                            >
                                <Ionicons name="checkmark-done" size={24} color="#00E676" />
                                <Text style={[styles.finishBtnText, { color: '#00E676' }]}>
                                    {tLang('Tugatish', 'Завершить', 'Finish')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    backBtn: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    headerSubtitle: { fontSize: 13 },
    calBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1,
        gap: 4,
    },
    calBadgeText: { fontSize: 13, fontWeight: '800' },
    safetyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: SPACING.lg,
        borderRadius: RADIUS.md,
        padding: 12,
        borderWidth: 1,
        marginBottom: 14,
    },
    safetyTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
    safetyText: { fontSize: 12, lineHeight: 16 },
    summaryCard: {
        marginHorizontal: SPACING.lg,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryTitle: { fontSize: 16, fontWeight: '800' },
    summarySub: { fontSize: 13, marginTop: 4, fontWeight: '600' },
    progressCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0,0,0,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressPercentText: { fontSize: 14, fontWeight: '800', color: '#00E676' },
    exCard: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1.5,
    },
    exCardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    exIconWrap: {
        width: 50,
        height: 50,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    exTitle: { fontSize: 16, fontWeight: '700' },
    badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
    pillBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 4,
    },
    pillBadgeText: { fontSize: 11, fontWeight: '700' },
    exDesc: { fontSize: 13, lineHeight: 18, marginTop: 10 },
    tipBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 8,
        borderRadius: 10,
        marginTop: 10,
    },
    tipText: { fontSize: 11, flex: 1, lineHeight: 15 },
    softTipWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        marginTop: 8,
    },
    softTipText: { fontSize: 11, fontWeight: '600', flex: 1 },
    startBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        marginTop: 14,
        gap: 8,
    },
    startBtnText: { fontSize: 14, fontWeight: '800' },
    timerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    timerSheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        alignItems: 'center',
    },
    timerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    timerExerciseName: { fontSize: 17, fontWeight: '800', flex: 1, marginRight: 10 },
    timerCircleWrap: {
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 20,
    },
    timerSecondsText: { fontSize: 44, fontWeight: '900' },
    timerLabel: { fontSize: 13, marginTop: 4, fontWeight: '600' },
    timerControlsRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        marginTop: 16,
    },
    controlBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
    },
    controlBtnText: { color: '#000', fontSize: 15, fontWeight: '800' },
    finishBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1.5,
        gap: 8,
    },
    finishBtnText: { fontSize: 15, fontWeight: '800' },
    guideModalSheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 20,
        maxHeight: '88%',
    },
    guideHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    guideIconBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    guideModalTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    guideSec: {
        marginBottom: 14,
    },
    guideSecTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 6,
    },
    guideSecText: {
        fontSize: 13,
        lineHeight: 19,
    },
    guideStepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
        gap: 8,
    },
    guideStepNumber: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(0,0,0,0.06)',
        textAlign: 'center',
        fontWeight: '800',
        fontSize: 12,
        lineHeight: 22,
    },
    guideStepText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
    guideWarnBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 14,
    },
    modalActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
        borderRadius: 14,
        gap: 6,
    },
    modalActionBtnText: {
        fontSize: 13,
        fontWeight: '800',
    },
});

export default ExercisesScreen;

