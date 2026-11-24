import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Animated, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

const CustomButton = ({
    title,
    onPress,
    variant = 'primary', // primary, secondary, outline, danger
    loading = false,
    disabled = false,
    style,
    textStyle,
    icon,
}) => {
    const scaleValue = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleValue, {
            toValue: 0.96,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleValue, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    const getButtonStyle = () => {
        const baseStyle = [styles.container];

        if (disabled) {
            baseStyle.push(styles.disabled);
        } else {
            switch (variant) {
                case 'primary':
                    baseStyle.push(styles.primary);
                    break;
                case 'secondary':
                    baseStyle.push(styles.secondary);
                    break;
                case 'outline':
                    baseStyle.push(styles.outline);
                    break;
                case 'danger':
                    baseStyle.push(styles.danger);
                    break;
            }
        }

        return baseStyle;
    };

    const getTextStyle = () => {
        const baseStyle = [styles.text];

        if (disabled) {
            baseStyle.push(styles.textDisabled);
        } else {
            switch (variant) {
                case 'primary':
                    baseStyle.push(styles.textPrimary);
                    break;
                case 'secondary':
                case 'outline':
                    baseStyle.push(styles.textSecondary);
                    break;
                case 'danger':
                    baseStyle.push(styles.textDanger);
                    break;
            }
        }

        return baseStyle;
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
            activeOpacity={0.8}
        >
            <Animated.View style={[getButtonStyle(), style, { transform: [{ scale: scaleValue }] }]}>
                {loading ? (
                    <ActivityIndicator
                        color={variant === 'primary' ? COLORS.black : COLORS.accent}
                    />
                ) : (
                    <View style={styles.content}>
                        {icon && icon}
                        <Text style={[getTextStyle(), textStyle]}>
                            {title}
                        </Text>
                    </View>
                )}
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 56,
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    // Primary variant - Neon green background, black text
    primary: {
        backgroundColor: COLORS.accent,
    },
    // Secondary variant - Transparent with green border
    secondary: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: COLORS.accent,
    },
    // Outline variant
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: COLORS.cardBorder,
    },
    // Danger variant
    danger: {
        backgroundColor: COLORS.error,
    },
    // Disabled state
    disabled: {
        backgroundColor: COLORS.textSecondary,
        opacity: 0.5,
    },
    // Text styles
    text: {
        fontSize: FONTS.md,
        fontWeight: '600',
    },
    textPrimary: {
        color: COLORS.black,
    },
    textSecondary: {
        color: COLORS.accent,
    },
    textDanger: {
        color: COLORS.textPrimary,
    },
    textDisabled: {
        color: COLORS.textPrimary,
    },
});

export default CustomButton;
