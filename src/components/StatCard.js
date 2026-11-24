import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';

const StatCard = ({ icon, title, value, unit, trend, trendValue, iconColor, glass = false }) => {
    const Container = glass ? BlurView : View;
    const containerProps = glass
        ? { intensity: 30, tint: 'dark', style: styles.glassContainer }
        : { style: styles.container };

    return (
        <Container {...containerProps}>
            {/* Icon Circle */}
            <View style={[styles.iconCircle, { backgroundColor: iconColor || COLORS.iconCircle }]}>
                <Ionicons name={icon} size={24} color={COLORS.textPrimary} />
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={[styles.title, glass && { color: 'rgba(255,255,255,0.7)' }]}>{title}</Text>
                <View style={styles.valueRow}>
                    <Text style={[styles.value, glass && { color: COLORS.white }]}>{value}</Text>
                    {Boolean(unit) && <Text style={[styles.unit, glass && { color: 'rgba(255,255,255,0.6)' }]}> {unit}</Text>}
                    {Boolean(trend) && (
                        <View style={[styles.trendBadge, trend === 'up' ? styles.trendUp : styles.trendDown]}>
                            <Ionicons
                                name={trend === 'up' ? 'trending-up' : 'trending-down'}
                                size={12}
                                color={COLORS.textPrimary}
                            />
                            <Text style={styles.trendText}>{trendValue}</Text>
                        </View>
                    )}
                </View>
            </View>
        </Container>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        padding: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        flex: 1,
    },
    glassContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        padding: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        flex: 1,
        overflow: 'hidden',
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: FONTS.sm,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: SPACING.xs,
    },
    value: {
        fontSize: FONTS.xxl,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    unit: {
        fontSize: FONTS.md,
        color: COLORS.textSecondary,
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 12,
        gap: 2,
    },
    trendUp: {
        backgroundColor: COLORS.success + '30',
    },
    trendDown: {
        backgroundColor: COLORS.error + '30',
    },
    trendText: {
        fontSize: FONTS.xs,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
});

export default StatCard;

