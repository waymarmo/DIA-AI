import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Animated, Easing, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { saveData } from '../utils/storage';

const HeightInputScreen = ({ navigation }) => {
    const { colors } = useTheme();
    const [height, setHeight] = useState('');
    const [error, setError] = useState('');
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(50));

    React.useEffect(() => {
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
        const heightNum = parseFloat(height);

        if (!height || isNaN(heightNum)) {
            setError('Iltimos, bo\'yingizni kiriting');
            return;
        }

        if (heightNum < 100 || heightNum > 250) {
            setError('Bo\'y 100 va 250 cm oralig\'ida bo\'lishi kerak');
            return;
        }

        try {
            await saveData('height', height);
            navigation.navigate('AgeInput');
        } catch (err) {
            setError('Xatolik yuz berdi');
        }
    };

    return (
        <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            style={styles.container}
        >
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                <Text style={styles.title}>Bo'yingiz qancha?</Text>
                <Text style={styles.subtitle}>
                    BMI hisoblash uchun bo'yingizni kiriting
                </Text>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={[styles.input, { color: colors.text, borderColor: error ? COLORS.error : colors.card }]}
                        placeholder="Masalan: 175"
                        placeholderTextColor={colors.textSecondary}
                        value={height}
                        onChangeText={(text) => {
                            setHeight(text);
                            setError('');
                        }}
                        keyboardType="numeric"
                        maxLength={3}
                    />
                    <Text style={styles.unit}>cm</Text>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Text style={styles.infoText}>
                    💡 Bo'y BMI (Body Mass Index) hisoblash uchun ishlatiladi
                </Text>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: COLORS.white }]}
                    onPress={handleContinue}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.buttonText, { color: colors.primary }]}>Davom etish</Text>
                </TouchableOpacity>
            </Animated.View>
            </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
    },
    title: {
        fontSize: FONTS.xxl,
        fontWeight: '700',
        color: COLORS.white,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: FONTS.md,
        color: COLORS.white,
        opacity: 0.9,
        marginBottom: SPACING.xxxl,
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        width: '100%',
        maxWidth: 200,
    },
    input: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 16,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        fontSize: FONTS.xl,
        fontWeight: '600',
        textAlign: 'center',
        borderWidth: 2,
    },
    unit: {
        fontSize: FONTS.lg,
        color: COLORS.white,
        fontWeight: '600',
        marginLeft: SPACING.sm,
    },
    errorText: {
        color: COLORS.error,
        fontSize: FONTS.sm,
        marginBottom: SPACING.md,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: 8,
    },
    infoText: {
        fontSize: FONTS.sm,
        color: COLORS.white,
        opacity: 0.8,
        textAlign: 'center',
        marginBottom: SPACING.xxxl,
        paddingHorizontal: SPACING.lg,
    },
    button: {
        paddingHorizontal: SPACING.xxxl,
        paddingVertical: SPACING.md,
        borderRadius: 30,
        marginTop: SPACING.lg,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    buttonText: {
        fontSize: FONTS.lg,
        fontWeight: '700',
    },
    progressContainer: {
        position: 'absolute',
        bottom: 60,
        alignItems: 'center',
    },
    progressBar: {
        width: 200,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: SPACING.xs,
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.white,
        borderRadius: 2,
    },
    progressText: {
        color: COLORS.white,
        fontSize: FONTS.sm,
        opacity: 0.8,
    },
});

export default HeightInputScreen;
