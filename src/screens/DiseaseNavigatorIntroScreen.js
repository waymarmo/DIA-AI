import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, StatusBar, Platform, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SPACING, RADIUS } from '../constants/theme';
import { useTranslation } from 'react-i18next';
import { saveData, markOnboardingComplete, archiveCurrentDisease } from '../utils/storage';

const DiseaseNavigatorIntroScreen = ({ navigation, route }) => {
    const { colors, isDark } = useTheme();
    const { i18n } = useTranslation();
    const isRu = i18n?.language === 'ru';
    const isEn = i18n?.language === 'en';
    const GREEN = colors.primary || '#00E676';

    const isSwitchMode = route?.params?.switchMode;
    const initialDisease = route?.params?.currentDisease || 'Diabet';

    const [selectedDisease, setSelectedDisease] = useState(initialDisease);
    const [submitting, setSubmitting] = useState(false);

    const diseaseList = [
        {
            key: 'Diabet',
            label: isEn ? 'Diabetes' : (isRu ? 'Диабет' : 'Diabet'),
            subtitle: isEn
                ? 'Glucose, insulin & carbohydrate tracking'
                : (isRu ? 'Контроль глюкозы, инсулина и углеводов' : 'Glyukoza, insulin va uglevodlar nazorati'),
            icon: 'water',
            color: '#00E676',
            badge: isEn ? 'Recommended' : (isRu ? 'Рекомендуется' : 'Tavsiya etiladi'),
        },
        {
            key: 'Gipertenziya',
            label: isEn ? 'Hypertension' : (isRu ? 'Гипертония' : 'Gipertenziya'),
            subtitle: isEn
                ? 'Blood pressure, pulse & sodium balance monitoring'
                : (isRu ? 'Мониторинг давления и пульса' : 'Qon bosimi, puls va tuz balansi'),
            icon: 'heart',
            color: '#FF5252',
        },
        {
            key: 'Aritmiya',
            label: isEn ? 'Arrhythmia & Cardio' : (isRu ? 'Аритмия и Кардио' : 'Aritmiya & Kardio'),
            subtitle: isEn
                ? 'Heart rhythm analysis and cardiac exercise safety'
                : (isRu ? 'Ритм сердца и кардио-активность' : 'Yurak ritmi va kardio tahlillar'),
            icon: 'pulse',
            color: '#FF9100',
        },
        {
            key: 'Semizlik',
            label: isEn ? 'Metabolic & Weight Care' : (isRu ? 'Метаболизм и Вес' : 'Metabolik sindrom & Semizlik'),
            subtitle: isEn
                ? 'Healthy weight management and active calorie tracking'
                : (isRu ? 'Нормализация веса и метаболизма' : 'Vazn me\'yori va faol parhez'),
            icon: 'fitness',
            color: '#7C4DFF',
        },
        {
            key: 'Astma',
            label: isEn ? 'Asthma & Respiratory' : (isRu ? 'Астма и Дыхание' : 'Nafas yo\'llari & Astma'),
            subtitle: isEn
                ? 'Spirometry monitoring and therapeutic breathing exercises'
                : (isRu ? 'Спирометрия и дыхательные практики' : 'Spirametriya va toza nafas mashqlari'),
            icon: 'leaf',
            color: '#26A69A',
        },
        {
            key: 'Boshqa',
            label: isEn ? 'Other Health Conditions' : (isRu ? 'Другое состояние' : 'Boshqa holatlar'),
            subtitle: isEn
                ? 'Customized AI assistant monitoring and personalized care plan'
                : (isRu ? 'Персональный план от AI-ассистента' : 'Shaxsiy AI monitoring va tavsiyalar'),
            icon: 'medical',
            color: '#78909C',
        },
    ];

    const handleConfirm = async () => {
        if (!selectedDisease || submitting) return;
        setSubmitting(true);
        try {
            if (isSwitchMode) {
                try {
                    if (typeof archiveCurrentDisease === 'function') {
                        await archiveCurrentDisease();
                    }
                } catch (arcErr) {
                    console.warn('Archive error:', arcErr);
                }
                await saveData('primaryDisease', selectedDisease);
                await AsyncStorage.setItem('diseaseChangedAt', Date.now().toString());

                Alert.alert(
                    isEn ? "Diagnosis Successfully Updated" : (isRu ? "Диагноз успешно обновлен" : "Tashxis muvaffaqiyatli o'zgartirildi"),
                    isEn
                        ? `Previous medical records safely archived. Your new active health plan: «${selectedDisease}».`
                        : (isRu
                            ? `Предыдущие записи сохранены в архив. Ваш новый активный профиль: «${selectedDisease}».`
                            : `Avvalgi ko'rsatkichlar hisobotlar arxiviga saqlandi. Yangi faol profilingiz: «${selectedDisease}».`),
                    [{
                        text: 'OK',
                        onPress: () => {
                            try {
                                navigation.navigate('MainTabs', {
                                    screen: 'Profil',
                                    params: { diseaseUpdated: selectedDisease }
                                });
                            } catch {
                                try {
                                    navigation.navigate('MainApp', {
                                        screen: 'Profil',
                                        params: { diseaseUpdated: selectedDisease }
                                    });
                                } catch {
                                    navigation.navigate('Profile', { diseaseUpdated: selectedDisease });
                                }
                            }
                        }
                    }]
                );
                return;
            }
            await saveData('primaryDisease', selectedDisease);
            await markOnboardingComplete();
            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        } catch (e) {
            console.warn('Disease selection error:', e);
            if (isSwitchMode) {
                navigation.goBack();
            } else {
                navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#05180F' : '#eef9f2' }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Asosiy tibbiy fon gradienti - rasm butunlay olib tashlangan, o'ta tiniq va xatosiz */}
            <LinearGradient
                colors={isDark
                    ? ['#05180F', '#082518', '#030E09']
                    : ['#eef9f2', '#e2f6eb', '#d5f2e2']}
                locations={[0, 0.45, 1]}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Back to Profile Button when switched from Profile */}
                {isSwitchMode && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md, marginTop: 4 }}>
                        <TouchableOpacity
                            onPress={() => {
                                if (navigation.canGoBack()) {
                                    navigation.goBack();
                                } else {
                                    try {
                                        navigation.navigate('MainTabs', { screen: 'Profil' });
                                    } catch {
                                        navigation.navigate('MainApp', { screen: 'Profil' });
                                    }
                                }
                            }}
                            style={{
                                width: 42,
                                height: 42,
                                borderRadius: 21,
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#ffffff',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 1,
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#bbf7d0'
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-back" size={22} color={isDark ? '#fff' : '#0f172a'} />
                        </TouchableOpacity>
                        <Text style={{ marginLeft: 12, fontSize: 16, fontWeight: '700', color: isDark ? '#fff' : '#0f172a' }}>
                            {isEn ? 'Return to Profile' : (isRu ? 'Назад в профиль' : 'Profilga qaytish')}
                        </Text>
                    </View>
                )}

                {/* Top Hero Section */}
                <View style={styles.heroSection}>
                    <View style={[
                        styles.topBadge,
                        {
                            backgroundColor: isDark ? 'rgba(0, 230, 118, 0.18)' : '#DCFCE7',
                            borderColor: isDark ? 'rgba(0, 230, 118, 0.45)' : '#86efac',
                        }
                    ]}>
                        <Ionicons name="sparkles" size={14} color={isDark ? '#00E676' : '#15803d'} />
                        <Text style={[styles.topBadgeText, { color: isDark ? '#00E676' : '#15803d' }]}>
                            {isEn ? 'AI HEALTH NAVIGATOR' : (isRu ? 'AI НАВИГАТОР ЗДОРОВЬЯ' : 'AI SOG\'LIQ NAVIGATORI')}
                        </Text>
                    </View>

                    <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#0f172a' }]}>
                        {isEn
                            ? 'Your Personal\nHealth Navigator'
                            : (isRu
                                ? 'Ваш персональный\nпутеводитель по здоровью'
                                : 'Kasalligingiz Bo\'yicha\nYo\'l Ko\'rsatamiz')}
                    </Text>

                    <Text style={[styles.subtitle, { color: isDark ? 'rgba(255, 255, 255, 0.9)' : '#475569' }]}>
                        {isEn
                            ? 'Select your primary health condition. DIA AI automatically customizes your diet, medication schedule, and safe exercise program.'
                            : (isRu
                                ? 'Выберите основное состояние. AI автоматически настроит вашу диету, график приема лекарств и безопасные тренировки.'
                                : 'Asosiy tashxisingizni tanlang. DIA AI sizga mos individual parhez, dori-darmonlar va sport mashqlarini avtomatik moslashtiradi.')}
                    </Text>
                </View>

                {/* Feature Cards Row */}
                <View style={[
                    styles.featuresRow,
                    {
                        backgroundColor: isDark ? 'rgba(9, 27, 18, 0.95)' : '#ffffff',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : '#bbf7d0',
                    }
                ]}>
                    {[
                        {
                            icon: 'restaurant-outline',
                            label: isEn ? 'Diet' : (isRu ? 'Диета' : 'Parhez'),
                            desc: isEn ? 'Personal menu' : (isRu ? 'Питание' : 'Shaxsiy taomnoma'),
                        },
                        {
                            icon: 'fitness-outline',
                            label: isEn ? 'Workouts' : (isRu ? 'Спорт' : 'Mashqlar'),
                            desc: isEn ? 'Safe routines' : (isRu ? 'Безопасно' : 'Xavfsiz mashqlar'),
                        },
                        {
                            icon: 'medkit-outline',
                            label: isEn ? 'Meds' : (isRu ? 'Лекарства' : 'Dorilar'),
                            desc: isEn ? 'Smart alerts' : (isRu ? 'Контроль' : 'Vaqtida eslatish'),
                        },
                    ].map((item, i) => (
                        <View key={i} style={styles.featureItem}>
                            <View style={[styles.featureIconBg, { backgroundColor: isDark ? 'rgba(0, 230, 118, 0.2)' : '#DCFCE7' }]}>
                                <Ionicons name={item.icon} size={20} color={GREEN} />
                            </View>
                            <Text style={[styles.featureLabel, { color: isDark ? '#FFFFFF' : '#0f172a' }]}>{item.label}</Text>
                            <Text style={[styles.featureDesc, { color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#64748b' }]}>{item.desc}</Text>
                        </View>
                    ))}
                </View>

                {/* Disease Selection Section */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#0f172a' }]}>
                        {isEn ? 'Choose Your Condition:' : (isRu ? 'Выберите диагноз:' : 'Tashxisingizni tanlang:')}
                    </Text>
                    <Text style={[styles.sectionSubtitle, { color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#64748b' }]}>
                        {isEn ? 'Required to personalize your daily health plan' : (isRu ? 'Обязательно для подбора плана' : 'Rejani moslashtirish uchun shart')}
                    </Text>
                </View>

                {/* Rich Disease Cards */}
                <View style={styles.diseaseList}>
                    {diseaseList.map((disease) => {
                        const isSelected = selectedDisease === disease.key;
                        return (
                            <TouchableOpacity
                                key={disease.key}
                                style={[
                                    styles.diseaseCard,
                                    {
                                        backgroundColor: isDark ? '#0c2217' : '#ffffff',
                                        borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : '#bbf7d0',
                                    },
                                    isSelected && {
                                        borderColor: disease.color,
                                        borderWidth: 2,
                                        backgroundColor: isDark ? 'rgba(12, 34, 23, 0.98)' : '#f0fdf4',
                                    }
                                ]}
                                onPress={() => setSelectedDisease(disease.key)}
                                activeOpacity={0.85}
                            >
                                {/* Selected subtle ambient glow */}
                                {isSelected && (
                                    <View
                                        style={[
                                            StyleSheet.absoluteFillObject,
                                            { backgroundColor: `${disease.color}12` }
                                        ]}
                                        pointerEvents="none"
                                    />
                                )}

                                {/* Icon Box */}
                                <View style={[
                                    styles.iconBox,
                                    { backgroundColor: `${disease.color}20`, borderColor: `${disease.color}50` }
                                ]}>
                                    <Ionicons name={disease.icon} size={24} color={disease.color} />
                                </View>

                                {/* Info */}
                                <View style={styles.diseaseInfo}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={[styles.diseaseLabel, { color: isDark ? '#FFFFFF' : '#0f172a' }]}>{disease.label}</Text>
                                        {disease.badge && (
                                            <View style={[styles.cardBadge, { backgroundColor: isDark ? 'rgba(0, 230, 118, 0.22)' : '#DCFCE7' }]}>
                                                <Text style={[styles.cardBadgeText, { color: isDark ? '#00E676' : '#15803d' }]}>{disease.badge}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={[styles.diseaseSubtext, { color: isDark ? 'rgba(255, 255, 255, 0.88)' : '#475569' }]}>{disease.subtitle}</Text>
                                </View>

                                {/* Selection Radio / Check Indicator */}
                                <View style={[
                                    styles.checkCircle,
                                    { borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : '#cbd5e1' },
                                    isSelected && { backgroundColor: disease.color, borderColor: disease.color }
                                ]}>
                                    {isSelected && (
                                        <Ionicons name="checkmark" size={14} color="#fff" />
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Confirm Button */}
                <TouchableOpacity
                    style={[
                        styles.confirmBtn,
                        { backgroundColor: selectedDisease ? GREEN : '#1a3a28' }
                    ]}
                    onPress={handleConfirm}
                    disabled={submitting || !selectedDisease}
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={['#00E676', '#00C853']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.confirmGradient}
                    >
                        <Text style={styles.confirmBtnText}>
                            {isSwitchMode
                                ? (isEn ? 'Switch to this condition' : (isRu ? 'Перейти на этот диагноз' : "Ushbu tashxisga o'tish"))
                                : (isEn ? 'Continue' : (isRu ? 'Продолжить' : 'Davom etish'))}
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color="#000" />
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 36),
    },
    scroll: {
        flex: 1,
        zIndex: 10,
    },
    scrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: 48,
        flexGrow: 1,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    topBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1.2,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 14,
    },
    topBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    title: {
        fontSize: 27,
        fontWeight: '900',
        textAlign: 'center',
        letterSpacing: -0.4,
        lineHeight: 35,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 6,
    },
    featuresRow: {
        flexDirection: 'row',
        borderWidth: 1.2,
        borderRadius: 18,
        padding: 12,
        marginBottom: SPACING.xl,
        gap: 8,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    featureItem: {
        flex: 1,
        alignItems: 'center',
    },
    featureIconBg: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    featureLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 2,
    },
    featureDesc: {
        fontSize: 10.5,
        textAlign: 'center',
    },
    sectionHeader: {
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    sectionSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    diseaseList: {
        gap: 10,
        marginBottom: SPACING.xl,
    },
    diseaseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.2,
        borderRadius: 16,
        overflow: 'hidden',
        padding: 14,
        gap: 14,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    diseaseInfo: {
        flex: 1,
    },
    diseaseLabel: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.1,
    },
    diseaseSubtext: {
        fontSize: 12,
        marginTop: 4,
        lineHeight: 16,
    },
    cardBadge: {
        borderColor: 'rgba(0, 230, 118, 0.45)',
        borderWidth: 0.8,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 8,
    },
    cardBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmBtn: {
        width: '100%',
        height: 52,
        borderRadius: 26,
        overflow: 'hidden',
        marginTop: 4,
    },
    confirmGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    confirmBtnText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
});

export default DiseaseNavigatorIntroScreen;
