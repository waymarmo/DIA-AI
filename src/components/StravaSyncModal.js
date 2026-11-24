import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    TextInput,
    Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { SPACING, RADIUS } from '../constants/theme';
import {
    getStravaStatus,
    connectDemoStrava,
    syncStravaActivities,
    disconnectStrava,
    openStravaOAuth,
    saveStravaConfig,
    exchangeStravaCodeForToken
} from '../services/StravaService';
import { DILDORA_AVATAR_URI } from '../constants/defaultAvatar';

const STRAVA_ORANGE = '#FC4C02';

const StravaSyncModal = ({ visible, onClose, onSyncSuccess }) => {
    const { colors, isDark } = useTheme();
    const { i18n } = useTranslation();
    const lang = i18n.language || 'uz';
    const isEn = lang === 'en';
    const isRu = lang === 'ru';
    const tLang = (uz, ru, en) => {
        if (lang === 'en') return en;
        if (lang === 'ru') return ru;
        return uz;
    };

    const [status, setStatus] = useState({
        connected: true,
        athlete: {
            id: 299645,
            username: 'dildora_g',
            firstname: 'Dildora',
            lastname: "G'ofurova",
            city: 'Toshkent',
            country: 'Uzbekistan',
            profile: null,
            badge: 'Mibro Fit Smartwatch Linked'
        },
        lastSync: 'Bugun, hozir (Avtomatik)',
        config: { clientId: '299645', clientSecret: '53811dcbbea24d21e1a72a0ad5b1546ff27c74b8' },
        syncedLogs: []
    });
    const [loading, setLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [clientIdInput, setClientIdInput] = useState('');
    const [clientSecretInput, setClientSecretInput] = useState('');
    const [authCodeInput, setAuthCodeInput] = useState('');
    const [athleteNameInput, setAthleteNameInput] = useState("Dildora G'ofurova");

    const loadStatus = useCallback(async () => {
        setLoading(true);
        const st = await getStravaStatus();
        setStatus(st);
        if (st.athlete?.firstname) {
            setAthleteNameInput(`${st.athlete.firstname} ${st.athlete.lastname || ''}`.trim());
        }
        if (st.config) {
            setClientIdInput(st.config.clientId || '');
            setClientSecretInput(st.config.clientSecret || '');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (visible) {
            loadStatus();
        }
    }, [visible, loadStatus]);

    // Handle 1-Tap Demo Connect
    const handleDemoConnect = async () => {
        setLoading(true);
        const nameToUse = athleteNameInput.trim() || 'Oskar (Mibro Fit)';
        const res = await connectDemoStrava(nameToUse);
        setLoading(false);
        if (res.success) {
            await loadStatus();
            if (onSyncSuccess) onSyncSuccess();
            Alert.alert(
                lang === 'ru' ? 'Успешно подключено!' : 'Muvaffaqiyatli ulandi!',
                lang === 'ru'
                    ? `Mibro Fit со Strava подключен. Синхронизировано ${res.syncedCount} тренировок (${res.totalCalories} ккал)!`
                    : `Mibro Fit soati Strava orqali ulandi. ${res.syncedCount} ta mashq (${res.totalCalories} kkal) Dia AI-ga sinxronlashtirildi!`
            );
        } else {
            Alert.alert('Xatolik', res.error || 'Ulanishda muammo yuz berdi');
        }
    };

    // Handle Sync Now
    const handleSyncNow = async () => {
        setIsSyncing(true);
        const res = await syncStravaActivities();
        setIsSyncing(false);
        if (res.success) {
            await loadStatus();
            if (onSyncSuccess) onSyncSuccess();
            Alert.alert(
                lang === 'ru' ? 'Синхронизация завершена' : 'Sinxronizatsiya yakunlandi',
                lang === 'ru'
                    ? `Тренировки обновлены! Сожжено ${res.totalCalories || 0} ккал.`
                    : `Mashqlar yangilandi! Sarflangan kaloriya: ${res.totalCalories || 0} kkal.`
            );
        } else {
            Alert.alert('Xatolik', res.error || 'Sinxronlashda xatolik yuz berdi');
        }
    };

    // Handle Disconnect
    const handleDisconnect = () => {
        Alert.alert(
            lang === 'ru' ? 'Отключить Strava' : 'Strava-ni uzish',
            lang === 'ru'
                ? 'Вы уверены, что хотите отключить синхронизацию с Mibro Fit / Strava?'
                : 'Mibro Fit / Strava sinxronizatsiyasini uzmoqchimisiz?',
            [
                { text: lang === 'ru' ? 'Отмена' : 'Bekor qilish', style: 'cancel' },
                {
                    text: lang === 'ru' ? 'Отключить' : 'Uzish',
                    style: 'destructive',
                    onPress: async () => {
                        await disconnectStrava();
                        await loadStatus();
                        if (onSyncSuccess) onSyncSuccess();
                    }
                }
            ]
        );
    };

    // Handle OAuth open
    const handleOpenOAuth = async () => {
        if (!clientIdInput.trim()) {
            Alert.alert(
                lang === 'ru' ? 'Введите Client ID' : 'Client ID kiriting',
                lang === 'ru'
                    ? 'Для официального API Strava требуется Client ID. Или используйте кнопку быстрого демо-подключения.'
                    : 'Rasmiy Strava API uchun Client ID kerak. Yoki «Tezkor Ulanish (Demo)» tugmasidan foydalaning.'
            );
            return;
        }

        await saveStravaConfig(clientIdInput, clientSecretInput);
        const res = await openStravaOAuth(clientIdInput);
        if (res.success) {
            Alert.alert(
                lang === 'ru' ? 'Авторизация в браузере' : 'Brauzerda tasdiqlash',
                lang === 'ru'
                    ? 'После подтверждения в браузере введите полученный код ниже.'
                    : 'Brauzerda ruxsat berganingizdan keyin olingan kodni pastdagi maydonga kiriting.'
            );
        }
    };

    // Handle manual code submit
    const handleCodeSubmit = async () => {
        if (!authCodeInput.trim() || !clientIdInput.trim() || !clientSecretInput.trim()) {
            Alert.alert('Xatolik', 'Client ID, Client Secret va Authorization Code to\'ldirilishi shart');
            return;
        }

        setLoading(true);
        const res = await exchangeStravaCodeForToken(authCodeInput, clientIdInput, clientSecretInput);
        setLoading(false);
        if (res.success) {
            setAuthCodeInput('');
            setShowConfig(false);
            await loadStatus();
            if (onSyncSuccess) onSyncSuccess();
            Alert.alert('Muvaffaqiyatli', 'Strava hisobingiz to\'liq ulandi!');
        } else {
            Alert.alert('Xatolik', res.error || 'Token olishda xatolik yuz berdi');
        }
    };

    const formatLastSync = (iso) => {
        if (!iso) return lang === 'ru' ? 'Никогда' : 'Hali qilinmagan';
        try {
            const d = new Date(iso);
            return `${d.toLocaleDateString()} ${d.toLocaleTimeString().slice(0, 5)}`;
        } catch (e) {
            return iso;
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.sheet, { backgroundColor: isDark ? '#141816' : '#ffffff' }]}>
                    {/* Header */}
                    <View style={styles.headerRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={[styles.stravaLogoWrap, { backgroundColor: `${STRAVA_ORANGE}20` }]}>
                                <Ionicons name="fitness" size={24} color={STRAVA_ORANGE} />
                            </View>
                            <View>
                                <Text style={[styles.headerTitle, { color: colors.text }]}>
                                    Strava & Mibro Fit
                                </Text>
                                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                                    {tLang("Aqlli soat va fitnes sinxronlash", "Синхронизация смарт-часов", "Smartwatch Synchronization")}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                        {loading ? (
                            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={STRAVA_ORANGE} />
                                <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
                                    {tLang("Holat tekshirilmoqda...", "Загрузка статуса...", "Checking status...")}
                                </Text>
                            </View>
                        ) : status.connected ? (
                            /* ─── CONNECTED STATE ─── */
                            <View>
                                {/* Connected Status Banner */}
                                <LinearGradient
                                    colors={isDark ? ['#2d170b', '#1c1008'] : ['#FFF3E0', '#FFE0B2']}
                                    style={styles.connectedCard}
                                >
                                    <View style={styles.connectedRow}>
                                        <View style={styles.avatarCircle}>
                                            {status.athlete?.profile ? (
                                                <Image
                                                    source={{ uri: status.athlete.profile }}
                                                    style={{ width: 48, height: 48, borderRadius: 24 }}
                                                />
                                            ) : (
                                                <Text style={{ fontSize: 20, fontWeight: '800', color: STRAVA_ORANGE }}>
                                                    {(status.athlete?.firstname || 'H')[0]}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Text style={[styles.connectedAthleteName, { color: isDark ? '#fff' : '#000' }]}>
                                                    {status.athlete?.firstname || 'Dildora'} {status.athlete?.lastname || "G'ofurova"}
                                                </Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0, 230, 118, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                                    <Ionicons name="checkmark-circle" size={13} color="#00E676" />
                                                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#00E676' }}>Faol ulangan</Text>
                                                </View>
                                            </View>
                                            <Text style={[styles.connectedSub, { color: isDark ? '#FFA726' : '#E65100' }]}>
                                                ID: #{status.athlete?.id || '299645'} • {status.athlete?.city || 'Toshkent'} • ⌚️ Mibro Fit
                                            </Text>
                                            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                                                {lang === 'ru' ? 'Посл. синхронизация:' : 'Oxirgi yangilanish:'} {formatLastSync(status.lastSync)}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Sync Now Button */}
                                    <TouchableOpacity
                                        onPress={handleSyncNow}
                                        disabled={isSyncing}
                                        style={[styles.syncNowBtn, { backgroundColor: STRAVA_ORANGE }]}
                                    >
                                        {isSyncing ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Ionicons name="sync" size={18} color="#fff" />
                                        )}
                                        <Text style={styles.syncNowBtnText}>
                                            {isSyncing
                                                ? (tLang("Sinxronlanmoqda...", "Синхронизация...", "Syncing..."))
                                                : (tLang("Hozir sinxronlash", "Синхронизировать сейчас", "Sync Now"))}
                                        </Text>
                                    </TouchableOpacity>
                                </LinearGradient>

                                {/* Synced Workouts List */}
                                <Text style={[styles.sectionHeading, { color: colors.text }]}>
                                    ⌚️ {lang === 'ru' ? 'Синхронизированные тренировки' : 'Soatdan olingan mashqlar'}:
                                </Text>

                                {status.syncedLogs && status.syncedLogs.length > 0 ? (
                                    status.syncedLogs.map((item, idx) => (
                                        <View
                                            key={item.id || idx}
                                            style={[styles.workoutItem, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
                                        >
                                            <View style={[styles.workoutIconWrap, { backgroundColor: `${STRAVA_ORANGE}15` }]}>
                                                <Ionicons name={item.icon || 'walk-outline'} size={22} color={STRAVA_ORANGE} />
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text style={[styles.workoutTitle, { color: colors.text }]}>
                                                    {item.title}
                                                </Text>
                                                <View style={styles.workoutMetaRow}>
                                                    <View style={styles.metaBadge}>
                                                        <Ionicons name="flame" size={12} color="#FF9800" />
                                                        <Text style={styles.metaBadgeText}>{item.calories} kkal</Text>
                                                    </View>
                                                    <View style={styles.metaBadge}>
                                                        <Ionicons name="time-outline" size={12} color="#4A9EFF" />
                                                        <Text style={styles.metaBadgeText}>{item.duration} daq</Text>
                                                    </View>
                                                    {item.distanceKm && (
                                                        <View style={styles.metaBadge}>
                                                            <Ionicons name="navigate-outline" size={12} color="#00E676" />
                                                            <Text style={styles.metaBadgeText}>{item.distanceKm} km</Text>
                                                        </View>
                                                    )}
                                                    {item.heartRate && (
                                                        <View style={styles.metaBadge}>
                                                            <Ionicons name="heart" size={12} color="#E91E63" />
                                                            <Text style={styles.metaBadgeText}>{item.heartRate} bpm</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={{ color: colors.textSecondary, fontSize: 13, fontStyle: 'italic', marginBottom: 16 }}>
                                        {lang === 'ru' ? 'Тренировок пока нет' : 'Hozircha yangi mashqlar yo\'q'}
                                    </Text>
                                )}

                                {/* Disconnect Button */}
                                <TouchableOpacity
                                    onPress={handleDisconnect}
                                    style={[styles.disconnectBtn, { borderColor: '#FF5252' }]}
                                >
                                    <Ionicons name="link-outline" size={18} color="#FF5252" />
                                    <Text style={styles.disconnectBtnText}>
                                        {lang === 'ru' ? 'Отключить связь со Strava' : 'Strava aloqasini uzish'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            /* ─── DISCONNECTED STATE ─── */
                            <View>
                                {/* Explanation Card */}
                                <View style={[styles.infoBanner, { backgroundColor: isDark ? 'rgba(252, 76, 2, 0.1)' : '#FFF3E0', borderColor: isDark ? 'rgba(252, 76, 2, 0.25)' : '#FFE0B2' }]}>
                                    <Ionicons name="information-circle" size={24} color={STRAVA_ORANGE} style={{ marginRight: 10, marginTop: 2 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.infoBannerTitle, { color: STRAVA_ORANGE }]}>
                                            {lang === 'ru' ? 'Как это работает?' : 'Qanday ishlaydi?'}
                                        </Text>
                                        <Text style={[styles.infoBannerText, { color: isDark ? '#FFE0B2' : '#5D4037' }]}>
                                            {lang === 'ru'
                                                ? 'Ваши смарт-часы Mibro Fit отправляют тренировки в Strava. Dia AI автоматически читает данные из Strava и учитывает сожжённые калории в медицинских отчётах.'
                                                : 'Mibro Fit soatingiz barcha mashqlarni Strava-ga uzatadi. Dia AI esa Strava-dan yoqilgan kaloriya, qadam va pulsni avtomatik olib, Hisobotlar bo\'limiga qo\'shadi.'}
                                        </Text>
                                    </View>
                                </View>

                                {/* User Account Identification Input */}
                                <View style={{ marginBottom: 12 }}>
                                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                                        {lang === 'ru' ? 'Ваше имя / аккаунт в Strava:' : 'Sizning ismingiz / Strava akkauntingiz:'}
                                    </Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.inputBg || (isDark ? '#2b302c' : '#f8fafc'), color: colors.text, borderColor: colors.borderLight }]}
                                        placeholder="Masalan: Oskar (Mibro Fit)"
                                        placeholderTextColor={colors.textSecondary}
                                        value={athleteNameInput}
                                        onChangeText={setAthleteNameInput}
                                    />
                                </View>

                                {/* 1-Tap Instant Connect (Recommended) */}
                                <TouchableOpacity
                                    onPress={handleDemoConnect}
                                    activeOpacity={0.85}
                                    style={[styles.primaryActionBtn, { backgroundColor: STRAVA_ORANGE }]}
                                >
                                    <Ionicons name="flash" size={20} color="#fff" />
                                    <Text style={styles.primaryActionBtnText}>
                                        {lang === 'ru' ? '⚡️ Быстрое подключение (Mibro Fit Sync)' : '⚡️ Tezkor Ulanish (Mibro Fit Sync)'}
                                    </Text>
                                </TouchableOpacity>
                                <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: 16 }}>
                                    {lang === 'ru'
                                        ? 'Мгновенно подключает связку Mibro Fit ➔ Strava и синхронизирует сегодняшние калории'
                                        : 'Mibro Fit ➔ Strava zanjirini 1 marta bosishda ulaydi va bugungi mashqlarni tortib oladi'}
                                </Text>

                                {/* Advanced API Settings Toggle */}
                                <TouchableOpacity
                                    onPress={() => setShowConfig(!showConfig)}
                                    style={[styles.configToggleBtn, { borderColor: colors.borderLight }]}
                                >
                                    <Ionicons name="settings-outline" size={16} color={colors.textSecondary} />
                                    <Text style={[styles.configToggleText, { color: colors.textSecondary }]}>
                                        {lang === 'ru' ? 'Расширенные настройки API (Client ID)' : 'Maxsus Strava API sozlamalari (Client ID)'}
                                    </Text>
                                    <Ionicons name={showConfig ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
                                </TouchableOpacity>

                                {showConfig && (
                                    <View style={[styles.configBox, { backgroundColor: isDark ? '#1c221e' : '#f8fafc', borderColor: colors.borderLight }]}>
                                        <Text style={[styles.inputLabel, { color: colors.text }]}>Strava Client ID</Text>
                                        <TextInput
                                            style={[styles.input, { backgroundColor: colors.inputBg || (isDark ? '#2b302c' : '#fff'), color: colors.text, borderColor: colors.borderLight }]}
                                            placeholder="Masalan: 123456"
                                            placeholderTextColor={colors.textSecondary}
                                            value={clientIdInput}
                                            onChangeText={setClientIdInput}
                                        />

                                        <Text style={[styles.inputLabel, { color: colors.text, marginTop: 10 }]}>Strava Client Secret</Text>
                                        <TextInput
                                            style={[styles.input, { backgroundColor: colors.inputBg || (isDark ? '#2b302c' : '#fff'), color: colors.text, borderColor: colors.borderLight }]}
                                            placeholder="Client Secret"
                                            placeholderTextColor={colors.textSecondary}
                                            value={clientSecretInput}
                                            onChangeText={setClientSecretInput}
                                            secureTextEntry
                                        />

                                        <TouchableOpacity
                                            onPress={handleOpenOAuth}
                                            style={[styles.oauthBtn, { backgroundColor: STRAVA_ORANGE }]}
                                        >
                                            <Ionicons name="open-outline" size={16} color="#fff" />
                                            <Text style={styles.oauthBtnText}>
                                                {lang === 'ru' ? 'Открыть авторизацию в браузере' : 'Brauzerda ruxsat berish'}
                                            </Text>
                                        </TouchableOpacity>

                                        <Text style={[styles.inputLabel, { color: colors.text, marginTop: 12 }]}>Authorization Code</Text>
                                        <TextInput
                                            style={[styles.input, { backgroundColor: colors.inputBg || (isDark ? '#2b302c' : '#fff'), color: colors.text, borderColor: colors.borderLight }]}
                                            placeholder="Olingan kodni shu yerga yozing"
                                            placeholderTextColor={colors.textSecondary}
                                            value={authCodeInput}
                                            onChangeText={setAuthCodeInput}
                                        />

                                        <TouchableOpacity
                                            onPress={handleCodeSubmit}
                                            style={styles.saveTokenBtn}
                                        >
                                            <Text style={styles.saveTokenBtnText}>
                                                {lang === 'ru' ? 'Подтвердить код' : 'Kodni tasdiqlash'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: SPACING.lg,
        paddingTop: 20,
        maxHeight: '90%',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    stravaLogoWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    headerSubtitle: {
        fontSize: 12,
    },
    closeBtn: {
        padding: 4,
    },
    connectedCard: {
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
    },
    connectedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    avatarCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(252, 76, 2, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    connectedAthleteName: {
        fontSize: 16,
        fontWeight: '800',
    },
    connectedSub: {
        fontSize: 12,
        fontWeight: '700',
        marginTop: 2,
    },
    syncNowBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        gap: 8,
    },
    syncNowBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
    },
    sectionHeading: {
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 10,
    },
    workoutItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 10,
    },
    workoutIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    workoutTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4,
    },
    workoutMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    metaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 3,
    },
    metaBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    disconnectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        gap: 6,
        marginTop: 10,
    },
    disconnectBtnText: {
        color: '#FF5252',
        fontSize: 13,
        fontWeight: '700',
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    infoBannerTitle: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 4,
    },
    infoBannerText: {
        fontSize: 12,
        lineHeight: 18,
    },
    primaryActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 16,
        gap: 8,
    },
    primaryActionBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
    },
    configToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    configToggleText: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
        marginLeft: 8,
    },
    configBox: {
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        marginTop: 10,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
    },
    input: {
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 13,
    },
    oauthBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
        marginTop: 12,
    },
    oauthBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    saveTokenBtn: {
        backgroundColor: '#00E676',
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    saveTokenBtnText: {
        color: '#000',
        fontSize: 13,
        fontWeight: '800',
    },
});

export default StravaSyncModal;