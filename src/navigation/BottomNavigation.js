import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants/theme';

import DashboardScreen from '../screens/DashboardScreen';
import RecipesScreen from '../screens/RecipesScreen';
import ChatScreen from '../screens/ChatScreen';
import FoodScannerScreen from '../screens/FoodScannerScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const TAB_LABELS = {
    Asosiy: 'dashboard.title',
    Retseptlar: 'recipes.title',
    DiaAI: 'Dia AI',
    Skaner: 'scanner.title',
    Hisobotlar: 'reports.title',
    Profil: 'profile.title',
};

const BottomNavigation = () => {
    const { t } = useTranslation();
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarLabel: TAB_LABELS[route.name] ? t(TAB_LABELS[route.name]) : route.name,
                tabBarStyle: {
                    backgroundColor: COLORS.bgDark,
                    borderTopColor: COLORS.bgLight,
                    borderTopWidth: 1,
                    height: 70,
                    paddingBottom: 10,
                    paddingTop: 10,
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textMuted,
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'DiaAI') {
                        return <FontAwesome5 name="robot" size={20} color={color} />;
                    }

                    switch (route.name) {
                        case 'Asosiy':
                            iconName = focused ? 'home' : 'home-outline';
                            break;
                        case 'Retseptlar':
                            iconName = focused ? 'book' : 'book-outline';
                            break;
                        case 'Skaner':
                            iconName = focused ? 'scan' : 'scan-outline';
                            break;
                        case 'Hisobotlar':
                            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                            break;
                        case 'Profil':
                            iconName = focused ? 'person' : 'person-outline';
                            break;
                        default:
                            iconName = 'help-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Asosiy" component={DashboardScreen} />
            <Tab.Screen name="Retseptlar" component={RecipesScreen} />
            <Tab.Screen name="DiaAI" component={ChatScreen} />
            <Tab.Screen name="Skaner" component={FoodScannerScreen} />
            <Tab.Screen name="Hisobotlar" component={ReportsScreen} />
            <Tab.Screen name="Profil" component={ProfileScreen} />
        </Tab.Navigator>
    );
};

export default BottomNavigation;
