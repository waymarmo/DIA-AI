import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS, SHADOWS } from '../constants/theme';

const FoodCard = ({
    image,
    title,
    time,
    calories,
    sugar,
    category,
    isFavorite = false,
    onPress,
    onFavoriteToggle
}) => {
    const [imageError, setImageError] = useState(false);
    const showImage = image && !imageError;

    return (
        <TouchableOpacity
            style={[styles.container, SHADOWS.light]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            {showImage ? (
                <Image
                    source={typeof image === 'string' ? { uri: image } : image}
                    style={styles.image}
                    resizeMode="cover"
                    onError={() => setImageError(true)}
                />
            ) : (
                <View style={[styles.image, styles.imagePlaceholder]}>
                    <Ionicons name="restaurant-outline" size={48} color={COLORS.textSecondary} />
                </View>
            )}

            <TouchableOpacity
                style={styles.favoriteButton}
                onPress={onFavoriteToggle}
                activeOpacity={0.7}
            >
                <Ionicons
                    name={isFavorite ? 'heart' : 'heart-outline'}
                    size={20}
                    color={isFavorite ? COLORS.favoriteRed : COLORS.textDark}
                />
            </TouchableOpacity>

            <View style={styles.content}>
                {Boolean(category) && (
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{category}</Text>
                    </View>
                )}

                <Text style={styles.title} numberOfLines={2}>{title}</Text>

                <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                        <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.infoText}>{time} min</Text>
                    </View>

                    <View style={styles.infoItem}>
                        <Ionicons name="flame-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.infoText}>{calories} kkal</Text>
                    </View>
                </View>

                <View style={styles.sugarContainer}>
                    <Ionicons name="water-outline" size={14} color={COLORS.accent} />
                    <Text style={styles.sugarText}>{sugar}g shakar</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.cardLight,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        marginBottom: SPACING.md,
    },
    image: {
        width: '100%',
        height: 160,
        backgroundColor: COLORS.bgLight,
    },
    imagePlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    favoriteButton: {
        position: 'absolute',
        top: SPACING.sm,
        right: SPACING.sm,
        width: 36,
        height: 36,
        borderRadius: RADIUS.round,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        padding: SPACING.md,
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.accent + '20',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
        marginBottom: SPACING.xs,
    },
    categoryText: {
        color: COLORS.accent,
        fontSize: FONTS.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    title: {
        color: COLORS.textDark,
        fontSize: FONTS.md,
        fontWeight: '600',
        marginBottom: SPACING.sm,
        lineHeight: 20,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: SPACING.sm,
        gap: SPACING.md,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    infoText: {
        color: COLORS.textSecondary,
        fontSize: FONTS.xs,
    },
    sugarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingTop: SPACING.xs,
        borderTopWidth: 1,
        borderTopColor: COLORS.bgLight,
    },
    sugarText: {
        color: COLORS.accent,
        fontSize: FONTS.sm,
        fontWeight: '600',
    },
});

export default FoodCard;

