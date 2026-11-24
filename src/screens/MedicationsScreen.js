import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Modal,
    TextInput,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { SPACING, RADIUS } from '../constants/theme';
import {
    getUserMedications,
    saveUserMedication,
    deleteUserMedication,
    getTodayMedicationsStatus,
    toggleMedicationTakenToday,
    getData
} from '../utils/storage';
import { getDiseaseConfig } from '../utils/diseaseConfig';
import medicationsData from '../data/medications.json';

const { width } = Dimensions.get('window');

const COLOR_OPTIONS = ['#00E676', '#4A9EFF', '#A78BFA', '#FFA726', '#FF5252', '#26C6DA'];

const TIME_OPTIONS = [
    { key: 'ertalab', labelUz: 'Ertalab', labelRu: 'Утром', labelEn: 'Morning' },
    { key: 'tushlik', labelUz: 'Tushlik', labelRu: 'В обед', labelEn: 'Noon' },
    { key: 'kechqurun', labelUz: 'Kechqurun', labelRu: 'Вечером', labelEn: 'Evening' },
    { key: 'ertalab_kechqurun', labelUz: 'Ertalab & Kechqurun', labelRu: 'Утро и вечер', labelEn: 'Morning & Evening' },
    { key: 'yotishdan_oldin', labelUz: 'Yotishdan oldin', labelRu: 'Перед сном', labelEn: 'Bedtime' },
];

const MEAL_OPTIONS = [
    { key: 'ovqatdan_oldin', labelUz: 'Ovqatdan oldin', labelRu: 'До еды', labelEn: 'Before meal' },
    { key: 'ovqat_paytida', labelUz: 'Ovqat paytida', labelRu: 'Во время еды', labelEn: 'With meal' },
    { key: 'ovqatdan_keyin', labelUz: 'Ovqatdan keyin', labelRu: 'После еды', labelEn: 'After meal' },
    { key: 'farqi_yoq', labelUz: 'Farqi yo\'q', labelRu: 'Не важно', labelEn: 'Anytime' },
];

const DISEASE_FILTERS = [
    { key: 'my_disease', labelUz: 'Mening kasalligim', labelRu: 'Мой диагноз', labelEn: 'My Diagnosis' },
    { key: 'all', labelUz: 'Barcha dorilar', labelRu: 'Все лекарства', labelEn: 'All medications' },
    { key: 'diabet', labelUz: 'Diabet', labelRu: 'Диабет', labelEn: 'Diabetes' },
    { key: 'gipertenziya', labelUz: 'Gipertenziya', labelRu: 'Гипертония', labelEn: 'Hypertension' },
    { key: 'aritmiya', labelUz: 'Aritmiya', labelRu: 'Аритмия', labelEn: 'Arrhythmia' },
    { key: 'semizlik', labelUz: 'Semizlik', labelRu: 'Ожирение', labelEn: 'Obesity' },
    { key: 'astma', labelUz: 'Astma', labelRu: 'Астма', labelEn: 'Asthma' },
];

// Determine drug form presentation (inhaler, injection, pill)
const getDrugFormMeta = (item) => {
    const text = `${item.name || ''} ${item.group || ''} ${item.groupUz || ''} ${item.dose || ''} ${item.notes || ''}`.toLowerCase();
    if (text.includes('insulin') || text.includes('semaglutid') || text.includes('ozempic') || text.includes('saxenda') || text.includes('victoza') || text.includes('mounjaro') || text.includes('byetta') || text.includes('inyeksiya')) {
        return {
            type: 'injection',
            badgeUz: 'Inyeksiya ruchkasi',
            badgeRu: 'Инъекционная шприц-ручка',
            badgeEn: 'Injection pen',
            icon: 'color-wand-outline',
            badgeColor: '#E91E63',
            badgeBg: 'rgba(233, 30, 99, 0.12)',
            emoji: '💉'
        };
    }
    if (text.includes('salbutamol') || text.includes('ventolin') || text.includes('beklometazon') || text.includes('ingalyator') || text.includes('aerozol')) {
        return {
            type: 'inhaler',
            badgeUz: 'Ingalyator aerozol',
            badgeRu: 'Ингаляционный аэрозоль',
            badgeEn: 'Inhaler aerosol',
            icon: 'cloud-outline',
            badgeColor: '#00BCD4',
            badgeBg: 'rgba(0, 188, 212, 0.12)',
            emoji: '💨'
        };
    }
    return {
        type: 'pill',
        badgeUz: 'Tabletka / Kapsula',
        badgeRu: 'Таблетка / Капсула',
        badgeEn: 'Pill / Capsule',
        icon: 'medical-outline',
        badgeColor: '#4CAF50',
        badgeBg: 'rgba(76, 175, 80, 0.12)',
        emoji: '💊'
    };
};

