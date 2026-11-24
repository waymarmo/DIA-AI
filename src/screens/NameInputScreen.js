import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { saveData, getData } from '../utils/storage';
import { useTranslation } from 'react-i18next';

const NameInputScreen = ({ navigation }) => {
    const { colors, isDark } = useTheme();
    const { t, i18n } = useTranslation();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [error, setError] = useState('');
    const [firstNameFocused, setFirstNameFocused] = useState(false);
    const [lastNameFocused, setLastNameFocused] = useState(false);
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(50));
    const lastNameRef = useRef(null);

    const isEn = i18n.language === 'en';
    const isRu = i18n.language === 'ru';
    const GREEN = colors.primary || '#00E676';

    // Ism maydoni doim toza boshlanadi (foydalanuvchi xohlagan ismni kiritishi uchun)
    useEffect(() => {
        setFirstName('');
        setLastName('');
    }, []);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleContinue = async () => {
        if (!firstName.trim()) {
            setError(isEn ? 'Please enter your first name' : (isRu ? 'Пожалуйста, введите ваше имя' : 'Iltimos, ismingizni kiriting'));
            return;
        }
        try {
            await saveData('firstName', firstName.trim());
            await saveData('lastName', lastName.trim());
            await saveData('saved_first_name', firstName.trim());
            await saveData('saved_last_name', lastName.trim());
            await saveData('fullName', `${firstName.trim()} ${lastName.trim()}`.trim());
            navigation.navigate('GenderSelection');
        } catch (err) {
            setError(isEn ? 'An error occurred' : (isRu ? 'Произошла ошибка' : 'Xatolik yuz berdi'));
        }
    };

    return (
        <LinearGradient
            colors={isDark ? [colors.background, '#0d2518'] : ['#f0fdf4', '#dcfce7']}
            style={styles.container}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.stepText, { color: GREEN }]}>
                            {isEn ? 'Step 4 of 8' : (isRu ? 'Шаг 4 из 8' : 'Qadam 4/8')}
                        </Text>
                    </View>

                    <Animated.View
                        style={[
                            styles.content,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        {/* Icon */}
                        <View style={[styles.iconContainer, { backgroundColor: `${GREEN}20` }]}>
                            <Ionicons name="person-outline" size={48} color={GREEN} />
                        </View>

                        <Text style={[styles.title, { color: colors.text }]}>
                            {isEn ? 'What is your name?' : (isRu ? 'Как вас зовут?' : 'Ismingiz nima?')}
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            {isEn
                                ? 'We will use your name to personalize your health assistant.'
                                : (isRu
                                    ? 'Мы будем лучше обращаться к вам по имени.'
                                    : 'Sizga yaxshiroq murojaat qilishimiz uchun.')}
                        </Text>

                        {/* First Name Input */}
                        <View style={styles.inputWrapper}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                {isEn ? 'First name *' : (isRu ? 'Имя *' : 'Ism *')}
                            </Text>
                            <View style={[
                                styles.inputContainer,
                                {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                                    borderColor: error && !firstName.trim()
                                        ? COLORS.error
                                        : firstNameFocused
                                            ? GREEN
                                            : isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
                                }
                            ]}>
                                <Ionicons
                                    name="person"
                                    size={18}
                                    color={firstNameFocused ? GREEN : colors.textSecondary}
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder={isEn ? 'Enter first name' : (isRu ? 'Введите имя' : 'Ismingizni kiriting')}
                                    placeholderTextColor={colors.textSecondary}
                                    value={firstName}
                                    onChangeText={(text) => { setFirstName(text); setError(''); }}
                                    autoCapitalize="words"
                                    autoCorrect={false}
                                    autoComplete="name-given"
                                    textContentType="givenName"
                                    importantForAutofill="yes"
                                    returnKeyType="next"
                                    onSubmitEditing={() => lastNameRef.current?.focus()}
                                    onFocus={() => setFirstNameFocused(true)}
                                    onBlur={() => setFirstNameFocused(false)}
                                    selectionColor={GREEN}
                                />
                            </View>
                        </View>

                        {/* Last Name Input */}
                        <View style={styles.inputWrapper}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                {isEn ? 'Last name (optional)' : (isRu ? 'Фамилия (необязательно)' : 'Familiya (ixtiyoriy)')}
                            </Text>
                            <View style={[
                                styles.inputContainer,
                                {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                                    borderColor: lastNameFocused
                                        ? GREEN
                                        : isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
                                }
                            ]}>
                                <Ionicons
                                    name="person"
                                    size={18}
                                    color={lastNameFocused ? GREEN : colors.textSecondary}
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    ref={lastNameRef}
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder={isEn ? 'Enter last name' : (isRu ? 'Введите фамилию' : 'Familiyangizni kiriting')}
                                    placeholderTextColor={colors.textSecondary}
                                    value={lastName}
                                    onChangeText={setLastName}
                                    autoCapitalize="words"
                                    autoCorrect={false}
                                    autoComplete="name-family"
                                    textContentType="familyName"
                                    importantForAutofill="yes"
                                    returnKeyType="done"
                                    onSubmitEditing={handleContinue}
                                    onFocus={() => setLastNameFocused(true)}
                                    onBlur={() => setLastNameFocused(false)}
                                    selectionColor={GREEN}
                                />
                            </View>
                        </View>

                        {error ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        <TouchableOpacity
                            style={[
                                styles.button,
                                {
                                    backgroundColor: firstName.trim() ? GREEN : (isDark ? '#2a2a2a' : '#e0e0e0'),
                                }
                            ]}
                            onPress={handleContinue}
                            activeOpacity={0.8}
                        >
                            <Text style={[
                                styles.buttonText,
                                { color: firstName.trim() ? '#000' : colors.textSecondary }
                            ]}>
                                {isEn ? 'Continue' : (isRu ? 'Далее' : 'Davom etish')}
                            </Text>
                            <Ionicons
                                name="arrow-forward"
                                size={20}
                                color={firstName.trim() ? '#000' : colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 50 },
    header: {
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    stepText: {
        fontSize: FONTS.sm,
        fontWeight: '700',
        marginBottom: SPACING.sm,
        letterSpacing: 0.5,
    },
    progressBar: { height: 5, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    content: {
        flex: 1,
        paddingHorizontal: SPACING.lg,
        alignItems: 'center',
        paddingBottom: 100, // Keyboard ochilganda button ko'rinishi uchun qo'shimcha joy
    },
    iconContainer: {
        width: 90,
        height: 90,
        borderRadius: RADIUS.round,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xl,
        marginTop: SPACING.lg,
    },
    title: {
        fontSize: 30,
        fontWeight: '800',
        marginBottom: SPACING.sm,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: FONTS.md,
        textAlign: 'center',
        marginBottom: SPACING.xxl,
        lineHeight: 22,
    },
    inputWrapper: {
        width: '100%',
        marginBottom: SPACING.lg,
    },
    inputLabel: {
        fontSize: FONTS.sm,
        fontWeight: '600',
        marginBottom: SPACING.xs,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: RADIUS.md,
        borderWidth: 1.5,
        paddingHorizontal: SPACING.md,
        height: 56,
    },
    inputIcon: { marginRight: SPACING.sm },
    input: {
        flex: 1,
        fontSize: FONTS.lg,
        fontWeight: '500',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: SPACING.md,
        alignSelf: 'flex-start',
    },
    errorText: {
        color: COLORS.error,
        fontSize: FONTS.sm,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: SPACING.md,
        borderRadius: 30,
        marginTop: SPACING.md,
        width: '100%',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    buttonText: {
        fontSize: FONTS.lg,
        fontWeight: '700',
    },
});

export default NameInputScreen;
