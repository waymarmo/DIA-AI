import React, { useState, useEffect } from 'react';
import './src/i18n'; // Initialize i18n
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, LogBox } from 'react-native';

// Hide warning and error overlay boxes in Expo Go
LogBox.ignoreAllLogs();
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { checkOnboardingComplete } from './src/utils/storage';
import { COLORS } from './src/constants/theme';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
// DiaAIProvider removed
import LoadingScreen from './src/components/LoadingScreen';

class AppErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error('AppErrorBoundary:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgDark, padding: 24 }}>
          <Text style={{ color: COLORS.textPrimary, fontSize: 18, marginBottom: 16 }}>Xatolik yuz berdi</Text>
          <TouchableOpacity onPress={() => this.setState({ hasError: false })} style={{ backgroundColor: COLORS.primary, padding: 12, borderRadius: 8 }}>
            <Text style={{ color: '#000' }}>Qayta urinish</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// Onboarding Screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import AdvantagesScreen from './src/screens/AdvantagesScreen';
import Advantages2Screen from './src/screens/Advantages2Screen';
import LanguageScreen from './src/screens/LanguageScreen';
import NameInputScreen from './src/screens/NameInputScreen';
import GenderSelectionScreen from './src/screens/GenderSelectionScreen';
import WeightInputScreen from './src/screens/WeightInputScreen';
import ActivityLevelScreen from './src/screens/ActivityLevelScreen';
import HeightInputScreen from './src/screens/HeightInputScreen';
import AgeInputScreen from './src/screens/AgeInputScreen';
import RegistrationScreen from './src/screens/RegistrationScreen';
import PasswordSetupScreen from './src/screens/PasswordSetupScreen';
import SmsVerificationScreen from './src/screens/SmsVerificationScreen';
import DiseaseNavigatorIntroScreen from './src/screens/DiseaseNavigatorIntroScreen';
import MedicationsScreen from './src/screens/MedicationsScreen';
import ExercisesScreen from './src/screens/ExercisesScreen';
import SignInScreen from './src/screens/SignInScreen';

// Main App
import BottomNavigation from './src/navigation/BottomNavigation';

const Stack = createStackNavigator();

const NavigationWrapper = ({ isOnboardingComplete }) => {
  const { colors, isDark } = useTheme();

  return (
    <NavigationContainer>

      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack.Navigator
        initialRouteName={isOnboardingComplete ? 'MainApp' : 'Welcome'}
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: colors.background },
        }}
      >
        {/* Onboarding Flow */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="Advantages" component={AdvantagesScreen} />
        <Stack.Screen name="Advantages2" component={Advantages2Screen} />
        <Stack.Screen name="LanguageSelection" component={LanguageScreen} />
        <Stack.Screen name="NameInput" component={NameInputScreen} />
        <Stack.Screen name="GenderSelection" component={GenderSelectionScreen} />
        <Stack.Screen name="WeightInput" component={WeightInputScreen} />
        <Stack.Screen name="ActivityLevel" component={ActivityLevelScreen} />
        <Stack.Screen name="HeightInput" component={HeightInputScreen} />
        <Stack.Screen name="AgeInput" component={AgeInputScreen} />
        <Stack.Screen name="Registration" component={RegistrationScreen} />
        <Stack.Screen name="PasswordSetup" component={PasswordSetupScreen} />
        <Stack.Screen name="SmsVerification" component={SmsVerificationScreen} />
        <Stack.Screen name="DiseaseNavigatorIntro" component={DiseaseNavigatorIntroScreen} />

        {/* Main App with Bottom Navigation */}
        <Stack.Screen name="MainApp" component={BottomNavigation} />
        <Stack.Screen name="MainTabs" component={BottomNavigation} />
        <Stack.Screen name="Profile" component={BottomNavigation} />
        <Stack.Screen name="Profil" component={BottomNavigation} />
        <Stack.Screen name="Medications" component={MedicationsScreen} />
        <Stack.Screen name="PersonalMedications" component={MedicationsScreen} />
        <Stack.Screen name="Exercises" component={ExercisesScreen} />
        <Stack.Screen name="JismoniyMashqlar" component={ExercisesScreen} />
      </Stack.Navigator>

    </NavigationContainer>
  );
};

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  useEffect(() => {
    checkOnboarding();
    const fallback = setTimeout(() => setIsLoading(false), 2500);
    return () => clearTimeout(fallback);
  }, []);

  const checkOnboarding = async () => {
    try {
      const completed = await checkOnboardingComplete();
      setIsOnboardingComplete(Boolean(completed));
    } catch (error) {
      console.warn('Error checking onboarding:', error?.message || error);
      setIsOnboardingComplete(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            <NavigationWrapper isOnboardingComplete={isOnboardingComplete} />
          </SafeAreaProvider>
        </ThemeProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}

export default App;
