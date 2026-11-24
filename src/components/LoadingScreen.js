import React, { useEffect, useRef } from 'react';
import { View, Image, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../constants/theme';
import { LOGO_SPLASH } from '../constants/assets';
import FallingLeavesAnimation from './FallingLeavesAnimation';

const { width } = Dimensions.get('window');
const LOGO_SIZE = 150;

const LoadingScreen = () => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const textFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Dastlabki mayin kirib kelish animatsiyasi (icon qimirlamay, sokin turadi)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 800,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={['#071f13', '#030d08', '#010503']}
      style={styles.container}
    >
      {/* Yuqoridan tushuvchi ko'katlar animatsiyasi */}
      <FallingLeavesAnimation />

      {/* Markaziy Logo (Aylana va qimirlashlarsiz, sokin) */}
      <View style={styles.centerBox}>
        {/* Asosiy Logo Icon */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Image
            source={LOGO_SPLASH}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Ilova nomi va tavsifi */}
        <Animated.View style={[styles.textWrapper, { opacity: textFadeAnim }]}>
          <Text style={styles.titleText}>DIA AI</Text>
          <Text style={styles.subtitleText}>Aqlli Salomatlik & Diabet Boshqaruvi</Text>
          <View style={styles.activePill}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Tizim tayyorlanmoqda...</Text>
          </View>
        </Animated.View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoWrapper: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  textWrapper: {
    alignItems: 'center',
    marginTop: 28,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  subtitleText: {
    fontSize: 13,
    color: '#A7F3D0',
    fontWeight: '600',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderColor: 'rgba(0, 230, 118, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 18,
    gap: 8,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#00E676',
  },
  activeText: {
    fontSize: 11,
    color: '#00E676',
    fontWeight: '700',
  },
});

export default LoadingScreen;
