import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    StatusBar,
    Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import DiaAIService from '../services/DiaAIService';
import YandexAgentService from '../services/YandexAgentService';
import SpeechKitService from '../services/SpeechKitService';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { saveCustomRecipe, getData, setData } from '../utils/storage';
import FastAPIService from '../services/FastAPIService'; // YANGI FastAPI XIZMATI
import icd10Database from '../data/icd10_database.json';

const USE_FASTAPI = false; // Render backend suspended bo'lgani uchun to'g'ridan-to'g'ri DiaAIService (Gemini) orqali ishlaydi

const ChatScreen = () => {
    const { colors, isDark } = useTheme();
    const { t, i18n } = useTranslation();
    const normLang = (i18n?.language || 'uz').toLowerCase();
    const isEn = normLang.startsWith('en');
    const isRu = normLang.startsWith('ru');
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const flatListRef = useRef(null);
    const inputRef = useRef(null);

    const GREEN = '#00E676';

    const startRecording = async () => {
        if (recording || isRecording) {
            return; // Prevent multiple recording objects
        }
        try {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            
            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(newRecording);
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording', err);
            setRecording(null);
            setIsRecording(false);
        }
    };

    const stopRecording = async () => {
        if (!recording) return;
        setIsRecording(false);
        const currentRecording = recording;
        setRecording(null); // Clear immediately to free up the slot for a new recording
        
        try {
            await currentRecording.stopAndUnloadAsync();
            const uri = currentRecording.getURI();
            
            if (uri) {
                // Using string 'base64' prevents undefined TypeError if EncodingType is missing in older SDKs
                const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
                const mimeType = Platform.OS === 'ios' ? 'audio/x-caf' : 'audio/mp4';
                handleSend('', { base64, mimeType });
            } else {
                Alert.alert(
                    i18n.language === 'en' ? 'Voice Input' : (i18n.language === 'ru' ? 'Голосовой ввод' : 'Ovozli kiritish'),
                    i18n.language === 'en'
                        ? 'Microphone recording is limited in Expo Go. Please type your question, and Dia AI will assist you!'
                        : (i18n.language === 'ru'
                            ? 'В режиме Expo Go микрофон ограничен. Пожалуйста, напишите вопрос текстом, и Dia AI озвучит вам ответ!'
                            : 'Expo Go rejimida mikrofon orqali yozib olish cheklangan. Iltimos, savolingizni matn orqali yozing — Dia AI sizga ovozli javob qaytaradi!')
                );
            }
        } catch (error) {
            console.error('Failed to stop recording', error);
        }
    };

    // Initial Welcome Message
    useEffect(() => {
        const welcomeText = i18n.language === 'en'
            ? '👋 Hello! I am your Dia AI health assistant. How can I help you today?'
            : (i18n.language === 'ru' 
                ? '👋 Здравствуйте! Я ваш ИИ-помощник Dia AI. Чем я могу помочь?' 
                : '👋 Salom! Men Dia AI yordamchingizman. Qanday yordam bera olaman?');

        const initChat = async () => {
            if (USE_FASTAPI) {
                setLoading(true);
                try {
                    const userContext = {
                        disease: await getData('primaryDisease') || 'Kiritilmagan',
                        age: await getData('age') || 'Kiritilmagan',
                        weight: await getData('weight') || 'Kiritilmagan',
                        height: await getData('height') || 'Kiritilmagan',
                        activityLevel: await getData('activityLevel') || 'Kiritilmagan',
                        gender: await getData('gender') || 'Kiritilmagan',
                        name: await getData('firstName') || t('dashboard.user') || 'Foydalanuvchi',
                        appLanguage: i18n.language || 'uz'
                    };
                    const response = await FastAPIService.sendTextAndGetResponse('', 'default-user', 'session-1', userContext);
                    let displayText = response;
                    if (displayText) {
                        displayText = displayText.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
                    }
                    setMessages([{
                        _id: Math.round(Math.random() * 1000000),
                        text: displayText || welcomeText,
                        createdAt: new Date(),
                        user: { _id: 2, name: 'Dia AI', avatar: 'https://cdn-icons-png.flaticon.com/512/8943/8943377.png' },
                    }]);
                } catch (e) {
                    setMessages([{
                        _id: 1, text: welcomeText, createdAt: new Date(), user: { _id: 2, name: 'Dia AI', avatar: 'https://cdn-icons-png.flaticon.com/512/8943/8943377.png' },
                    }]);
                } finally {
                    setLoading(false);
                }
            } else {
                setMessages([
                    {
                        _id: 1,
                        text: welcomeText,
                        createdAt: new Date(),
                        user: { _id: 2, name: 'Dia AI', avatar: 'https://cdn-icons-png.flaticon.com/512/8943/8943377.png' },
                    },
                ]);
            }
        };

        initChat();
    }, [i18n.language]);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 80);
    }, []);

    const handleSend = async (text = inputText, audioData = null) => {
        if (!text.trim() && !audioData) return;

        const userContext = {
            disease: await getData('primaryDisease') || 'Kiritilmagan',
            age: await getData('age') || 'Kiritilmagan',
            weight: await getData('weight') || 'Kiritilmagan',
            height: await getData('height') || 'Kiritilmagan',
            activityLevel: await getData('activityLevel') || 'Kiritilmagan',
            gender: await getData('gender') || 'Kiritilmagan',
            name: await getData('firstName') || 'Foydalanuvchi',
            appLanguage: i18n.language || 'uz',
        };

        const userMessage = {
            _id: Math.round(Math.random() * 1000000),
            text: audioData ? (i18n.language === 'en' ? '🎤 Voice message' : (i18n.language === 'ru' ? '🎤 Голосовое сообщение' : '🎤 Ovozli xabar')) : text,
            createdAt: new Date(),
            user: { _id: 1, name: t('dashboard.user') || 'Siz' },
        };

        setMessages((prev) => {
            const next = [...prev, userMessage];
            setData('chat_history', next.slice(-20)).catch(() => {});
            return next;
        });
        if (!audioData) setInputText('');
        setLoading(true);
        scrollToBottom();

        try {
            let response;
            let audioFileUriToPlay = null;

            if (USE_FASTAPI) {
                // FastAPI orqali urinib ko'rish, agar server ishlamasa Gemini (DiaAIService) ga o'tish
                try {
                    if (audioData) {
                        const result = await FastAPIService.sendVoiceAndGetResponse(recording?.getURI() || '', 'default-user', 'session-1', userContext); 
                        response = result?.reply;
                        audioFileUriToPlay = result?.audioUri;
                    } else {
                        response = await FastAPIService.sendTextAndGetResponse(text, 'default-user', 'session-1', userContext);
                    }
                } catch (fastApiErr) {
                    console.warn('[ChatScreen] FastAPI backend offline, Gemini AI (DiaAIService) ga o\'tildi:', fastApiErr?.message);
                    if (audioData) {
                        response = await DiaAIService.generateResponse('', null, i18n.language, { audioBase64: audioData.base64, audioMimeType: audioData.mimeType, disease: userContext.disease });
                    } else {
                        response = await DiaAIService.generateResponse(text, null, i18n.language, { disease: userContext.disease });
                    }
                }
            } else {
                if (audioData) {
                    response = await DiaAIService.generateResponse('', null, i18n.language, { audioBase64: audioData.base64, audioMimeType: audioData.mimeType, disease: userContext.disease });
                } else {
                    response = await DiaAIService.generateResponse(text, null, i18n.language, { disease: userContext.disease });
                }
            }

            let displayText = response;

            // JSON action parsing
            const extractJSON = (txt) => {
                if (!txt) return null;
                try { return JSON.parse(txt.trim()); } catch (e) {
                    try {
                        const match = txt.match(/\{[\s\S]*\}/);
                        if (match) return JSON.parse(match[0]);
                    } catch (e2) {
                        const possible = txt.trim();
                        if (possible.startsWith('{') && !possible.endsWith('}')) {
                            try { return JSON.parse(possible + '}'); } catch { return null; }
                        }
                        return null;
                    }
                }
                return null;
            };

            let navigatorPayload = null;

            try {
                const actionData = extractJSON(response);
                if (actionData) {
                    if (actionData.action === 'navigate' && actionData.target) {
                        const screenMap = {
                            'Dashboard': 'Dashboard', 'Reports': 'Reports',
                            'Recipes': 'Recipes', 'FoodScanner': 'Skaner',
                            'Settings': 'Profil', 'Profil': 'Profil',
                            'Hisobot': 'Hisobotlar', 'Retseptlar': 'Retseptlar',
                            'Skaner': 'Skaner', 'Asosiy': 'Asosiy',
                            'Medications': 'Medications', 'Dorilar': 'Medications',
                            'Exercises': 'Exercises', 'Mashqlar': 'Exercises',
                            'JismoniyMashqlar': 'Exercises'
                        };
                        const route = screenMap[actionData.target] || actionData.target;
                        if (route) navigation.navigate(route);
                        displayText = t('chat.navigatingTo', { target: actionData.target });
                    }
                    if (actionData.action === 'save_recipe' && actionData.recipe) {
                        const success = await saveCustomRecipe(actionData.recipe);
                        displayText = success
                            ? t('chat.recipeSaved', { title: actionData.recipe.title })
                            : t('chat.saveError');
                    }
                    if (actionData.action === 'medical_navigator' && actionData.icd_code) {
                        const foundDisease = icd10Database.find(d => actionData.icd_code.includes(d.icd_code));
                        if (foundDisease) {
                            navigatorPayload = foundDisease;
                        }
                    }
                    const cleaned = response.replace(/\{[\s\S]*\}/, '').trim();
                    if (cleaned) displayText = cleaned;
                    else if (!displayText) displayText = t('chat.defaultDone');
                }
            } catch (e) {
                console.error("Action parsing error:", e);
            }

            // Markdown havolalarni tozalash: [Mayo Clinic](https://...) -> Mayo Clinic
            if (displayText) {
                displayText = displayText.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
            }

            const aiMessage = {
                _id: Math.round(Math.random() * 1000000),
                text: displayText || response || "Kechirasiz, xatolik yuz berdi.",
                createdAt: new Date(),
                user: { _id: 2, name: 'Dia AI', avatar: 'https://cdn-icons-png.flaticon.com/512/8943/8943377.png' },
                navigatorData: navigatorPayload,
                audioUri: audioFileUriToPlay
            };

            setMessages((prev) => {
                const next = [...prev, aiMessage];
                setData('chat_history', next.slice(-20)).catch(() => {});
                return next;
            });
            setLoading(false);
            scrollToBottom();

            // Speech (Ovozli javob)
            if (isVoiceMode) {
                if (USE_FASTAPI && audioFileUriToPlay) {
                    // Agar FastAPI'dan MP3 file kelsa
                    try {
                        const { sound } = await Audio.Sound.createAsync({ uri: audioFileUriToPlay });
                        await sound.playAsync();
                    } catch (err) {
                        console.error('Error playing FastAPI sound:', err);
                    }
                } else if (response && typeof response === 'string') {
                    // Yandex tts fallback
                    const strippedText = displayText.replace(/\*\*/g, '').replace(/\[.*\]\(.*\)/g, '').replace(/\{.*\}/s, '');
                    await SpeechKitService.speak(strippedText, i18n.language);
                }
            }
        } catch (error) {
            console.error(error);
            setMessages((prev) => [...prev, {
                _id: Math.round(Math.random() * 1000000),
                text: t('chat.errorGeneric') || 'Xato yuz berdi.',
                createdAt: new Date(),
                user: { _id: 2, name: 'Dia AI' },
            }]);
        } finally {
            setLoading(false);
            scrollToBottom();
        }
    };

    const renderItem = ({ item }) => {
        const isUser = item.user._id === 1;
        return (
            <View style={{ marginBottom: 8 }}>
                <View style={[
                    styles.messageContainer,
                    isUser ? styles.userMessage : styles.aiMessage,
                    { backgroundColor: isUser ? GREEN : (isDark ? '#2a2a2a' : '#EBEBEB') }
                ]}>
                    {!isUser && (
                        <View style={styles.botIcon}>
                            <FontAwesome5 name="robot" size={14} color={GREEN} />
                        </View>
                    )}
                    <View style={styles.messageTextContainer}>
                        <Text style={[styles.messageText, { color: isUser ? '#000' : colors.text }]}>
                            {item.text}
                        </Text>
                        <Text style={[styles.timeText, { color: isUser ? '#00000060' : colors.textSecondary }]}>
                            {item.createdAt instanceof Date
                                ? `${String(item.createdAt.getHours()).padStart(2,'0')}:${String(item.createdAt.getMinutes()).padStart(2,'0')}`
                                : ''}
                        </Text>
                    </View>
                </View>

                {item.navigatorData && (
                    <View style={styles.navigatorCard}>
                        <View style={styles.navHeader}>
                            <Ionicons name="medkit" size={20} color={GREEN} />
                            <Text style={styles.navTitle}>
                                {isEn ? (item.navigatorData.name_en || item.navigatorData.name_uz) : (isRu ? item.navigatorData.name_ru : item.navigatorData.name_uz)}
                            </Text>
                        </View>
                        <Text style={styles.navCode}>ICD-10: {item.navigatorData.icd_code}</Text>

                        <Text style={styles.navSectionTitle}>{isEn ? 'Specialists' : (isRu ? 'Специалисты' : 'Mutaxassislar')}</Text>
                        {item.navigatorData.specialists.map((spec, index) => (
                            <View key={index} style={styles.navSpecialistLine}>
                                <Text style={styles.navSpecBadge}>{index + 1}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.navSpecName}>{isEn ? (spec.specialty_en || spec.specialty_uz) : (isRu ? spec.specialty_ru : spec.specialty_uz)}</Text>
                                    <Text style={styles.navSpecReason}>{isEn ? (spec.reason_en || spec.reason_uz) : (isRu ? spec.reason_ru : spec.reason_uz)}</Text>
                                </View>
                            </View>
                        ))}

                        <Text style={styles.navSectionTitle}>{isEn ? 'Next Steps' : (isRu ? 'Дальнейшие шаги' : 'Qadamlar')}</Text>
                        <View style={styles.navTimeline}>
                            {item.navigatorData.next_steps.map((step, index) => (
                                <View key={index} style={styles.navStep}>
                                    <View style={styles.navStepIndicator}>
                                        <View style={[styles.navStepDot, { backgroundColor: step.urgency === 'critical' ? '#FF5252' : step.urgency === 'high' ? '#FFA000' : GREEN }]} />
                                        {index < item.navigatorData.next_steps.length - 1 && <View style={styles.navStepLine} />}
                                    </View>
                                    <View style={styles.navStepContent}>
                                        <Text style={styles.navStepTitle}>{isEn ? (step.title_en || step.title_uz) : (isRu ? step.title_ru : step.title_uz)}</Text>
                                        <Text style={styles.navStepDesc}>{isEn ? (step.description_en || step.description_uz) : (isRu ? step.description_ru : step.description_uz)}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                        
                        <View style={styles.navDisclaimer}>
                            <Ionicons name="warning" size={16} color="#FF9800" />
                            <Text style={styles.navDisclaimerText}>
                                {isEn
                                    ? 'NOTE: For educational & informational guidance only. Please consult your physician.'
                                    : (isRu
                                        ? 'ВНИМАНИЕ: Носит исключительно информационный характер. Проконсультируйтесь с врачом.'
                                        : 'DIQQAT: Bu tashxis axborot uchun! Shifokor bilan maslahatlashing.')}
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    // Use fixed padding, KeyboardAvoidingView will handle the rest
    const bottomPadding = 80;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.borderLight || colors.border, backgroundColor: colors.background }]}>
                <View style={styles.headerLeft}>
                    <View style={[styles.aiAvatar, { backgroundColor: `${GREEN}20` }]}>
                        <FontAwesome5 name="robot" size={16} color={GREEN} />
                    </View>
                    <View>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>
                            {isEn ? 'Dia AI Health Assistant' : (isRu ? 'ИИ Помощник' : 'Dia AI Yordamchi')}
                        </Text>
                        <View style={styles.onlineRow}>
                            <View style={styles.onlineDot} />
                            <Text style={[styles.onlineTxt, { color: colors.textSecondary }]}>Online</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity onPress={() => setIsVoiceMode(!isVoiceMode)} style={{ padding: 8 }}>
                    <Ionicons name={isVoiceMode ? "volume-high" : "volume-mute"} size={24} color={isVoiceMode ? GREEN : colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={(item) => item._id.toString()}
                contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
                onContentSizeChange={scrollToBottom}
                onLayout={scrollToBottom}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
            />

            {/* Loading indicator */}
            {loading && (
                <View style={[styles.typingBox, {
                    backgroundColor: isDark ? '#2a2a2a' : '#EBEBEB',
                }]}>
                    <View style={styles.botIcon}>
                        <FontAwesome5 name="robot" size={12} color={GREEN} />
                    </View>
                    <ActivityIndicator size="small" color={GREEN} style={{ marginLeft: 6 }} />
                    <Text style={[styles.typingTxt, { color: colors.textSecondary }]}>
                        {isEn ? 'Typing...' : (isRu ? 'Печатает...' : 'Yozmoqda...')}
                    </Text>
                </View>
            )}

            {/* Input Bar */}
            <View style={[
                styles.inputContainer,
                {
                    borderTopColor: colors.borderLight || colors.border,
                    backgroundColor: colors.card || colors.background,
                    paddingBottom: Platform.OS === 'ios' ? insets.bottom + 4 : 8,
                }
            ]}>
                    <TextInput
                        ref={inputRef}
                        style={[styles.input, {
                            color: colors.text,
                            backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0',
                            borderColor: isDark ? '#444' : '#e0e0e0',
                        }]}
                        placeholder={isEn ? 'Type a message...' : (isRu ? 'Напишите сообщение...' : 'Xabaringizni yozing...')}
                        placeholderTextColor={colors.textSecondary}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxHeight={100}
                        returnKeyType="send"
                        blurOnSubmit={false}
                        onSubmitEditing={() => { if (inputText.trim()) handleSend(); }}
                        onFocus={scrollToBottom}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, { backgroundColor: isRecording ? '#FF5252' : (isDark ? '#333' : '#ccc'), marginRight: 4 }]}
                        onPressIn={startRecording}
                        onPressOut={stopRecording}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="mic" size={20} color={isRecording ? '#FFF' : (isDark ? '#aaa' : '#666')} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.sendButton, {
                            backgroundColor: inputText.trim() && !loading ? GREEN : (isDark ? '#333' : '#ccc'),
                        }]}
                        onPress={() => handleSend(inputText)}
                        disabled={loading || (!inputText.trim() && !isRecording)}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color={isDark ? '#fff' : '#666'} size="small" />
                        ) : (
                            <Ionicons name="send" size={18} color={inputText.trim() ? '#000' : (isDark ? '#666' : '#999')} />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },

    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    aiAvatar: {
        width: 38, height: 38, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 16, fontWeight: '700' },
    onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
    onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00E676' },
    onlineTxt: { fontSize: 11 },

    listContent: { paddingHorizontal: 14, paddingTop: 14 },

    messageContainer: {
        maxWidth: '82%',
        padding: 10,
        borderRadius: 16,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    userMessage: {
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    aiMessage: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    botIcon: { marginRight: 6, marginBottom: 2 },
    messageTextContainer: { flex: 1 },
    messageText: { fontSize: 15, lineHeight: 21 },
    timeText: { fontSize: 10, marginTop: 3, alignSelf: 'flex-end' },

    navigatorCard: {
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
        marginLeft: 14,
        marginRight: 40,
        borderRadius: 16,
        padding: 15,
        marginTop: 4,
        borderLeftWidth: 4,
        borderLeftColor: '#00E676',
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 1
    },
    navHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
    navTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginLeft: 8, flex: 1 },
    navCode: { fontSize: 12, color: '#888', marginLeft: 28, marginBottom: 10 },
    navSectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8, marginTop: 5 },
    navSpecialistLine: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-start' },
    navSpecBadge: { backgroundColor: '#E8F5E9', color: '#00E676', width: 20, height: 20, borderRadius: 10, textAlign: 'center', lineHeight: 20, fontSize: 12, fontWeight: 'bold', marginRight: 8, overflow: 'hidden' },
    navSpecName: { fontSize: 14, fontWeight: '600', color: '#333' },
    navSpecReason: { fontSize: 12, color: '#666' },
    navTimeline: { marginLeft: 6, marginTop: 5 },
    navStep: { flexDirection: 'row', marginBottom: 12 },
    navStepIndicator: { alignItems: 'center', marginRight: 12 },
    navStepDot: { width: 10, height: 10, borderRadius: 5, zIndex: 1 },
    navStepLine: { width: 2, backgroundColor: '#E5E7EB', flex: 1, position: 'absolute', top: 10, bottom: -12 },
    navStepContent: { flex: 1, paddingBottom: 5 },
    navStepTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 2 },
    navStepDesc: { fontSize: 12, color: '#666' },
    navDisclaimer: { flexDirection: 'row', backgroundColor: '#FFF3E0', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    navDisclaimerText: { flex: 1, fontSize: 11, color: '#E65100', marginLeft: 8, fontWeight: '500' },

    typingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        gap: 4,
        alignSelf: 'flex-start',
        marginLeft: 14,
        marginBottom: 8,
    },
    typingTxt: { fontSize: 12, fontStyle: 'italic' },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingTop: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 8,
    },
    input: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        borderWidth: 1,
        minHeight: 44,
    },
    sendButton: {
        width: 44, height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 0,
    },
});

export default ChatScreen;
