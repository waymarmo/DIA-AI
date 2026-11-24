import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  StatusBar,
  Linking,
  Animated,
  Platform,
  Dimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// SDK 49+: Use CameraView and useCameraPermissions instead of deprecated Camera
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING, FONTS, RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import foodsData from '../data/foods.json';
import { saveMeal, saveCustomRecipe } from '../utils/storage';
import DiaAIService from '../services/DiaAIService';
import { scheduleCustomMealNotification } from '../services/NotificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Flash mode string constants (SDK 49+ - no Camera.Constants)
const FLASH_MODES = {
  off: 'off',
  on: 'on',
  auto: 'auto',
};

const FoodScannerScreen = () => {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();

  // SDK 49+: useCameraPermissions hook replaces Camera.requestCameraPermissionsAsync()
  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState(false);
  const [scanMode, setScanMode] = useState('photo'); // Removed barcode mode, defaulting to photo
  const [scannedFood, setScannedFood] = useState(null);
  const [editableWeight, setEditableWeight] = useState('200'); // Default 200g
  const [isSavingToRecipes, setIsSavingToRecipes] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState(new Date().getHours().toString());
  const [selectedMin, setSelectedMin] = useState(new Date().getMinutes().toString());
  const cameraRef = useRef(null);

  // --- Camera Controls State ---
  // SDK 49+: flashMode is a plain string ('off' | 'on' | 'auto')
  const [flashMode, setFlashMode] = useState(FLASH_MODES.off);
  const [zoom, setZoom] = useState(0);
  const [isTakingPicture, setIsTakingPicture] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const lastCaptureAtRef = useRef(0);

  // --- Animations ---
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const shutterAnim = useRef(new Animated.Value(1)).current;

  // Barcode scan line animation removed

  const handleRequestPermission = async () => {
    try {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          t('scanner.permissionRequired'),
          t('scanner.permissionRequiredDesc'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('scanner.goToSettings'), onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (error) {
      console.error('Permission request error:', error);
      Alert.alert(t('scanner.cameraError'), t('scanner.permissionError'));
    }
  };

  // --- Flash Toggle (string-based, SDK 49+) ---
  const toggleFlash = useCallback(() => {
    setFlashMode(prev => {
      switch (prev) {
        case FLASH_MODES.off:
          return FLASH_MODES.on;
        case FLASH_MODES.on:
          return FLASH_MODES.auto;
        case FLASH_MODES.auto:
        default:
          return FLASH_MODES.off;
      }
    });
  }, []);

  const getFlashIcon = () => {
    switch (flashMode) {
      case FLASH_MODES.on:
        return 'flash';
      case FLASH_MODES.auto:
        return 'flash-outline';
      case FLASH_MODES.off:
      default:
        return 'flash-off';
    }
  };

  const getFlashLabel = () => {
    switch (flashMode) {
      case FLASH_MODES.on:
        return 'ON';
      case FLASH_MODES.auto:
        return 'AUTO';
      case FLASH_MODES.off:
      default:
        return 'OFF';
    }
  };

  // --- Zoom Controls ---
  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.1, 1));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.1, 0));
  }, []);

  // handleBarcodeScanned function removed to simplify logic to photo-only

  const takePicture = async () => {
    if (!cameraRef.current || isTakingPicture) return;
    if (!isCameraReady) {
      Alert.alert(t('scanner.cameraError'), t('scanner.permissionRequiredDesc'));
      return;
    }

    const now = Date.now();
    if (now - lastCaptureAtRef.current < 1500) {
      return;
    }
    lastCaptureAtRef.current = now;

    setIsTakingPicture(true);

    // Shutter animation
    Animated.sequence([
      Animated.timing(shutterAnim, {
        toValue: 0.6,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(shutterAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      const takeOnce = async () => (
        await cameraRef.current.takePictureAsync({
          quality: 0.5, // Reduce quality for faster base64 transmission
          skipProcessing: true,
          base64: true,
          exif: false,
          imageType: 'jpg',
        })
      );

      let photo;
      try {
        photo = await takeOnce();
      } catch (e) {
        // quick retry for transient camera capture failures
        await new Promise((r) => setTimeout(r, 250));
        photo = await takeOnce();
      }

      if (!photo || !photo.uri) {
        Alert.alert(t('scanner.cameraError'), t('scanner.photoError'));
        setIsTakingPicture(false);
        return;
      }

      setScanned(true);
      // Initial placeholder while analyzing
      setScannedFood({
        id: Date.now(),
        name: t('scanner.analyzing'),
        nameRu: t('scanner.analyzing'),
        nameEn: t('scanner.analyzing'),
        category: 'Scanning',
        image: photo.uri,
        calories: 0,
        sugar: 0,
        carbs: 0,
        protein: 0,
        glycemicIndex: 0,
        isAllowed: true,
        description: t('scanner.analyzingDesc'),
        isAnalyzing: true,
      });
      setIsTakingPicture(false); // Stop loading spinner on button

      // --- Dia AI Analysis ---
      try {
        const aiResponse = await DiaAIService.generateResponse(
          `Bu rasmdagi ovqatni aniqla. Javobni faqat va faqat valid JSON formatda qaytar.
          JSON strukturasi:
          { 
            "name": "ovqat nomi", 
            "calories": 100g/ml uchun kkal (son), 
            "sugar": 100g/ml uchun shakar (son), 
            "carbs": 100g/ml uchun uglevod (son), 
            "protein": 100g/ml uchun oqsil (son), 
            "fat": 100g/ml uchun yog' (son), 
            "glycemicIndex": GI soni, 
            "isAllowed": true/false (diabetga mosligi), 
            "description": "qisqa ta'rif", 
            "reason": "agar mumkin bo'lmasa sababi",
            "estimatedWeight": taxminiy miqdori (son, g yoki ml dagi),
            "unit": "g" yoki "ml" (suv/suyuqlik bo'lsa "ml", aks holda "g"),
            "encyclopedicInfo": "mahsulot haqida foydali ilmiy ma'lumot (max 2 jumla)" 
          }`,
          photo.base64,
          i18n.language,
          { jsonMode: true, maxOutputTokens: 1024 }
        );

        // Robust JSON extraction
        let cleanJson = aiResponse.trim();
        // If the model still uses code blocks despite jsonMode
        cleanJson = cleanJson.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanJson = jsonMatch[0];
        }

        let foodData;
        try {
          foodData = JSON.parse(cleanJson);
        } catch (parseError) {
          console.log('[Scanner] Fallback parse failed, trying to fix trailing issues');
          // Basic attempt to fix truncated JSON by adding closing brace if missing
          if (cleanJson.startsWith('{') && !cleanJson.endsWith('}')) {
             foodData = JSON.parse(cleanJson + '}');
          } else {
             throw parseError;
          }
        }
        setEditableWeight(foodData.estimatedWeight ? foodData.estimatedWeight.toString() : '200');

        setScannedFood(prev => ({
          ...prev,
          ...foodData,
          unit: foodData.unit || 'g',
          nameRu: foodData.name, // Fallback
          nameEn: foodData.name, // Fallback
          isAnalyzing: false,
        }));

        DiaAIService.speak(
          `Bu ${foodData.name}. Taxminan ${foodData.estimatedWeight || 200} ${foodData.unit || 'gramm'}. ${foodData.isAllowed ? 'Diabetga ruxsat beriladi.' : "Ehtiyot bo'ling."}`
        );
      } catch (aiError) {
        console.error('AI Analysis Error:', aiError);
        setScannedFood(prev => ({
          ...prev,
          name: t('foodScanner.analyzerError') || 'Tahlil xatosi',
          description: t('foodScanner.analyzerErrorDesc') || "AI tahlil qila olmadi. Iltimos qayta urinib ko'ring yoki qo'lda kiriting.",
          isAnalyzing: false,
        }));
        DiaAIService.speak(t('foodScanner.ttsError') || 'Kechirasiz, ovqatni aniqlay olmadim.');
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert(t('scanner.cameraError'), t('scanner.cameraErrorDesc'));
    } finally {
      setIsTakingPicture(false);
    }
  };

  const addFoodToDiary = async (isScheduled = false) => {
    if (!scannedFood) return;

    let targetDate = new Date();
    if (isScheduled) {
      let h = parseInt(selectedHour);
      let m = parseInt(selectedMin);
      if (isNaN(h)) h = targetDate.getHours();
      if (isNaN(m)) m = targetDate.getMinutes();
      targetDate.setHours(h, m, 0, 0);

      if (targetDate <= new Date()) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
    }

    const weight = parseInt(editableWeight) || 200;
    const ratio = weight / 100;

    const meal = {
      ...scannedFood,
      id: `meal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      amount: weight,
      calories: Math.round(scannedFood.calories * ratio),
      sugar: Math.round(scannedFood.sugar * ratio),
      carbs: Math.round(scannedFood.carbs * ratio),
      protein: Math.round(scannedFood.protein * ratio),
      fat: Math.round(scannedFood.fat * ratio),
      timestamp: targetDate.toISOString(),
      completed: !isScheduled,
    };

    try {
      const success = await saveMeal(meal);
      if (success) {
        if (isScheduled) {
          await scheduleCustomMealNotification(
            t('notifications.mealTimeTitle'),
            t('notifications.mealTimeBody', { name: meal.name }),
            targetDate,
            meal.id
          );
          Alert.alert(t('common.success'), t('scanner.reminderSet'), [
            {
              text: 'OK',
              onPress: () => {
                setShowTimePicker(false);
                setScanned(false);
                setScannedFood(null);
                setScanMode('photo');
              },
            },
          ]);
        } else {
          Alert.alert(t('common.success'), t('recipes.addedToDiary'), [
            {
              text: 'OK',
              onPress: () => {
                setShowTimePicker(false);
                setScanned(false);
                setScannedFood(null);
                setScanMode('photo');
              },
            },
          ]);
        }
      } else {
        Alert.alert(t('common.error'), t('common.errorOccurred'));
      }
    } catch (e) {
      console.warn(e);
      Alert.alert('Xatolik', 'Eslatma o\'rnatishda xatolik yuz berdi');
    }
  };

  const saveAsRecipe = async () => {
    if (!scannedFood) return;
    if (scannedFood.isAllowed === false) {
      Alert.alert(
        t('scanner.notRecommended'),
        scannedFood.reason ? scannedFood.reason : t('scanner.whyNotRecommended')
      );
      return;
    }
    setIsSavingToRecipes(true);
    
    const weight = parseInt(editableWeight) || 200;
    const unit = scannedFood.unit || 'g';
    const ratio = weight / 100;
    
    const currentHour = new Date().getHours();
    const inferredCategory = currentHour < 11 ? 'nonushta' : currentHour < 17 ? 'tushlik' : 'kechki_ovqat';

    const newRecipe = {
      id: `ai-scan-${Date.now()}`,
      title: scannedFood.name,
      titleRu: scannedFood.nameRu || scannedFood.name,
      titleEn: scannedFood.nameEn || scannedFood.name,
      calories: Math.round(scannedFood.calories * ratio),
      sugar: Math.round(scannedFood.sugar * ratio),
      carbs: Math.round(scannedFood.carbs * ratio),
      protein: Math.round(scannedFood.protein * ratio),
      fat: Math.round(scannedFood.fat * ratio),
      gi: scannedFood.glycemicIndex > 55 ? 'high' : 'low',
      time: 5,
      category: inferredCategory,
      servings: 1,
      image: scannedFood.image,
      ingredients: [ `${weight}${unit} ${scannedFood.name}` ],
      instructions: scannedFood.description,
      isAIScanned: true,
      encyclopedicInfo: scannedFood.encyclopedicInfo
    };

    try {
      const success = await saveCustomRecipe(newRecipe);
      if (success) {
        Alert.alert(t('common.success'), t('scanner.recipeSaved'));
      } else {
        Alert.alert(t('common.error'), t('common.errorOccurred'));
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setIsSavingToRecipes(false);
    }
  };

  const addToDiary = () => {
    setShowTimePicker(true);
  };

  const resetScanner = () => {
    setScanned(false);
    setScannedFood(null);
    setScanMode('photo');
    setFlashMode(FLASH_MODES.off);
    setZoom(0);
    setIsTakingPicture(false);
  };

  // --- Permission States ---
  // permission is null while loading
  if (!permission) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.gradientStart }}>
        <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.centerContainer}>
          <Text style={[styles.messageText, { color: colors.text }]}>
            {t('scanner.requestingPermission')}
          </Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.gradientStart }}>
        <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.centerContainer}>
          <Ionicons name="camera-off" size={64} color={colors.textSecondary} />
          <Text style={[styles.messageText, { color: colors.text }]}>
            {t('scanner.permissionDenied')}
          </Text>
          <Text style={[styles.messageSubtext, { color: colors.textSecondary }]}>
            {t('scanner.permissionDeniedDesc')}
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleRequestPermission}
          >
            <Text style={styles.primaryButtonText}>{t('scanner.requestPermission')}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

  // scanMode selection view removed. Directly showing camera view.

  if (scannedFood) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.gradientStart }}>
        <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={[styles.resultCard, { backgroundColor: colors.card }]}>
            {showTimePicker ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>{t('scanner.setReminderQ')}</Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
                  {t('scanner.reminderDesc')}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32 }}>
                  <TextInput
                    style={[styles.timeInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.borderLight }]}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={selectedHour}
                    onChangeText={setSelectedHour}
                    placeholder="00"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={{ fontSize: 32, fontWeight: 'bold', color: colors.text, marginHorizontal: 10 }}>:</Text>
                  <TextInput
                    style={[styles.timeInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.borderLight }]}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={selectedMin}
                    onChangeText={setSelectedMin}
                    placeholder="00"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <TouchableOpacity 
                   style={[styles.primaryButton, { width: '100%', marginBottom: 12 }]} 
                   onPress={() => addFoodToDiary(true)}
                   activeOpacity={0.8}
                 >
                   <Ionicons name="notifications" size={20} color="#fff" />
                   <Text style={styles.primaryButtonText}>{t('scanner.setForTime')}</Text>
                 </TouchableOpacity>
 
                 <TouchableOpacity 
                   style={{ paddingVertical: 14 }} 
                   onPress={() => addFoodToDiary(false)}
                 >
                   <Text style={{ fontSize: 15, color: COLORS.success, fontWeight: '600' }}>{t('scanner.eatNow')}</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity 
                   style={{ paddingVertical: 14 }} 
                   onPress={() => setShowTimePicker(false)}
                 >
                   <Text style={{ fontSize: 14, color: colors.textSecondary }}>{t('common.back')}</Text>
                 </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={[styles.statusBadge, { backgroundColor: scannedFood.isAllowed ? COLORS.success : COLORS.error, marginBottom: 12 }]}>
                  <Ionicons name={scannedFood.isAllowed ? 'checkmark-circle' : 'close-circle'} size={32} color={COLORS.white} />
                  <Text style={styles.statusText}>{scannedFood.isAllowed ? t('scanner.safeToEat') : t('scanner.notRecommended')}</Text>
                </View>

                <View style={[styles.weightContainer, { backgroundColor: colors.inputBg, borderColor: colors.borderLight }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.weightLabel, { color: colors.textSecondary }]}>{t('scanner.editWeight')} ({scannedFood.unit || 'g'}):</Text>
                    <TextInput
                      style={[styles.weightInput, { color: colors.text }]}
                      value={editableWeight}
                      onChangeText={setEditableWeight}
                      keyboardType="number-pad"
                      maxLength={4}
                    />
                  </View>
                  <View style={styles.portionButtons}>
                    <TouchableOpacity 
                      style={[styles.portionBtn, { borderColor: colors.border }]} 
                      onPress={() => setEditableWeight((scannedFood.estimatedWeight || 200).toString())}
                    >
                      <Text style={[styles.portionBtnText, { color: colors.text }]}>100%</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.portionBtn, { borderColor: colors.border }]} 
                      onPress={() => setEditableWeight(Math.round((scannedFood.estimatedWeight || 200) / 2).toString())}
                    >
                      <Text style={[styles.portionBtnText, { color: colors.text }]}>50%</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.foodName, { color: colors.text }]}>{scannedFood.name}</Text>
                
                {scannedFood.image != null && scannedFood.image !== '' && (
                  <Image source={{ uri: scannedFood.image }} style={styles.foodImage} resizeMode="cover" />
                )}

                {scannedFood.encyclopedicInfo && (
                  <View style={[styles.encycloCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                    <View style={styles.encycloHeader}>
                      <Ionicons name="school-outline" size={18} color={colors.primary} />
                      <Text style={[styles.encycloTitle, { color: colors.primary }]}>{t('scanner.diaAiInfo')}</Text>
                    </View>
                    <Text style={[styles.encycloText, { color: colors.text }]}>{scannedFood.encyclopedicInfo}</Text>
                  </View>
                )}

                 <View style={styles.actionButtons}>
                   <TouchableOpacity
                     style={[
                       styles.saveRecipeBtn,
                       {
                         backgroundColor: colors.card,
                         borderColor: scannedFood.isAllowed === false ? colors.borderLight : colors.primary,
                         opacity: scannedFood.isAllowed === false ? 0.45 : 1,
                       },
                     ]}
                     onPress={saveAsRecipe}
                     disabled={isSavingToRecipes || scannedFood.isAllowed === false}
                   >
                     <Ionicons
                       name="bookmark-outline"
                       size={20}
                       color={scannedFood.isAllowed === false ? colors.textSecondary : colors.primary}
                     />
                     <Text
                       style={[
                         styles.saveRecipeText,
                         { color: scannedFood.isAllowed === false ? colors.textSecondary : colors.primary },
                       ]}
                     >
                       {t('scanner.saveAsRecipe')}
                     </Text>
                   </TouchableOpacity>
                   
                   <TouchableOpacity style={[styles.primaryButton, { flex: 1, marginLeft: 10 }]} onPress={addToDiary}>
                     <Text style={styles.primaryButtonText}>{t('recipes.addToDiary')}</Text>
                   </TouchableOpacity>
                 </View>
                <View style={styles.nutritionSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 4 }]}>
                    {t('scanner.nutritionInfo')}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12 }}>
                    ({editableWeight}{scannedFood.unit || 'g'} uchun hisoblangan)
                  </Text>
                  
                  <View style={styles.nutritionGrid}>
                    <NutritionBox
                      value={`${Math.round(scannedFood.calories * (parseInt(editableWeight) || 0) / 100)}`}
                      unit="kcal"
                      colors={colors}
                    />
                    <NutritionBox
                      label={t('recipes.sugar')}
                      value={`${Math.round(scannedFood.sugar * (parseInt(editableWeight) || 0) / 100)}`}
                      unit="g"
                      colors={colors}
                    />
                    <NutritionBox
                      label={t('recipes.carbs')}
                      value={`${Math.round(scannedFood.carbs * (parseInt(editableWeight) || 0) / 100)}`}
                      unit="g"
                      colors={colors}
                    />
                    <NutritionBox
                      label={t('recipes.protein')}
                      value={`${Math.round(scannedFood.protein * (parseInt(editableWeight) || 0) / 100)}`}
                      unit="g"
                      colors={colors}
                    />
                  </View>
                </View>

                {scannedFood.description != null && scannedFood.description !== '' && (
                  <View
                    style={[
                      styles.warningCard,
                      {
                        backgroundColor: isDark
                          ? 'rgba(56, 189, 248, 0.1)'
                          : 'rgba(56, 189, 248, 0.05)',
                        borderColor: 'rgba(56, 189, 248, 0.3)',
                      },
                    ]}
                  >
                    <Ionicons name="information-circle-outline" size={24} color={COLORS.secondary} />
                    <View style={styles.warningContent}>
                      <Text style={[styles.warningTitle, { color: COLORS.secondary }]}>
                        {t('scanner.info')}
                      </Text>
                      <Text style={[styles.warningText, { color: colors.text }]}>
                        {scannedFood.description}
                      </Text>
                    </View>
                  </View>
                )}

                {!scannedFood.isAllowed &&
                  scannedFood.reason != null &&
                  scannedFood.reason !== '' && (
                    <View
                      style={[
                        styles.warningCard,
                        {
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          borderColor: 'rgba(239, 68, 68, 0.3)',
                        },
                      ]}
                    >
                      <Ionicons name="warning-outline" size={24} color={COLORS.error} />
                      <View style={styles.warningContent}>
                        <Text style={[styles.warningTitle, { color: COLORS.error }]}>
                          {t('scanner.whyNotRecommended')}
                        </Text>
                        <Text style={[styles.warningText, { color: colors.text }]}>
                          {scannedFood.reason}
                        </Text>
                      </View>
                    </View>
                  )}

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[
                      styles.secondaryButton,
                      {
                        backgroundColor: COLORS.bgCard,
                        borderWidth: 1,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={resetScanner}
                  >
                    <Ionicons name="scan-outline" size={20} color={colors.text} />
                    <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                      {t('scanner.scanAgain')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.secondaryButton, { backgroundColor: colors.primary, flex: 2 }]}
                    onPress={addToDiary}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={COLORS.white} />
                    <Text style={styles.secondaryButtonText}>{t('recipes.addToDiary')}</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ height: 14 }} />
              </>
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

  // ========== CAMERA VIEW WITH CONTROLS ==========
  // SDK 49+: CameraView replaces Camera
  // - 'facing' prop replaces 'type' ('back' | 'front')
  // - 'flash' prop replaces 'flashMode' ('off' | 'on' | 'auto')
  // - 'zoom' prop remains the same
  // - Removed 'whiteBalance' and 'autoFocus' (not supported in SDK 49+)
  // - 'onBarcodeScanned' replaces 'onBarCodeScanned'
  // - 'ratio' prop may not be supported; removed for compatibility
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={styles.cameraContainer}>
      <StatusBar barStyle="light-content" />
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        flash={flashMode}
        zoom={zoom}
        onCameraReady={() => setIsCameraReady(true)}
      />
      <Animated.View style={[styles.cameraOverlay, { opacity: shutterAnim }]}>
        {/* ---- Top Bar: Back, Title, Flash ---- */}
        <View style={styles.cameraHeader}>
          <TouchableOpacity style={styles.backButton} onPress={resetScanner}>
            <Ionicons name="close" size={28} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.cameraTitle}>
            {t('scanner.takePhoto')}
          </Text>
          <TouchableOpacity style={styles.flashButton} onPress={toggleFlash}>
            <Ionicons name={getFlashIcon()} size={24} color={COLORS.white} />
            <Text style={styles.flashLabel}>{getFlashLabel()}</Text>
          </TouchableOpacity>
        </View>

        {/* ---- Photo Capture Area ---- */}
          <View style={styles.captureContainer}>
            {/* Focus crosshair */}
            <View style={styles.focusCrosshair}>
              <View style={styles.focusBracketTL} />
              <View style={styles.focusBracketTR} />
              <View style={styles.focusBracketBL} />
              <View style={styles.focusBracketBR} />
            </View>

            {/* Bottom controls: Zoom + Capture */}
            <View style={styles.captureControls}>
              {/* Zoom controls */}
              <View style={styles.zoomRow}>
                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={zoomOut}
                  disabled={zoom <= 0}
                >
                  <Ionicons
                    name="remove"
                    size={20}
                    color={zoom <= 0 ? 'rgba(255,255,255,0.3)' : COLORS.white}
                  />
                </TouchableOpacity>
                <View style={styles.zoomIndicator}>
                  <Text style={styles.zoomText}>{(1 + zoom * 7).toFixed(1)}x</Text>
                </View>
                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={zoomIn}
                  disabled={zoom >= 1}
                >
                  <Ionicons
                    name="add"
                    size={20}
                    color={zoom >= 1 ? 'rgba(255,255,255,0.3)' : COLORS.white}
                  />
                </TouchableOpacity>
              </View>

              {/* Capture button */}
              <TouchableOpacity
                style={[
                  styles.captureButton,
                  isTakingPicture && styles.captureButtonDisabled,
                ]}
                onPress={takePicture}
                disabled={isTakingPicture || !isCameraReady}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.captureInner,
                    isTakingPicture && styles.captureInnerActive,
                  ]}
                />
              </TouchableOpacity>

              <Text style={styles.scanInstruction}>{t('scanner.takeClearPhoto')}</Text>
            </View>
          </View>

        {/* Barcode bottom controls removed */}
      </Animated.View>
    </View>
    </SafeAreaView>
  );
};

const NutritionBox = ({ label, value, unit, colors }) => (
  <View
    style={[
      styles.nutritionBox,
      { backgroundColor: colors ? `${colors.primary}20` : `${COLORS.primary}20` },
    ]}
  >
    <Text style={[styles.nutritionBoxLabel, colors && { color: colors.textSecondary }]}>
      {label}
    </Text>
    <Text style={[styles.nutritionBoxValue, colors && { color: colors.text }]}>{value}</Text>
    <Text style={[styles.nutritionBoxUnit, colors && { color: colors.textSecondary }]}>{unit}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: SPACING.xl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: FONTS.xxxl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONTS.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  messageText: {
    fontSize: FONTS.lg,
    color: COLORS.white,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  messageSubtext: {
    fontSize: FONTS.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  modeSelection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  modeCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  modeGradient: {
    padding: SPACING.xl,
    alignItems: 'center',
    position: 'relative',
  },
  modeTitle: {
    fontSize: FONTS.xl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  modeDescription: {
    fontSize: FONTS.sm,
    color: COLORS.white,
    opacity: 0.9,
    textAlign: 'center',
  },
  comingSoonBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  comingSoonText: {
    fontSize: FONTS.xs,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.small,
  },
  infoContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  infoTitle: {
    fontSize: FONTS.md,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  infoText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraTitle: {
    fontSize: FONTS.lg,
    fontWeight: 'bold',
    color: COLORS.white,
  },

  // --- Flash Button ---
  flashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashLabel: {
    fontSize: 8,
    color: COLORS.white,
    fontWeight: '700',
    marginTop: 1,
  },

  // --- Scan Area (Barcode) ---
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBox: {
    width: 250,
    height: 250,
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: COLORS.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanLine: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 2,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },
  scanInstruction: {
    fontSize: FONTS.md,
    color: COLORS.white,
    textAlign: 'center',
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },

  // --- Barcode bottom controls ---
  barcodeBotControls: {
    paddingBottom: SPACING.xxxl,
    alignItems: 'center',
  },

  // --- Photo Capture ---
  captureContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  focusCrosshair: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginTop: '25%',
  },
  focusBracketTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 24,
    height: 24,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  focusBracketTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  focusBracketBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 24,
    height: 24,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  focusBracketBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  captureControls: {
    alignItems: 'center',
    paddingBottom: SPACING.xxxl,
  },

  // --- Zoom ---
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  zoomButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomIndicator: {
    paddingHorizontal: SPACING.md,
  },
  zoomText: {
    color: COLORS.white,
    fontSize: FONTS.sm,
    fontWeight: '600',
  },

  // --- Capture Button ---
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: COLORS.white,
  },
  captureInnerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },

  // --- Results ---
  resultCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.large,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  statusText: {
    fontSize: FONTS.lg,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  foodName: {
    fontSize: FONTS.xl,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  foodNameSecondary: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  foodImage: {
    width: '100%',
    height: 200,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  nutritionSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.lg,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  nutritionBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: `${COLORS.primary}20`,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  nutritionBoxLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  nutritionBoxValue: {
    fontSize: FONTS.xl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  nutritionBoxUnit: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
  },
  giCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: `${COLORS.secondary}20`,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  giLabel: {
    fontSize: FONTS.md,
    color: COLORS.white,
    fontWeight: '600',
  },
  giValue: {
    fontSize: FONTS.xl,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.error}20`,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: `${COLORS.error}40`,
  },
  warningContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  warningTitle: {
    fontSize: FONTS.md,
    fontWeight: '600',
    color: COLORS.error,
    marginBottom: SPACING.xs,
  },
  warningText: {
    fontSize: FONTS.sm,
    color: COLORS.white,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
    ...SHADOWS.medium,
  },
  primaryButtonText: {
    fontSize: FONTS.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    minWidth: 150,
  },
  secondaryButtonText: {
    fontSize: FONTS.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  timeInput: {
    width: 80,
    height: 75,
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 38,
    fontWeight: '800',
    textAlign: 'center',
  },
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  weightLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  weightInput: { fontSize: 28, fontWeight: '800' },
  portionButtons: { flexDirection: 'row', gap: 8 },
  portionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  portionBtnText: { fontSize: 13, fontWeight: '700' },
  encycloCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: SPACING.lg,
  },
  encycloHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.xs,
  },
  encycloTitle: {
    fontSize: FONTS.sm,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  encycloText: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  saveRecipeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  saveRecipeText: {
    fontSize: FONTS.sm,
    fontWeight: '600',
  },
});

export default FoodScannerScreen;
