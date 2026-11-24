import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';

const defaultThemeValue = {
    isDark: true,
    themePreference: 'system',
    setTheme: () => {},
    colors: {
        ...COLORS,
        background: COLORS.bgDark,
        surface: COLORS.bgCard,
        text: '#FFFFFF',
        textSecondary: 'rgba(255,255,255,0.7)',
        card: COLORS.bgCard,
        border: 'rgba(255,255,255,0.1)',
    },
};

const ThemeContext = createContext(defaultThemeValue);

export const ThemeProvider = ({ children }) => {
    const systemScheme = useColorScheme();
    const [themePreference, setThemePreference] = useState('system'); // 'light', 'dark', 'system'
    const [isDark, setIsDark] = useState(systemScheme === 'dark');

    // Load saved preference on mount
    useEffect(() => {
        loadThemePreference();
    }, []);

    // Update isDark when preference or system scheme changes
    useEffect(() => {
        if (themePreference === 'system') {
            setIsDark(systemScheme === 'dark');
        } else {
            setIsDark(themePreference === 'dark');
        }
    }, [themePreference, systemScheme]);

    const loadThemePreference = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('themePreference');
            if (savedTheme) {
                setThemePreference(savedTheme);
            }
        } catch (error) {
            console.error('Failed to load theme preference', error);
        }
    };

    const setTheme = async (preference) => {
        try {
            setThemePreference(preference);
            await AsyncStorage.setItem('themePreference', preference);
        } catch (error) {
            console.error('Failed to save theme preference', error);
        }
    };

    const themeColors = {
        ...COLORS,
        background: isDark ? COLORS.bgDark : '#F4F6F5',
        surface: isDark ? COLORS.bgCard : '#FFFFFF',
        text: isDark ? '#FFFFFF' : '#1A1A1A',
        textSecondary: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
        card: isDark ? COLORS.bgCard : '#FFFFFF',
        border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        
        // Brand dynamic colors
        primaryBg: isDark ? COLORS.primaryDark : '#E8F5E9',
        
        // Dynamic gradients
        bgGradient: isDark ? ['#132218', '#0D1F12'] : ['#F4F6F5', '#E8F5E9'],
        onboardingGradient: isDark ? [COLORS.gradientStart, COLORS.gradientEnd] : ['#F4F6F5', '#E8F5E9'],
        
        // Premium Cards
        cardPremium: isDark ? 'rgba(19, 34, 24, 0.8)' : '#FFFFFF',
        borderLight: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
        
        // Icon/Input backgrounds
        iconBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        inputBg: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
        
        // Modals
        modalBg: isDark ? '#0D1117' : '#FFFFFF',
        modalOverlay: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)',
    };

    return (
        <ThemeContext.Provider value={{ isDark, themePreference, setTheme, colors: themeColors }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext) || defaultThemeValue;