const MedicationsScreen = ({ navigation }) => {
    const { colors, isDark } = useTheme();
    const { t, i18n } = useTranslation();
    const lang = (i18n.language || 'uz').toLowerCase();
    const isEn = lang.startsWith('en');
    const isRu = lang.startsWith('ru');
    const tLang = (uz, ru, en) => isEn ? (en || uz) : (isRu ? (ru || uz) : uz);

    const translateMedSchedule = (raw) => {
        if (!raw) return '';
        if (!isEn && !isRu) return raw;
        let str = String(raw);
        if (isEn) {
            str = str
                .replace(/kuniga 1 marta|kuniga 1 mahal/gi, 'once daily')
                .replace(/kuniga 2 marta|kuniga 2 mahal/gi, 'twice daily')
                .replace(/kuniga 3 marta|kuniga 3 mahal/gi, '3 times daily')
                .replace(/haftada 1 marta/gi, 'once weekly')
                .replace(/Ertalabki birinchi ovqat bilan/gi, 'With morning meal')
                .replace(/Ertalab, ovqatdan mustaqil/gi, 'Morning, with or without food')
                .replace(/Ovqatdan 30 daqiqa oldin/gi, '30 min before meal')
                .replace(/Ovqatdan 15-30 daq oldin/gi, '15-30 min before meal')
                .replace(/Ovqatdan 60 daq oldin/gi, '60 min before meal')
                .replace(/Ovqatdan mustaqil — istalgan vaqtda/gi, 'Any time, with or without food')
                .replace(/Ovqatdan mustaqil/gi, 'With or without food')
                .replace(/yotishdan oldin/gi, 'at bedtime')
                .replace(/ertalab\+kechqurun|ertalab va kechqurun/gi, 'morning + evening')
                .replace(/ertalab/gi, 'morning')
                .replace(/kechqurun/gi, 'evening')
                .replace(/tushlik/gi, 'noon')
                .replace(/asosiy ovqatlar oldidan/gi, 'before main meals')
                .replace(/faqat ovqat yeyilganda/gi, 'only when eating meals')
                .replace(/Qisqa:/gi, 'Rapid-acting:')
                .replace(/Uzoq:/gi, 'Long-acting:');
        } else if (isRu) {
            str = str
                .replace(/kuniga 1 marta|kuniga 1 mahal/gi, '1 раз в день')
                .replace(/kuniga 2 marta|kuniga 2 mahal/gi, '2 раза в день')
                .replace(/kuniga 3 marta|kuniga 3 mahal/gi, '3 раза в день')
                .replace(/haftada 1 marta/gi, '1 раз в неделю')
                .replace(/Ertalabki birinchi ovqat bilan/gi, 'Утром с первым приемом пищи')
                .replace(/Ovqatdan 30 daqiqa oldin/gi, 'За 30 мин до еды')
                .replace(/Ovqatdan mustaqil — istalgan vaqtda/gi, 'В любое время, независимо от еды')
                .replace(/Ovqatdan mustaqil/gi, 'Независимо от еды')
                .replace(/yotishdan oldin/gi, 'перед сном')
                .replace(/ertalab/gi, 'утром')
                .replace(/kechqurun/gi, 'вечером');
        }
        return str;
    };

    const [activeTab, setActiveTab] = useState('clinical'); // 'clinical' | 'schedule'
    const [selectedDiseaseFilter, setSelectedDiseaseFilter] = useState('my_disease');
    const [searchQuery, setSearchQuery] = useState('');
    
    // User personal medications
    const [medications, setMedications] = useState([]);
    const [diseaseConfig, setDiseaseConfig] = useState(getDiseaseConfig('Umumiy'));
    const [primaryDisease, setPrimaryDisease] = useState('Diabet');
    const [takenStatus, setTakenStatus] = useState({});
    const [loading, setLoading] = useState(true);

    // Modals
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [editingMed, setEditingMed] = useState(null);
    const [selectedDetailMed, setSelectedDetailMed] = useState(null);

    // Personal Form state
    const [name, setName] = useState('');
    const [dosage, setDosage] = useState('');
    const [selectedTime, setSelectedTime] = useState('ertalab');
    const [selectedMeal, setSelectedMeal] = useState('ovqatdan_keyin');
    const [notes, setNotes] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [medsList, statusMap, storedDisease] = await Promise.all([
            getUserMedications(),
            getTodayMedicationsStatus(),
            getData('primaryDisease')
        ]);
        setMedications(medsList);
        setTakenStatus(statusMap);
        const activeDis = storedDisease || 'Diabet';
        setPrimaryDisease(activeDis);
        setDiseaseConfig(getDiseaseConfig(activeDis));
        setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Disease key mapper
    const currentDiseaseKey = useMemo(() => {
        const d = (primaryDisease || '').toLowerCase();
        if (d.includes('diabet')) return 'diabet';
        if (d.includes('gipertenziya') || d.includes('bosim')) return 'gipertenziya';
        if (d.includes('aritmiya') || d.includes('yurak')) return 'aritmiya';
        if (d.includes('semizlik') || d.includes('vazn')) return 'semizlik';
        if (d.includes('astma') || d.includes('nafas')) return 'astma';
        return 'diabet';
    }, [primaryDisease]);

    // Filter clinical medications
    const filteredClinicalMeds = useMemo(() => {
        let list = medicationsData || [];
        
        // Disease filtering
        if (selectedDiseaseFilter === 'my_disease') {
            list = list.filter(m => (m.forDisease || []).includes(currentDiseaseKey));
        } else if (selectedDiseaseFilter !== 'all') {
            list = list.filter(m => (m.forDisease || []).includes(selectedDiseaseFilter));
        }

        // Search filtering
        if (searchQuery.trim().length > 0) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(m => {
                const n = (m.name || '').toLowerCase();
                const g = (m.group || m.groupUz || m.groupRu || '').toLowerCase();
                const a = (m.action || m.actionUz || m.actionRu || '').toLowerCase();
                return n.includes(q) || g.includes(q) || a.includes(q);
            });
        }
        return list;
    }, [selectedDiseaseFilter, currentDiseaseKey, searchQuery]);

    // Quick presets based on active disease
    const quickMedsForDisease = useMemo(() => {
        if (currentDiseaseKey === 'semizlik') {
            return [
                { name: 'Saxenda (Liraglutid)', dose: '0.6-3.0 mg', time: 'ertalab', meal: 'farqi_yoq', color: '#E91E63' },
                { name: 'Ozempic (Semaglutid)', dose: '0.5 mg/haftada', time: 'ertalab', meal: 'farqi_yoq', color: '#4A9EFF' },
                { name: 'Xenical (Orlistat)', dose: '120 mg', time: 'tushlik', meal: 'ovqat_paytida', color: '#FFA726' },
                { name: 'Mounjaro (Tirzepatid)', dose: '2.5 mg/haftada', time: 'ertalab', meal: 'farqi_yoq', color: '#9C27B0' },
            ];
        }
        if (currentDiseaseKey === 'gipertenziya') {
            return [
                { name: 'Enalapril (Enap)', dose: '10 mg', time: 'ertalab', meal: 'ovqatdan_keyin', color: '#26C6DA' },
                { name: 'Amlodipin (Norvasc)', dose: '5 mg', time: 'kechqurun', meal: 'farqi_yoq', color: '#4A9EFF' },
                { name: 'Losartan (Lorista)', dose: '50 mg', time: 'ertalab', meal: 'farqi_yoq', color: '#00E676' },
                { name: 'Concor (Bisoprolol)', dose: '5 mg', time: 'ertalab', meal: 'ovqatdan_oldin', color: '#FFA726' },
            ];
        }
        if (currentDiseaseKey === 'astma') {
            return [
                { name: 'Ventolin (Salbutamol)', dose: '1-2 nafas (100 mkg)', time: 'ertalab_kechqurun', meal: 'farqi_yoq', color: '#00BCD4' },
                { name: 'Beklometazon (Clenil)', dose: '200 mkg', time: 'ertalab_kechqurun', meal: 'ovqatdan_keyin', color: '#A78BFA' },
            ];
        }
        if (currentDiseaseKey === 'aritmiya') {
            return [
                { name: 'Concor (Bisoprolol)', dose: '2.5-5 mg', time: 'ertalab', meal: 'ovqatdan_oldin', color: '#FFA726' },
                { name: 'Cordarone (Amiodaron)', dose: '200 mg', time: 'tushlik', meal: 'ovqat_paytida', color: '#FF5252' },
            ];
        }
        // Diabet
        return [
            { name: 'Metformin (Glucophage)', dose: '500-1000 mg', time: 'ertalab_kechqurun', meal: 'ovqat_paytida', color: '#4A9EFF' },
            { name: 'Glimepirid (Amaryl)', dose: '2 mg', time: 'ertalab', meal: 'ovqatdan_oldin', color: '#00E676' },
            { name: 'Jardiance (Empagliflozin)', dose: '10 mg', time: 'ertalab', meal: 'farqi_yoq', color: '#FFA726' },
            { name: 'Insulin Lantus', dose: '10-20 birlik', time: 'kechqurun', meal: 'farqi_yoq', color: '#FF5252' },
        ];
    }, [currentDiseaseKey]);

    const handleOpenAddModal = (medToEdit = null) => {
        if (medToEdit) {
            setEditingMed(medToEdit);
            setName(medToEdit.name || '');
            setDosage(medToEdit.dosage || '');
            setSelectedTime(medToEdit.timeOfDay || 'ertalab');
            setSelectedMeal(medToEdit.relationToMeal || 'ovqatdan_keyin');
            setNotes(medToEdit.notes || '');
            setSelectedColor(medToEdit.color || COLOR_OPTIONS[0]);
        } else {
            setEditingMed(null);
            setName('');
            setDosage('');
            setSelectedTime('ertalab');
            setSelectedMeal('ovqatdan_keyin');
            setNotes('');
            setSelectedColor(COLOR_OPTIONS[0]);
        }
        setAddModalVisible(true);
    };

    const handleSelectQuickMed = (quick) => {
        setName(quick.name);
        setDosage(quick.dose);
        setSelectedTime(quick.time);
        setSelectedMeal(quick.meal);
        setSelectedColor(quick.color);
    };

    // 1-Tap Add clinical medication to personal daily schedule
    const handleAddClinicalToSchedule = async (item) => {
        const formMeta = getDrugFormMeta(item);
        const medData = {
            name: item.name,
            dosage: isEn ? (item.doseEn || item.dose || '1 tablet') : (lang === 'ru' ? (item.doseRu || item.dose || '1 таблетка') : (item.doseUz || item.dose || '1 tabletka')),
            timeOfDay: 'ertalab_kechqurun',
            timeOfDayLabel: isEn ? 'Morning & Evening' : (lang === 'ru' ? 'Утро и вечер' : 'Ertalab & Kechqurun'),
            relationToMeal: 'ovqatdan_keyin',
            relationLabel: isEn ? 'After meal' : (lang === 'ru' ? 'После еды' : 'Ovqatdan keyin'),
            notes: `${formMeta.emoji} ${isEn ? (item.notesEn || item.notes || '') : (lang === 'ru' ? (item.notesRu || item.notes || '') : (item.notesUz || item.notes || ''))}`.trim(),
            color: item.color || '#00E676',
        };

        const success = await saveUserMedication(medData);
        if (success) {
            await loadData();
            Alert.alert(
                tLang('Dori jadvalga qo\'shildi', 'Лекарство добавлено', 'Medication Added'),
                isEn
                    ? `«${item.name}» has been successfully added to your daily schedule!`
                    : (lang === 'ru'
                        ? `«${item.name}» успешно внесено в ваш ежедневный график приёма!`
                        : `«${item.name}» kunlik qabul jadvalingizga muvaffaqiyatli kiritildi!`),
                [
                    { text: isEn ? 'OK' : (lang === 'ru' ? 'Понятно' : 'Tushunarli') },
                    { text: isEn ? 'Open Schedule' : (lang === 'ru' ? 'Открыть график' : 'Jadvalga o\'tish'), onPress: () => setActiveTab('schedule') }
                ]
            );
        } else {
            Alert.alert(tLang('Xatolik', 'Ошибка', 'Error'), tLang('Dori jadvalga saqlanmadi', 'Не удалось сохранить в график', 'Failed to save medication'));
        }
    };

    const handleSaveMedication = async () => {
        if (!name.trim()) {
            Alert.alert(
                lang === 'ru' ? 'Ошибка' : 'Xatolik',
                lang === 'ru' ? 'Введите название лекарства' : 'Iltimos, dori nomini kiriting'
            );
            return;
        }

        const timeObj = TIME_OPTIONS.find(t => t.key === selectedTime);
        const mealObj = MEAL_OPTIONS.find(m => m.key === selectedMeal);

        const medData = {
            ...(editingMed ? { id: editingMed.id } : {}),
            name: name.trim(),
            dosage: dosage.trim() || '1 tabletka',
            timeOfDay: selectedTime,
            timeOfDayLabel: timeObj ? (lang === 'ru' ? timeObj.labelRu : timeObj.labelUz) : selectedTime,
            relationToMeal: selectedMeal,
            relationLabel: mealObj ? (lang === 'ru' ? mealObj.labelRu : mealObj.labelUz) : selectedMeal,
            notes: notes.trim(),
            color: selectedColor,
        };

        const success = await saveUserMedication(medData);
        if (success) {
            setAddModalVisible(false);
            loadData();
        } else {
            Alert.alert('Xatolik', 'Saqlashda muammo yuz berdi');
        }
    };

    const handleDelete = (id, medName) => {
        Alert.alert(
            lang === 'ru' ? 'Удалить лекарство' : 'Dorini o\'chirish',
            lang === 'ru' ? `Вы уверены, что хотите удалить ${medName}?` : `${medName} ro'yxatdan o'chirilsinmi?`,
            [
                { text: lang === 'ru' ? 'Отмена' : 'Bekor qilish', style: 'cancel' },
                {
                    text: lang === 'ru' ? 'Удалить' : 'O\'chirish',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteUserMedication(id);
                        loadData();
                    }
                }
            ]
        );
    };

    const handleToggleTaken = async (id) => {
        const newStatus = await toggleMedicationTakenToday(id);
        setTakenStatus({ ...newStatus });
    };

    // Calculate taken statistics
    const totalCount = medications.length;
    const takenCount = medications.filter(m => takenStatus[m.id]).length;
    const progressPercent = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

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
                        {tLang("Dori-Darmonlar", "Аптека и Лекарства", "Pharmacy & Meds")}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 5 }}>
                        <Ionicons name={diseaseConfig.icon || "heart"} size={13} color={diseaseConfig.color || "#00E676"} />
                        <Text style={[styles.headerSubtitle, { color: diseaseConfig.color || colors.primary, fontWeight: '700' }]}>
                            {diseaseConfig.title}
                        </Text>
                    </View>
                </View>

                {activeTab === 'schedule' ? (
                    <TouchableOpacity
                        onPress={() => handleOpenAddModal()}
                        style={styles.addBtn}
                    >
                        <Ionicons name="add" size={22} color="#000" />
                    </TouchableOpacity>
                ) : (
                    <View style={[styles.countBadge, { backgroundColor: `${diseaseConfig.color || '#00E676'}18` }]}>
                        <Text style={[styles.countBadgeText, { color: diseaseConfig.color || '#00E676' }]}>
                            {filteredClinicalMeds.length} {lang === 'ru' ? 'преп.' : 'dori'}
                        </Text>
                    </View>
                )}
            </View>

            {/* Segmented Top Tabs */}
            <View style={[styles.tabBarWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}>
                <TouchableOpacity
                    onPress={() => setActiveTab('clinical')}
                    style={[
                        styles.tabBtn,
                        activeTab === 'clinical' && {
                            backgroundColor: colors.card,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 2
                        }
                    ]}
                >
                    <Ionicons
                        name="book-outline"
                        size={17}
                        color={activeTab === 'clinical' ? (diseaseConfig.color || '#00E676') : colors.textSecondary}
                    />
                    <Text style={[
                        styles.tabBtnText,
                        { color: activeTab === 'clinical' ? colors.text : colors.textSecondary, fontWeight: activeTab === 'clinical' ? '800' : '600' }
                    ]}>
                        {tLang("Klinik qo'llanma", "Справочник лекарств", "Clinical Guide")}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setActiveTab('schedule')}
                    style={[
                        styles.tabBtn,
                        activeTab === 'schedule' && {
                            backgroundColor: colors.card,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 2
                        }
                    ]}
                >
                    <Ionicons
                        name="alarm-outline"
                        size={17}
                        color={activeTab === 'schedule' ? (diseaseConfig.color || '#00E676') : colors.textSecondary}
                    />
                    <Text style={[
                        styles.tabBtnText,
                        { color: activeTab === 'schedule' ? colors.text : colors.textSecondary, fontWeight: activeTab === 'schedule' ? '800' : '600' }
                    ]}>
                        {tLang("Mening jadvalim", "Мой график приёма", "My Schedule")}
                    </Text>
                    {totalCount > 0 && (
                        <View style={[styles.tabCounter, { backgroundColor: diseaseConfig.color || '#00E676' }]}>
                            <Text style={styles.tabCounterText}>{totalCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* TAB 1: CLINICAL GUIDE (medications.json specialized per disease) */}
            {activeTab === 'clinical' && (
                <View style={{ flex: 1 }}>
                    {/* Search Bar */}
                    <View style={[styles.searchBox, { backgroundColor: colors.inputBg || (isDark ? '#1e2420' : '#f8fafc'), borderColor: colors.borderLight }]}>
                        <Ionicons name="search" size={18} color={diseaseConfig.color || '#00E676'} style={{ marginRight: 8 }} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder={tLang("Dori nomi yoki ta'siri bo'yicha qidirish...", "Поиск по названию или действию...", "Search by name or effect...")}
                            placeholderTextColor={colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Disease Category Filter Chips */}
                    <View style={{ height: 48, marginVertical: 6 }}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: 8, alignItems: 'center', height: 48 }}
                        >
                            {DISEASE_FILTERS.map(filter => {
                                const isSelected = selectedDiseaseFilter === filter.key;
                                return (
                                    <TouchableOpacity
                                        key={filter.key}
                                        onPress={() => setSelectedDiseaseFilter(filter.key)}
                                        activeOpacity={0.8}
                                        style={[
                                            styles.diseaseChip,
                                            {
                                                backgroundColor: isSelected
                                                    ? (diseaseConfig.color || '#00E676')
                                                    : (isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'),
                                                borderColor: isSelected ? 'transparent' : colors.borderLight
                                            }
                                        ]}
                                    >
                                        <Text style={[
                                            styles.diseaseChipText,
                                            { color: isSelected ? '#000' : colors.text, fontWeight: isSelected ? '800' : '600' }
                                        ]}>
                                            {isEn ? (filter.labelEn || filter.labelUz) : (isRu ? filter.labelRu : filter.labelUz)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* Clinical Medicines List */}
                    <FlatList
                        data={filteredClinicalMeds}
                        keyExtractor={(item) => String(item.id)}
                        contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 100, paddingTop: 6 }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="search-outline" size={56} color={colors.textSecondary} />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                    {tLang("Bunday dori topilmadi", "Лекарства не найдены", "No medications found")}
                                </Text>
                            </View>
                        }
                        renderItem={({ item }) => {
                            const formMeta = getDrugFormMeta(item);
                            const groupText = isEn && item.groupEn ? item.groupEn : (isRu && item.groupRu ? item.groupRu : (item.groupUz || item.group));
                            const actionText = isEn && item.actionEn ? item.actionEn : (isRu && item.actionRu ? item.actionRu : (item.actionUz || item.action));
                            const doseText = isEn && item.doseEn ? item.doseEn : (isRu && item.doseRu ? item.doseRu : translateMedSchedule(item.doseUz || item.dose));
                            const timeText = isEn && item.timeEn ? item.timeEn : (isRu && item.timeRu ? item.timeRu : translateMedSchedule(item.timeUz || item.time));
                            const warnText = isEn && item.warnEn ? item.warnEn : (isRu && item.warnRu ? item.warnRu : (item.warnUz || item.warn));

                            return (
                                <View style={[styles.clinicalCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                                    {/* Card Header */}
                                    <View style={styles.clinicalHeaderRow}>
                                        <View style={[styles.formBadge, { backgroundColor: formMeta.badgeBg }]}>
                                            <Ionicons name={formMeta.icon} size={13} color={formMeta.badgeColor} />
                                            <Text style={[styles.formBadgeText, { color: formMeta.badgeColor }]}>
                                                {isEn ? (formMeta.badgeEn || formMeta.badgeUz) : (isRu ? formMeta.badgeRu : formMeta.badgeUz)}
                                            </Text>
                                        </View>

                                        <View style={[styles.groupPill, { backgroundColor: `${item.color || '#4A9EFF'}15` }]}>
                                            <Text style={[styles.groupPillText, { color: item.color || '#4A9EFF' }]} numberOfLines={1}>
                                                {groupText}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Drug Name */}
                                    <Text style={[styles.clinicalMedName, { color: colors.text }]}>
                                        {item.name}
                                    </Text>

                                    {/* Mechanism of Action */}
                                    <View style={styles.clinicalRow}>
                                        <Ionicons name="bulb-outline" size={15} color="#FFA726" style={{ marginTop: 2 }} />
                                        <Text style={[styles.clinicalActionText, { color: colors.textSecondary }]}>
                                            {actionText}
                                        </Text>
                                    </View>

                                    {/* Dose & Time Pills */}
                                    <View style={styles.pillRow}>
                                        <View style={[styles.infoPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
                                            <Ionicons name="medkit-outline" size={13} color={item.color || '#00E676'} />
                                            <Text style={[styles.infoPillText, { color: colors.text }]}>
                                                {doseText}
                                            </Text>
                                        </View>

                                        <View style={[styles.infoPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
                                            <Ionicons name="time-outline" size={13} color="#4A9EFF" />
                                            <Text style={[styles.infoPillText, { color: colors.text }]}>
                                                {timeText}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Medical Warning Note */}
                                    {warnText ? (
                                        <View style={[styles.warnPillBox, { backgroundColor: isDark ? 'rgba(255, 152, 0, 0.1)' : '#FFF3E0', borderColor: isDark ? 'rgba(255, 152, 0, 0.25)' : '#FFE0B2' }]}>
                                            <Ionicons name="alert-circle-outline" size={14} color="#FF9800" />
                                            <Text style={[styles.warnPillText, { color: isDark ? '#FFB74D' : '#E65100' }]}>
                                                {warnText}
                                            </Text>
                                        </View>
                                    ) : null}

                                    {/* Actions: Batafsil & Jadvalimga qo'shish */}
                                    <View style={styles.cardActionsRow}>
                                        <TouchableOpacity
                                            onPress={() => setSelectedDetailMed(item)}
                                            style={[styles.detailActionBtn, { borderColor: colors.borderLight, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }]}
                                        >
                                            <Ionicons name="information-circle-outline" size={16} color={colors.text} />
                                            <Text style={[styles.detailActionBtnText, { color: colors.text }]}>
                                                {tLang("Batafsil", "Подробнее", "Details")}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => handleAddClinicalToSchedule(item)}
                                            style={[styles.addScheduleBtn, { backgroundColor: diseaseConfig.color || '#00E676' }]}
                                        >
                                            <Ionicons name="add-circle-outline" size={16} color="#000" />
                                            <Text style={styles.addScheduleBtnText}>
                                                {tLang("+ Jadvalga kiritish", "+ В мой график", "+ Add to schedule")}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        }}
                    />
                </View>
            )}

            {/* TAB 2: PERSONAL SCHEDULE & DAILY TRACKING */}
            {activeTab === 'schedule' && (
                <View style={{ flex: 1 }}>
                    {/* Daily Progress Card */}
                    <LinearGradient
                        colors={isDark ? ['#1e3a2b', '#102419'] : ['#E8F5E9', '#C8E6C9']}
                        style={styles.progressCard}
                    >
                        <View style={styles.progressHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="checkbox-outline" size={22} color="#00E676" />
                                <Text style={[styles.progressTitle, { color: isDark ? '#fff' : '#1B5E20' }]}>
                                    {tLang("Bugungi qabul holati", "Приём сегодня", "Today's Intake")}
                                </Text>
                            </View>
                            <Text style={[styles.progressCount, { color: '#00E676' }]}>
                                {takenCount} / {totalCount}
                            </Text>
                        </View>

                        {/* Progress bar */}
                        <View style={styles.progressBarTrack}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    { width: `${progressPercent}%`, backgroundColor: '#00E676' }
                                ]}
                            />
                        </View>

                        <Text style={[styles.progressFooter, { color: isDark ? '#A7F3D0' : '#2E7D32' }]}>
                            {progressPercent === 100
                                ? (isEn ? '🎉 Great! All medications taken today!' : (lang === 'ru' ? '🎉 Отлично! Все лекарства приняты!' : '🎉 Ajoyib! Bugungi barcha dorilar qabul qilindi!'))
                                : (isEn
                                    ? `${progressPercent}% completed. Remember to take remaining doses on time!`
                                    : (lang === 'ru'
                                        ? `Выполнено ${progressPercent}%. Не забудьте принять оставшиеся!`
                                        : `${progressPercent}% bajarildi. Qolgan dorilarni o'z vaqtida qabul qiling!`))}
                        </Text>
                    </LinearGradient>

                    {/* Medication List */}
                    <FlatList
                        data={medications}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 100 }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="medical-outline" size={64} color={colors.textSecondary} />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                    {tLang("Shaxsiy dorilar jadvali bo'sh", "Список личных лекарств пуст", "Medication schedule is empty")}
                                </Text>
                                <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13, marginTop: 4, marginBottom: 16 }}>
                                    {isEn
                                        ? 'Select medications from the «Clinical Guide» or add your own'
                                        : (lang === 'ru'
                                            ? 'Выберите препараты из вкладки «Справочник» или добавьте вручную'
                                            : '«Klinik qo\'llanma» bo\'limidan tanlang yoki o\'zingiz yangi dori kiriting')}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => handleOpenAddModal()}
                                    style={styles.emptyAddBtn}
                                >
                                    <Ionicons name="add" size={18} color="#000" />
                                    <Text style={styles.emptyAddBtnText}>
                                        {tLang("Yangi dori kiritish", "Добавить своё лекарство", "Add Medication")}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        }
                        renderItem={({ item }) => {
                            const isTaken = !!takenStatus[item.id];
                            return (
                                <View style={[styles.medCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                                    <View style={styles.medCardMain}>
                                        {/* Pill Icon */}
                                        <View style={[styles.pillIconWrap, { backgroundColor: `${item.color || '#00E676'}20` }]}>
                                            <Ionicons name="medical" size={24} color={item.color || '#00E676'} />
                                        </View>

                                        {/* Info */}
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Text style={[styles.medName, { color: colors.text, textDecorationLine: isTaken ? 'line-through' : 'none', opacity: isTaken ? 0.7 : 1 }]}>
                                                    {item.name}
                                                </Text>
                                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                                    <TouchableOpacity onPress={() => handleOpenAddModal(item)} style={styles.iconBtn}>
                                                        <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.iconBtn}>
                                                        <Ionicons name="trash-outline" size={18} color="#FF5252" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>

                                            {/* Dosage and details */}
                                            <Text style={[styles.medDose, { color: item.color || '#00E676' }]}>
                                                {item.dosage}
                                            </Text>

                                            <View style={styles.tagRow}>
                                                <View style={[styles.timeTag, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
                                                    <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                                                    <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                                                        {isEn
                                                            ? ((item.timeOfDayLabel?.includes('Ertalab & Kechqurun') || item.timeOfDay === 'ertalab_kechqurun') ? 'Morning & Evening'
                                                                : (item.timeOfDayLabel?.includes('Ertalab') || item.timeOfDay === 'ertalab') ? 'Morning'
                                                                : (item.timeOfDayLabel?.includes('Tushlik') || item.timeOfDay === 'tushlik') ? 'Afternoon'
                                                                : (item.timeOfDayLabel?.includes('Kechqurun') || item.timeOfDay === 'kechqurun') ? 'Evening'
                                                                : (item.timeOfDayLabel || item.timeOfDay))
                                                            : (lang === 'ru'
                                                                ? ((item.timeOfDayLabel?.includes('Ertalab & Kechqurun') || item.timeOfDay === 'ertalab_kechqurun') ? 'Утро и вечер'
                                                                    : (item.timeOfDayLabel?.includes('Ertalab') || item.timeOfDay === 'ertalab') ? 'Утро'
                                                                    : (item.timeOfDayLabel?.includes('Tushlik') || item.timeOfDay === 'tushlik') ? 'День'
                                                                    : (item.timeOfDayLabel?.includes('Kechqurun') || item.timeOfDay === 'kechqurun') ? 'Вечер'
                                                                    : (item.timeOfDayLabel || item.timeOfDay))
                                                                : (item.timeOfDayLabel || item.timeOfDay))}
                                                    </Text>
                                                </View>
                                                <View style={[styles.timeTag, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
                                                    <Ionicons name="restaurant-outline" size={12} color={colors.textSecondary} />
                                                    <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                                                        {isEn
                                                            ? ((item.relationLabel?.includes('Ovqatdan keyin') || item.relationToMeal === 'ovqatdan_keyin') ? 'After meal'
                                                                : (item.relationLabel?.includes('Ovqatdan oldin') || item.relationToMeal === 'ovqatdan_oldin') ? 'Before meal'
                                                                : (item.relationLabel?.includes('Ovqat paytida') || item.relationToMeal === 'ovqat_paytida') ? 'With meal'
                                                                : (item.relationLabel?.includes('Farqi yo\'q') || item.relationToMeal === 'farqi_yoq') ? 'Anytime'
                                                                : (item.relationLabel || item.relationToMeal))
                                                            : (lang === 'ru'
                                                                ? ((item.relationLabel?.includes('Ovqatdan keyin') || item.relationToMeal === 'ovqatdan_keyin') ? 'После еды'
                                                                    : (item.relationLabel?.includes('Ovqatdan oldin') || item.relationToMeal === 'ovqatdan_oldin') ? 'До еды'
                                                                    : (item.relationLabel?.includes('Ovqat paytida') || item.relationToMeal === 'ovqat_paytida') ? 'Во время еды'
                                                                    : (item.relationLabel?.includes('Farqi yo\'q') || item.relationToMeal === 'farqi_yoq') ? 'Не важно'
                                                                    : (item.relationLabel || item.relationToMeal))
                                                                : (item.relationLabel || item.relationToMeal))}
                                                    </Text>
                                                </View>
                                            </View>

                                            {item.notes ? (
                                                <Text style={[styles.medNotes, { color: colors.textSecondary }]}>
                                                    📝 {item.notes}
                                                </Text>
                                            ) : null}
                                        </View>
                                    </View>

                                    {/* Mark as Taken Button */}
                                    <TouchableOpacity
                                        onPress={() => handleToggleTaken(item.id)}
                                        style={[
                                            styles.takeActionBtn,
                                            isTaken
                                                ? { backgroundColor: '#00E67620', borderColor: '#00E676' }
                                                : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', borderColor: colors.borderLight }
                                        ]}
                                    >
                                        <Ionicons
                                            name={isTaken ? "checkmark-circle" : "ellipse-outline"}
                                            size={20}
                                            color={isTaken ? "#00E676" : colors.textSecondary}
                                        />
                                        <Text style={[
                                            styles.takeActionBtnText,
                                            { color: isTaken ? "#00E676" : colors.text, fontWeight: isTaken ? '800' : '600' }
                                        ]}>
                                            {isTaken
                                                ? (isEn ? 'Taken today' : (isRu ? 'Принято сегодня' : 'Bugun qabul qilindi'))
                                                : (isEn ? 'Mark as taken' : (isRu ? 'Отметить приём' : 'Qabul qildim deb belgilash'))}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        }}
                    />
                </View>
            )}

            {/* DETAIL CLINICAL MODAL */}
            {selectedDetailMed && (
                <Modal
                    visible={!!selectedDetailMed}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setSelectedDetailMed(null)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.detailModalSheet, { backgroundColor: isDark ? '#141a17' : '#ffffff' }]}>
                            {/* Modal Header */}
                            <View style={styles.modalHeaderRow}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text style={[styles.detailMedTitle, { color: colors.text }]}>
                                        {selectedDetailMed.name}
                                    </Text>
                                    <Text style={[styles.detailMedGroup, { color: selectedDetailMed.color || '#4A9EFF' }]}>
                                        {isEn && selectedDetailMed.groupEn ? selectedDetailMed.groupEn : (isRu && selectedDetailMed.groupRu ? selectedDetailMed.groupRu : (selectedDetailMed.groupUz || selectedDetailMed.group))}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedDetailMed(null)} style={styles.closeBtn}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                                {/* Form Pill */}
                                {(() => {
                                    const meta = getDrugFormMeta(selectedDetailMed);
                                    return (
                                        <View style={[styles.detailFormBox, { backgroundColor: meta.badgeBg }]}>
                                            <Text style={{ fontSize: 24 }}>{meta.emoji}</Text>
                                            <View style={{ marginLeft: 12 }}>
                                                <Text style={[styles.detailFormTitle, { color: meta.badgeColor }]}>
                                                    {isEn ? (meta.badgeEn || meta.badgeUz) : (isRu ? meta.badgeRu : meta.badgeUz)}
                                                </Text>
                                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                                    {tLang('Farmakologik dori shakli', 'Фармакологическая форма', 'Pharmacological form')}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })()}

                                {/* Action */}
                                <View style={styles.detailSec}>
                                    <Text style={[styles.detailSecTitle, { color: colors.text }]}>
                                        💡 {tLang("Ta'sir mexanizmi:", 'Механизм действия:', 'Mechanism of action:')}
                                    </Text>
                                    <Text style={[styles.detailSecBody, { color: colors.textSecondary }]}>
                                        {isEn && selectedDetailMed.actionEn ? selectedDetailMed.actionEn : (isRu && selectedDetailMed.actionRu ? selectedDetailMed.actionRu : (selectedDetailMed.actionUz || selectedDetailMed.action))}
                                    </Text>
                                </View>

                                {/* Dose */}
                                <View style={styles.detailSec}>
                                    <Text style={[styles.detailSecTitle, { color: colors.text }]}>
                                        💊 {tLang('Tavsiya etiladigan doza:', 'Рекомендуемая дозировка:', 'Recommended dosage:')}
                                    </Text>
                                    <Text style={[styles.detailSecBody, { color: colors.textSecondary }]}>
                                        {isEn && selectedDetailMed.doseEn ? selectedDetailMed.doseEn : (isRu && selectedDetailMed.doseRu ? selectedDetailMed.doseRu : translateMedSchedule(selectedDetailMed.doseUz || selectedDetailMed.dose))}
                                    </Text>
                                </View>

                                {/* Timing */}
                                <View style={styles.detailSec}>
                                    <Text style={[styles.detailSecTitle, { color: colors.text }]}>
                                        ⏰ {tLang('Qabul qilish vaqti va tartibi:', 'Время и способ приёма:', 'Schedule & administration:')}
                                    </Text>
                                    <Text style={[styles.detailSecBody, { color: colors.textSecondary }]}>
                                        {isEn && selectedDetailMed.timeEn ? selectedDetailMed.timeEn : (isRu && selectedDetailMed.timeRu ? selectedDetailMed.timeRu : translateMedSchedule(selectedDetailMed.timeUz || selectedDetailMed.time))}
                                    </Text>
                                </View>

                                {/* Notes */}
                                {(selectedDetailMed.notesUz || selectedDetailMed.notes || selectedDetailMed.notesEn) ? (
                                    <View style={styles.detailSec}>
                                        <Text style={[styles.detailSecTitle, { color: colors.text }]}>
                                            📋 {tLang('Klinik tavsiyalar:', 'Клинические заметки:', 'Clinical notes:')}
                                        </Text>
                                        <Text style={[styles.detailSecBody, { color: colors.textSecondary }]}>
                                            {isEn && selectedDetailMed.notesEn ? selectedDetailMed.notesEn : (isRu && selectedDetailMed.notesRu ? selectedDetailMed.notesRu : (selectedDetailMed.notesUz || selectedDetailMed.notes))}
                                        </Text>
                                    </View>
                                ) : null}

                                {/* Warning */}
                                {(selectedDetailMed.warnUz || selectedDetailMed.warn || selectedDetailMed.warnEn) ? (
                                    <View style={[styles.detailWarnBox, { backgroundColor: isDark ? 'rgba(244, 67, 54, 0.12)' : '#FFEBEE', borderColor: isDark ? 'rgba(244, 67, 54, 0.3)' : '#FFCDD2' }]}>
                                        <Ionicons name="warning" size={18} color="#F44336" style={{ marginRight: 8, marginTop: 2 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#F44336', marginBottom: 2 }}>
                                                {tLang('Maxsus ogohlantirish', 'Особые предостережения', 'Special precautions')}
                                            </Text>
                                            <Text style={{ fontSize: 13, color: isDark ? '#EF9A9A' : '#C62828', lineHeight: 18 }}>
                                                {isEn && selectedDetailMed.warnEn ? selectedDetailMed.warnEn : (isRu && selectedDetailMed.warnRu ? selectedDetailMed.warnRu : (selectedDetailMed.warnUz || selectedDetailMed.warn))}
                                            </Text>
                                        </View>
                                    </View>
                                ) : null}
                            </ScrollView>

                            {/* Add to personal schedule button inside modal */}
                            <TouchableOpacity
                                onPress={() => {
                                    const med = selectedDetailMed;
                                    setSelectedDetailMed(null);
                                    handleAddClinicalToSchedule(med);
                                }}
                                style={[styles.modalAddBtn, { backgroundColor: diseaseConfig.color || '#00E676' }]}
                            >
                                <Ionicons name="add-circle-outline" size={20} color="#00E676" />
                                <Text style={styles.modalAddBtnText}>
                                    {tLang("Kunlik qabul jadvalimga qo'shish", 'Добавить в мой график приёма', 'Add to daily schedule')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}

            {/* ADD / EDIT PERSONAL MEDICATION MODAL */}
            <Modal
                visible={addModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setAddModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalSheet, { backgroundColor: isDark ? '#141a17' : '#ffffff' }]}>
                        {/* Modal Header */}
                        <View style={styles.modalHeaderRow}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {editingMed
                                    ? (lang === 'ru' ? 'Редактировать' : 'Dorini tahrirlash')
                                    : (lang === 'ru' ? 'Новое лекарство' : 'Yangi dori qo\'shish')}
                            </Text>
                            <TouchableOpacity onPress={() => setAddModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {/* Quick Presets for current disease */}
                            {!editingMed && (
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                        {lang === 'ru' ? 'Быстрый выбор для вашего диагноза:' : `${diseaseConfig.title} uchun tayyor dorilar:`}
                                    </Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                                        {quickMedsForDisease.map((quick, idx) => (
                                            <TouchableOpacity
                                                key={idx}
                                                onPress={() => handleSelectQuickMed(quick)}
                                                style={[
                                                    styles.quickChip,
                                                    { borderColor: quick.color, backgroundColor: `${quick.color}15` }
                                                ]}
                                            >
                                                <Text style={[styles.quickChipText, { color: quick.color }]}>
                                                    {quick.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Name input */}
                            <Text style={[styles.inputLabel, { color: colors.text }]}>
                                {tLang("Dori nomi *", "Название лекарства *", "Medication name *")}
                            </Text>
                            <TextInput
                                style={[styles.textInput, { backgroundColor: colors.inputBg || (isDark ? '#222' : '#f5f5f5'), color: colors.text, borderColor: colors.borderLight }]}
                                placeholder={lang === 'ru' ? 'Например: Metformin yoki Concor' : 'Masalan: Metformin yoki Concor'}
                                placeholderTextColor={colors.textSecondary}
                                value={name}
                                onChangeText={setName}
                            />

                            {/* Dosage input */}
                            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>
                                {tLang("Dozasi / Miqdori", "Дозировка", "Dosage / Strength")}
                            </Text>
                            <TextInput
                                style={[styles.textInput, { backgroundColor: colors.inputBg || (isDark ? '#222' : '#f5f5f5'), color: colors.text, borderColor: colors.borderLight }]}
                                placeholder={lang === 'ru' ? 'Например: 500 мг yoki 1 tabletka' : 'Masalan: 500 mg yoki 1 tabletka'}
                                placeholderTextColor={colors.textSecondary}
                                value={dosage}
                                onChangeText={setDosage}
                            />

                            {/* Time of day selection */}
                            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>
                                {tLang("Qabul qilish vaqti", "Время приёма", "Intake Time")}
                            </Text>
                            <View style={styles.optionWrap}>
                                {TIME_OPTIONS.map((opt) => (
                                    <TouchableOpacity
                                        key={opt.key}
                                        onPress={() => setSelectedTime(opt.key)}
                                        style={[
                                            styles.optionChip,
                                            {
                                                backgroundColor: selectedTime === opt.key ? (diseaseConfig.color || '#00E676') : (isDark ? '#222' : '#f0f0f0'),
                                                borderColor: selectedTime === opt.key ? (diseaseConfig.color || '#00E676') : 'transparent',
                                                borderWidth: 1
                                            }
                                        ]}
                                    >
                                        <Text style={[
                                            styles.optionChipText,
                                            { color: selectedTime === opt.key ? '#000' : colors.text }
                                        ]}>
                                            {isEn ? (opt.labelEn || opt.labelUz) : (isRu ? opt.labelRu : opt.labelUz)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Meal relation selection */}
                            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>
                                {tLang("Ovqatga bog'liqligi", "Относительно еды", "Relation to meal")}
                            </Text>
                            <View style={styles.optionWrap}>
                                {MEAL_OPTIONS.map((opt) => (
                                    <TouchableOpacity
                                        key={opt.key}
                                        onPress={() => setSelectedMeal(opt.key)}
                                        style={[
                                            styles.optionChip,
                                            {
                                                backgroundColor: selectedMeal === opt.key ? (diseaseConfig.color || '#00E676') : (isDark ? '#222' : '#f0f0f0'),
                                                borderColor: selectedMeal === opt.key ? (diseaseConfig.color || '#00E676') : 'transparent',
                                                borderWidth: 1
                                            }
                                        ]}
                                    >
                                        <Text style={[
                                            styles.optionChipText,
                                            { color: selectedMeal === opt.key ? '#000' : colors.text }
                                        ]}>
                                            {isEn ? (opt.labelEn || opt.labelUz) : (isRu ? opt.labelRu : opt.labelUz)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Color Tag selection */}
                            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>
                                {tLang("Rang belgisi", "Цвет карточки", "Card Color")}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                                {COLOR_OPTIONS.map((col) => (
                                    <TouchableOpacity
                                        key={col}
                                        onPress={() => setSelectedColor(col)}
                                        style={[
                                            styles.colorCircle,
                                            { backgroundColor: col },
                                            selectedColor === col && styles.colorCircleSelected
                                        ]}
                                    />
                                ))}
                            </View>

                            {/* Notes input */}
                            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>
                                {tLang("Qo'shimcha eslatma", "Дополнительные заметки", "Additional notes")}
                            </Text>
                            <TextInput
                                style={[styles.textInput, { backgroundColor: colors.inputBg || (isDark ? '#222' : '#f5f5f5'), color: colors.text, borderColor: colors.borderLight, height: 70, textAlignVertical: 'top' }]}
                                placeholder={lang === 'ru' ? 'Например: Много пить воды' : 'Masalan: Ko\'p suv bilan ichish'}
                                placeholderTextColor={colors.textSecondary}
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                            />

                            {/* Save Button */}
                            <TouchableOpacity
                                onPress={handleSaveMedication}
                                style={[styles.saveBtn, { backgroundColor: diseaseConfig.color || '#00E676' }]}
                            >
                                <Text style={styles.saveBtnText}>
                                    {tLang("Dorini saqlash", "Сохранить лекарство", "Save Medication")}
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingTop: 10,
        paddingBottom: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    headerSubtitle: {
        fontSize: 12,
    },
    addBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#00E676',
        justifyContent: 'center',
        alignItems: 'center',
    },
    countBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    countBadgeText: {
        fontSize: 12,
        fontWeight: '800',
    },
    tabBarWrap: {
        flexDirection: 'row',
        marginHorizontal: SPACING.lg,
        borderRadius: 14,
        padding: 4,
        marginBottom: 10,
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    tabBtnText: {
        fontSize: 13,
    },
    tabCounter: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 8,
    },
    tabCounterText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#000',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: SPACING.lg,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 6,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        paddingVertical: 2,
    },
    diseaseChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    diseaseChipText: {
        fontSize: 13,
        includeFontPadding: false,
    },
    clinicalCard: {
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        marginBottom: 14,
    },
    clinicalHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    formBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 5,
    },
    formBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    groupPill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        maxWidth: 160,
    },
    groupPillText: {
        fontSize: 11,
        fontWeight: '700',
    },
    clinicalMedName: {
        fontSize: 17,
        fontWeight: '800',
        marginBottom: 6,
    },
    clinicalRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        marginBottom: 10,
    },
    clinicalActionText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
    pillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    infoPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        gap: 5,
    },
    infoPillText: {
        fontSize: 12,
        fontWeight: '600',
    },
    warnPillBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        gap: 6,
        marginBottom: 12,
    },
    warnPillText: {
        flex: 1,
        fontSize: 11,
        fontWeight: '600',
    },
    cardActionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    detailActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        gap: 5,
    },
    detailActionBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    addScheduleBtn: {
        flex: 1.3,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        gap: 5,
    },
    addScheduleBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#000',
    },
    progressCard: {
        marginHorizontal: SPACING.lg,
        borderRadius: RADIUS.lg,
        padding: 16,
        marginBottom: 16,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    progressTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    progressCount: {
        fontSize: 16,
        fontWeight: '800',
    },
    progressBarTrack: {
        height: 8,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressFooter: {
        fontSize: 12,
        fontWeight: '600',
    },
    medCard: {
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        marginBottom: 12,
    },
    medCardMain: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    pillIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    medName: {
        fontSize: 16,
        fontWeight: '700',
    },
    medDose: {
        fontSize: 13,
        fontWeight: '700',
        marginTop: 2,
    },
    iconBtn: {
        padding: 4,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 6,
    },
    timeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    tagText: {
        fontSize: 11,
        fontWeight: '600',
    },
    medNotes: {
        fontSize: 12,
        marginTop: 6,
    },
    takeActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        paddingVertical: 9,
        borderRadius: 12,
        borderWidth: 1,
    },
    takeActionBtnText: {
        fontSize: 13,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 12,
    },
    emptyAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#00E676',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 14,
        gap: 6,
    },
    emptyAddBtnText: {
        color: '#000',
        fontWeight: '800',
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    detailModalSheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 20,
        maxHeight: '85%',
    },
    modalHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    detailMedTitle: {
        fontSize: 19,
        fontWeight: '800',
    },
    detailMedGroup: {
        fontSize: 12,
        fontWeight: '700',
        marginTop: 2,
    },
    detailFormBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        marginBottom: 14,
    },
    detailFormTitle: {
        fontSize: 14,
        fontWeight: '800',
    },
    detailSec: {
        marginBottom: 12,
    },
    detailSecTitle: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 4,
    },
    detailSecBody: {
        fontSize: 13,
        lineHeight: 19,
    },
    detailWarnBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        marginTop: 4,
        marginBottom: 16,
    },
    modalAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        gap: 8,
        marginTop: 10,
    },
    modalAddBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#000',
    },
    modalSheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 20,
        maxHeight: '90%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    closeBtn: {
        padding: 4,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
    },
    textInput: {
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        fontSize: 15,
    },
    quickChip: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
    },
    quickChipText: {
        fontSize: 12,
        fontWeight: '700',
    },
    optionWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 6,
    },
    optionChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    optionChipText: {
        fontSize: 12,
        fontWeight: '700',
    },
    colorCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    colorCircleSelected: {
        borderWidth: 3,
        borderColor: '#fff',
    },
    saveBtn: {
        borderRadius: 16,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 20,
    },
    saveBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '800',
    },
});

export default MedicationsScreen;