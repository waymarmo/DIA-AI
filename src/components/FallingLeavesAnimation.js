import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 5 ta optimal, juda yengil va xatosiz ishlovchi tabiiy barglar
const LEAF_ITEMS = [
    { id: 1, icon: 'leaf', size: 22, color: '#00E676', opacity: 0.75, startX: 0.15, duration: 6000, delay: 0, sway: 20 },
    { id: 2, icon: 'leaf-outline', size: 17, color: '#10B981', opacity: 0.60, startX: 0.38, duration: 7200, delay: 1200, sway: 26 },
    { id: 3, icon: 'leaf', size: 24, color: '#34D399', opacity: 0.70, startX: 0.62, duration: 5800, delay: 600, sway: 22 },
    { id: 4, icon: 'leaf-outline', size: 19, color: '#059669', opacity: 0.55, startX: 0.82, duration: 7800, delay: 1800, sway: 28 },
    { id: 5, icon: 'leaf', size: 20, color: '#22C55E', opacity: 0.65, startX: 0.94, duration: 6500, delay: 900, sway: 24 },
];

const SafeSingleLeaf = ({ item }) => {
    const translateY = useRef(new Animated.Value(-50)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const rotate = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        let isMounted = true;
        let fallAnim = null;
        let swayAnim = null;
        let rotateAnim = null;

        // 1. Sekin pastga tushish sikli
        const startFall = () => {
            if (!isMounted) return;
            translateY.setValue(-50);
            fallAnim = Animated.timing(translateY, {
                toValue: SCREEN_HEIGHT + 60,
                duration: item.duration,
                easing: Easing.linear,
                useNativeDriver: true,
            });
            fallAnim.start(({ finished }) => {
                if (finished && isMounted) {
                    startFall();
                }
            });
        };

        // 2. Mayin ikki tomonga chayqalish
        swayAnim = Animated.loop(
            Animated.sequence([
                Animated.timing(translateX, {
                    toValue: item.sway,
                    duration: item.duration / 2,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(translateX, {
                    toValue: -item.sway,
                    duration: item.duration / 2,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        );

        // 3. Tabiiy sekin aylanish
        rotateAnim = Animated.loop(
            Animated.timing(rotate, {
                toValue: 1,
                duration: item.duration * 1.5,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );

        const timer = setTimeout(() => {
            if (isMounted) {
                startFall();
                swayAnim.start();
                rotateAnim.start();
            }
        }, item.delay);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            if (fallAnim) fallAnim.stop();
            if (swayAnim) swayAnim.stop();
            if (rotateAnim) rotateAnim.stop();
        };
    }, []);

    const spin = rotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const leftPos = item.startX * SCREEN_WIDTH;

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.leafWrapper,
                {
                    left: leftPos,
                    opacity: item.opacity,
                    transform: [
                        { translateY },
                        { translateX },
                        { rotate: spin },
                    ],
                },
            ]}
        >
            <Ionicons name={item.icon} size={item.size} color={item.color} />
        </Animated.View>
    );
};

const FallingLeavesAnimation = () => {
    return (
        <View pointerEvents="none" style={styles.container}>
            {LEAF_ITEMS.map((item) => (
                <SafeSingleLeaf key={item.id} item={item} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    leafWrapper: {
        position: 'absolute',
        top: 0,
        zIndex: 1,
    },
});

export default FallingLeavesAnimation;
