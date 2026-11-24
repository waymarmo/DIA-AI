import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * GlucoseChart
 * @param {number[]} data
 * @param {string[]} labels
 * @param {string}   title
 * @param {string}   unit
 * @param {string}   chartColor
 * @param {boolean}  bare  - if true, renders only the LineChart (no container/card styling)
 * @param {string[]} extraData - optional extra info like exact time for each point
 * @param {number}   limit - optional limit value to draw a horizontal line
 */
const GlucoseChart = ({ data, labels, title, unit, chartColor, bare, extraData, limit }) => {
    const { colors, isDark } = useTheme();
    const { i18n } = useTranslation();
    const [tooltipPos, setTooltipPos] = useState(null);

    const isEn = i18n?.language === 'en';
    const isRu = i18n?.language === 'ru';

    const defaultDayLabels = isEn
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : (isRu ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] : ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']);

    const chartData = data && data.length > 0 ? data : [0, 0, 0, 0, 0, 0, 0];
    const chartLabels = labels && labels.length > 0 ? labels : defaultDayLabels;
    const displayColor = chartColor || COLORS.accent;

    const chartConfig = {
        backgroundColor: 'transparent',
        backgroundGradientFrom: colors.card,
        backgroundGradientTo: colors.card,
        backgroundGradientFromOpacity: 0,
        backgroundGradientToOpacity: 0,
        fillShadowGradient: displayColor,
        fillShadowGradientOpacity: 0.4,
        fillShadowGradientFrom: displayColor,
        fillShadowGradientFromOpacity: 0.5,
        fillShadowGradientTo: displayColor,
        fillShadowGradientToOpacity: 0.05,
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(${displayColor === COLORS.accent ? '0, 230, 118' : (displayColor === COLORS.info ? '74, 158, 255' : '167, 139, 250')}, ${opacity})`,
        labelColor: (opacity = 1) => isDark ? `rgba(255,255,255,${opacity * 0.7})` : `rgba(0,0,0,${opacity * 0.7})`,
        style: { borderRadius: RADIUS.lg },
        propsForDots: {
            r: '5',
            strokeWidth: '3',
            stroke: colors.card,
        },
        propsForBackgroundLines: {
            stroke: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            strokeWidth: 1.5,
            strokeDasharray: [4, 4],
        },
    };

    const handleDataPointClick = (data) => {
        const { x, y, value, index } = data;
        
        if (tooltipPos && tooltipPos.index === index) {
            setTooltipPos(null);
            return;
        }

        let label = labels[index] || '';
        let time = extraData?.[index] || '';

        setTooltipPos({ x, y, value, index, label, time });
    };

    const chartWidth = bare ? SCREEN_WIDTH - 32 : SCREEN_WIDTH - 48;

    const lineChart = (
        <View style={styles.chartContainer}>
            <LineChart
                data={{ 
                    labels: chartLabels, 
                    datasets: [{ 
                        data: chartData, 
                        color: (opacity = 1) => displayColor, 
                        strokeWidth: 4 
                    }] 
                }}
                width={chartWidth}
                height={bare ? 160 : 220}
                chartConfig={chartConfig}
                bezier
                onDataPointClick={handleDataPointClick}
                style={{ 
                    borderRadius: RADIUS.lg,
                    paddingTop: 16,
                    paddingRight: 16,
                    paddingLeft: 0,
                    marginRight: 0,
                    marginLeft: -8,
                }}
                withInnerLines={true}
                withOuterLines={false}
                withVerticalLines={false}
                withHorizontalLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={!bare}
                fromZero={true}
                transparent
                yAxisSuffix=""
                yAxisInterval={1}
                segments={4}
            />

            {limit > 0 && (
                <View 
                    style={[
                        styles.limitLine, 
                        { 
                            top: 220 - (limit / (Math.max(...chartData, limit * 1.5) || 1)) * 220 + 16,
                            borderColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                        }
                    ]} 
                />
            )}

            {tooltipPos && (
                <View 
                    style={[
                        styles.tooltip, 
                        { 
                            top: tooltipPos.y - 50, 
                            left: tooltipPos.x - 35,
                            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                            borderColor: displayColor,
                            shadowColor: displayColor,
                        }
                    ]}
                >
                    <Text style={[styles.tooltipVal, { color: colors.text }]}>{tooltipPos.value} <Text style={styles.miniUnit}>{unit || 'mg/dL'}</Text></Text>
                    <Text style={[styles.tooltipTime, { color: colors.textSecondary }]}>
                        {tooltipPos.time || tooltipPos.label}
                    </Text>
                    <View style={[styles.tooltipArrow, { borderTopColor: isDark ? '#1F2937' : '#FFFFFF' }]} />
                </View>
            )}
        </View>
    );

    if (bare) {
        return lineChart;
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <View style={styles.header}>
                {!!title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
                <View style={[styles.badge, { backgroundColor: `${displayColor}15` }]}>
                    <Text style={[styles.badgeText, { color: displayColor }]}>{unit}</Text>
                </View>
            </View>
            
            {lineChart}
            
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <LinearGradient 
                        colors={[displayColor, `${displayColor}50`]} 
                        style={styles.legendDot} 
                        start={{x:0, y:0}} end={{x:1, y:1}}
                    />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                        {isEn ? 'Measurements (Tap point)' : (isRu ? 'Замеры (Нажмите)' : 'O\'lchovlar (Bosib ko\'ring)')}
                    </Text>
                </View>
                {limit > 0 && (
                    <View style={[styles.legendItem, { marginLeft: 16 }]}>
                        <View style={[styles.legendLineAlt, { borderColor: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]} />
                        <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                            {isEn ? `Target (${limit})` : (isRu ? `Цель (${limit})` : `Maqsad (${limit})`)}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: RADIUS.lg, 
        borderWidth: 1, 
        padding: SPACING.md, 
        marginBottom: SPACING.md, 
        overflow: 'hidden',
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    chartContainer: {
        position: 'relative',
    },
    title: {
        fontSize: 16, 
        fontWeight: '700',
    },
    legend: {
        flexDirection: 'row', 
        justifyContent: 'center', 
        marginTop: SPACING.sm,
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.03)',
    },
    legendItem: {
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 6,
    },
    legendDot: {
        width: 10, 
        height: 10, 
        borderRadius: 5,
    },
    legendText: {
        fontSize: 11, 
    },
    tooltip: {
        position: 'absolute',
        padding: 8,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
        minWidth: 70,
        zIndex: 10,
    },
    tooltipArrow: {
        position: 'absolute',
        bottom: -6,
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
    },
    tooltipVal: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    miniUnit: {
        fontSize: 9,
        fontWeight: 'normal',
    },
    tooltipTime: {
        fontSize: 11,
    },
    limitLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        borderTopWidth: 1.5,
        borderStyle: 'dashed',
        zIndex: 1,
    },
    legendLineAlt: {
        width: 18,
        height: 0,
        borderTopWidth: 1.5,
        borderStyle: 'dashed',
    }
});

export default GlucoseChart;
