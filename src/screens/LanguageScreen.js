import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import CustomButton from '../components/CustomButton';
import { saveLanguage, getLanguage } from '../utils/storage';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const LanguageScreen = ({ navigation }) => {
    const { colors, isDark } = useTheme();
    const { t, i18n } = useTranslation();
    const [selectedLanguage, setSelectedLanguage] = useState('uz');
    const GREEN = colors.primary || '#00E676';

    const languages = [
        { code: 'uz', name: 'O\'zbekcha', flag: '🇺🇿' },
        { code: 'ru', name: 'Русский', flag: '🇷🇺' },
        { code: 'en', name: 'English', flag: '🇬🇧' },
    ];

    useEffect(() => {
        getLanguage().then((lang) => {
            if (lang && lang !== 'uz') setSelectedLanguage(lang);
        });
    }, []);

    const isEn = i18n.language === 'en';
    const isRu = i18n.language === 'ru';

    const handleContinue = async () => {
        await i18n.changeLanguage(selectedLanguage);
        await saveLanguage(selectedLanguage);
        navigation.navigate('Advantages');
    };

    return (
        <LinearGradient
            colors={isDark ? [colors.background, '#0d2518'] : ['#f0fdf4', '#dcfce7']}
            style={styles.container}
        >
            <View style={styles.header}>
                <Text style={[styles.stepText, { color: GREEN }]}>
                    {isEn ? 'Step 1 of 8' : (isRu ? 'Шаг 1 из 8' : 'Qadam 1/8')}
                </Text>
            </View>

            <View style={styles.content}>
                <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
                    <Ionicons name="language" size={64} color={colors.primary} />
                </View>

                <Text style={[styles.title, { color: colors.text }]}>{t('language.title')}</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('language.subtitle')}</Text>

                <View style={styles.languagesContainer}>
                    {languages.map((language) => (
                        <TouchableOpacity
                            key={language.code}
                            style={[
                                styles.languageButton,
                                { backgroundColor: colors.card, borderColor: 'transparent' },
                                selectedLanguage === language.code && { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
                            ]}
                            onPress={() => {
                                setSelectedLanguage(language.code);
                                i18n.changeLanguage(language.code);
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.flag}>{language.flag}</Text>
                            <Text
                                style={[
                                    styles.languageText,
                                    { color: colors.text },
                                    selectedLanguage === language.code && { color: colors.primary, fontWeight: '700' },
                                ]}
                            >
                                {language.name}
                            </Text>
                            {selectedLanguage === language.code && (
                                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.footer}>
                <CustomButton title={t('common.continue')} onPress={handleContinue} />
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
    },
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
    progressBar: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: SPACING.lg },
    progressFill: { height: '100%', borderRadius: 3 },
    content: {
        flex: 1,
        paddingHorizontal: SPACING.lg,
        alignItems: 'center',
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: RADIUS.round,
        backgroundColor: 'rgba(0, 217, 163, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xl,
        marginTop: SPACING.xxl,
    },
    title: {
        color: COLORS.white,
        fontSize: FONTS.hero,
        fontWeight: '700',
        marginBottom: SPACING.sm,
    },
    subtitle: {
        color: COLORS.textSecondary,
        fontSize: FONTS.md,
        textAlign: 'center',
        marginBottom: SPACING.xxl,
    },
    languagesContainer: {
        width: '100%',
        gap: SPACING.md,
    },
    languageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.lg,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.bgCard,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    languageButtonActive: {
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(0, 217, 163, 0.1)',
    },
    flag: {
        fontSize: 32,
        marginRight: SPACING.md,
    },
    languageText: {
        flex: 1,
        color: COLORS.white,
        fontSize: FONTS.xl,
        fontWeight: '500',
    },
    languageTextActive: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    footer: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.xl,
    },
});

export default LanguageScreen;
