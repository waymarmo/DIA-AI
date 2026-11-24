import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  Modal, Image, StatusBar, Animated, FlatList,
  ScrollView, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SPACING, FONTS, RADIUS, SHADOWS } from '../constants/theme';
import recipesData from '../data/recipes.json';
import foodGuideData from '../data/foodGuide.json';
import medicationsData from '../data/medications.json';
import { saveMeal, getCustomRecipes, getData, setData } from '../utils/storage';
import { scheduleCustomMealNotification } from '../services/NotificationService';
import { useTheme } from '../context/ThemeContext';
import { getDiseaseConfig } from '../utils/diseaseConfig';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;

const BG = '#F4F6F5';
const WHITE = '#FFFFFF';
const GREEN = '#28A745';
const GREEN_LIGHT = '#E8F5E9';

/* ─── Mini Recipe Card for grid ─── */
const RecipeCard = ({ item, isFavorite, onFavorite, onPress, colors }) => {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  useEffect(() => {
    setImgError(false);
  }, [item?.image]);
  return (
    <TouchableOpacity style={[gs.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]} onPress={onPress} activeOpacity={0.88}>
      {item.image && !imgError ? (
        <Image
          source={{ uri: item.image }}
          style={gs.img}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <View style={[gs.img, gs.imgPlaceholder]}>
          <Ionicons name="restaurant-outline" size={36} color="#bbb" />
        </View>
      )}

      {/* Traffic Light Indicator */}
      {item.trafficLight && (
        <View style={[gs.trafficBadge, { backgroundColor: item.trafficLight === 'green' ? GREEN : (item.trafficLight === 'red' ? '#E53935' : '#FB923C') }]} />
      )}

      {/* Favourite button */}
      <TouchableOpacity style={[gs.favBtn, { backgroundColor: colors.iconBg }]} onPress={onFavorite} activeOpacity={0.8}>
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={16}
          color={isFavorite ? '#E53935' : colors.textSecondary}
        />
      </TouchableOpacity>

      <View style={gs.cardBody}>
        <Text style={[gs.cardTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
        <View style={gs.infoRow}>
          <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
          <Text style={[gs.infoTxt, { color: colors.textSecondary }]}>{item.time} {t('recipes.min') || 'min'}</Text>
          <Ionicons name="flame-outline" size={12} color={colors.textSecondary} style={{ marginLeft: 6 }} />
          <Text style={[gs.infoTxt, { color: colors.textSecondary }]}>{item.calories} {t('recipes.kcal') || 'kcal'}</Text>
        </View>
        <View style={gs.cardFooter}>
            <Text style={gs.sugarTxt}>{t('recipes.sugar')}: {item.sugar}g</Text>
            {Boolean(item.gi) && <View style={[gs.giBadge, { backgroundColor: item.gi === 'low' ? `${GREEN}15` : '#FFF3E0' }]}>
                <Text style={[gs.giText, { color: item.gi === 'low' ? GREEN : '#EF6C00' }]}>GI: {item.gi}</Text>
            </View>}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const RecipesScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const normLang = (i18n.language || 'uz').toLowerCase();
  const isEn = normLang.startsWith('en');
  const isRu = normLang.startsWith('ru');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState(new Date().getHours().toString());
  const [selectedMin, setSelectedMin] = useState(new Date().getMinutes().toString());
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [portionScale, setPortionScale] = useState(1); // 1 = Full, 0.5 = Half
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [customRecipes, setCustomRecipes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [diseaseConfig, setDiseaseConfig] = useState(getDiseaseConfig('Diabet'));
  const [diseaseOnlyFilter, setDiseaseOnlyFilter] = useState(false);
  const [selectedDiseaseMedFilter, setSelectedDiseaseMedFilter] = useState('all');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const minInputRef = useRef(null);

  const loadCustomRecipes = async () => {
    const [recipes, storedDisease] = await Promise.all([
      getCustomRecipes(),
      getData('primaryDisease')
    ]);
    setCustomRecipes(recipes);
    const conf = getDiseaseConfig(storedDisease || 'Diabet');
    setDiseaseConfig(conf);
    if (conf?.medications?.diseaseKey) {
      setSelectedDiseaseMedFilter(conf.medications.diseaseKey);
    }
  };

  useEffect(() => {
    loadCustomRecipes();
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (selectedRecipe) setPortionScale(1);
  }, [selectedRecipe]);

  useFocusEffect(
    React.useCallback(() => {
      loadCustomRecipes();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCustomRecipes();
    setRefreshing(false);
  };

  const categories = [
    { id: 'all',         name: t('recipes.all'),      icon: 'apps-outline' },
    { id: 'foodGuide',   name: t('recipes.products'), icon: 'list-circle-outline' },
    { id: 'nonushta',    name: t('recipes.breakfast'),icon: 'sunny-outline' },
    { id: 'tushlik',     name: t('recipes.lunch'),    icon: 'restaurant-outline' },
    { id: 'kechki_ovqat',name: t('recipes.dinner'),   icon: 'moon-outline' },
    { id: 'gazak',       name: t('recipes.snack'),    icon: 'leaf-outline' },
  ];

  const filteredRecipes = useMemo(() => {
    if (selectedCategory === 'foodGuide') return [];
    
    const activeLang = i18n.language || 'uz';
    const langSuffix = activeLang === 'ru' ? 'Ru' : activeLang === 'en' ? 'En' : 'Uz';
    
    let base = [...recipesData, ...customRecipes].map(r => {
      const resolvedTitle = activeLang === 'ru' && r.titleRu ? r.titleRu : (activeLang === 'en' && r.titleEn ? r.titleEn : r.title);
      const resolvedIngredients = r[`ingredients${langSuffix}`] || r.ingredientsUz || r.ingredients || [];
      const resolvedInstructions = r[`instructions${langSuffix}`] || r.instructionsUz || r.instructions || '';
      const resolvedCategory = activeLang === 'ru' && r.categoryRu ? r.categoryRu : (activeLang === 'en' && r.categoryEn ? r.categoryEn : r.category);
      const resolvedDifficulty = activeLang === 'ru' && r.difficultyRu ? r.difficultyRu : (activeLang === 'en' && r.difficultyEn ? r.difficultyEn : r.difficulty);
      
      return {
        ...r,
        title: resolvedTitle,
        ingredients: resolvedIngredients,
        instructions: resolvedInstructions,
        categoryDisplay: resolvedCategory,
        difficultyDisplay: resolvedDifficulty,
      };
    });
    
    if (selectedCategory !== 'all') {
      base = base.filter(r => r.category === selectedCategory);
    }
    if (favoritesOnly) {
      base = base.filter(r => favorites.includes(r.id));
    }
    if (diseaseOnlyFilter && diseaseConfig?.key) {
      const targetKey = diseaseConfig.key;
      base = base.filter(r => !r.forDisease || r.forDisease.includes(targetKey));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      base = base.filter(r => 
        r.title.toLowerCase().includes(q) || 
        r.ingredients?.some(i => i.toLowerCase().includes(q))
      );
    }
    
    return base.map(r => {
        if (r.trafficLight) return r;
        const s = parseFloat(r.sugar) || 0;
        const g = (r.gi || 'low').toLowerCase();
        let tl = 'yellow';
        if (s < 5 && g === 'low') tl = 'green';
        else if (s > 12 || g === 'high') tl = 'red';
        return { ...r, trafficLight: tl };
    });
  }, [selectedCategory, searchQuery, favoritesOnly, favorites, customRecipes, i18n.language]);

  const filteredFoodGuide = useMemo(() => {
    if (selectedCategory !== 'foodGuide') return null;
    
    const query = searchQuery.toLowerCase();
    const result = {};
    const activeLang = i18n.language || 'uz';
    const langSuffix = activeLang === 'ru' ? 'Ru' : activeLang === 'en' ? 'En' : 'Uz';
    
    ['green', 'yellow', 'red'].forEach(key => {
      const section = foodGuideData[key];
      const sectionTitle = section[`title${langSuffix}`] || section.titleUz || section.title || '';
      const sectionDesc = section[`description${langSuffix}`] || section.descriptionUz || section.description || '';
      
      const items = section.items.filter(item => {
        const nameVal = item[`name${langSuffix}`] || item.nameUz || '';
        const catVal = item[`category${langSuffix}`] || item.categoryUz || '';
        return nameVal.toLowerCase().includes(query) || catVal.toLowerCase().includes(query);
      }).map(item => ({
        ...item,
        name: item[`name${langSuffix}`] || item.nameUz || '',
        category: item[`category${langSuffix}`] || item.categoryUz || ''
      }));
      
      if (items.length > 0) {
        result[key] = { 
          title: sectionTitle, 
          description: sectionDesc, 
          items 
        };
      }
    });
    
    return result;
  }, [selectedCategory, searchQuery, i18n.language]);

  const toggleFavorite = id => {
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAddPress = () => {
    setShowTimePicker(true);
  };

  const addRecipeToDiary = async (isScheduled = false) => {
    if (!selectedRecipe) return;
    let targetDate = new Date();
    if (isScheduled) {
       let h = parseInt(selectedHour);
       let m = parseInt(selectedMin);
       if (isNaN(h)) h = targetDate.getHours();
       if (isNaN(m)) m = targetDate.getMinutes();
       targetDate.setHours(h, m, 0, 0);
    }

    const meal = {
      name: portionScale === 0.5 ? `${selectedRecipe.title} (${t('recipes.halfPorsiya')})` : selectedRecipe.title,
      calories: Math.round(selectedRecipe.calories * portionScale) || 0,
      sugar: Math.round(selectedRecipe.sugar * portionScale) || 0,
      carbs: Math.round(selectedRecipe.carbs * portionScale) || 0,
      protein: Math.round(selectedRecipe.protein * portionScale) || 0,
      fat: Math.round(selectedRecipe.fat * portionScale) || 0,
      image: selectedRecipe.image,
      amount: selectedRecipe.servingSize ? Math.round(selectedRecipe.servingSize * portionScale) : (portionScale === 1 ? 1 : 0.5),
      unit: selectedRecipe.servingSize ? (selectedRecipe.unit || 'g') : 'porsiya',
      timestamp: targetDate.toISOString(),
      completed: true,
    };

    try {
      const ok = await saveMeal(meal);
      if (ok) {
        await setData('mealsChangedAt', Date.now().toString());
        if (isScheduled) {
          let notifDate = new Date(targetDate.getTime());
          if (notifDate <= new Date()) {
             notifDate.setDate(notifDate.getDate() + 1);
          }
          await scheduleCustomMealNotification(
             t('notifications.mealTimeTitle'),
             t('notifications.mealTimeBody', { name: meal.name }),
             notifDate,
             meal.name
          );
          Alert.alert(
            t('common.success'), 
            i18n.language?.startsWith('en') 
              ? 'Meal scheduled and reminder set! It has been recorded to your health stats.'
              : (i18n.language?.startsWith('ru')
                ? 'Блюдо запланировано, напоминание установлено! Показатели учтены.'
                : 'Taom eslatmasi o\'rnatildi va sog\'liq ko\'rsatkichlaringizga kiritildi.'),
            [{ text: 'OK', onPress: () => { setShowTimePicker(false); setSelectedRecipe(null); } }]
          );
        } else {
          Alert.alert(
            t('common.success'),
            i18n.language?.startsWith('en')
              ? `🍽️ "${meal.name}" added to your diary! Calories (${meal.calories} kcal) and Sugar (${meal.sugar}g) updated on Dashboard & Reports.`
              : (i18n.language?.startsWith('ru')
                ? `🍽️ "${meal.name}" съедено и сохранено в дневник! Калории (${meal.calories} ккал) и сахар (${meal.sugar} г) обновлены в отчётах.`
                : `🍽️ "${meal.name}" iste'mol qilinganlar safiga kiritildi! Kaloriya (${meal.calories} kkal) va shakar (${meal.sugar} g) hisobotlarda aks etdi.`),
            [{ text: 'OK', onPress: () => { setShowTimePicker(false); setSelectedRecipe(null); } }]
          );
        }
      } else {
        Alert.alert(t('common.error'), t('common.tryAgain'));
      }
    } catch (err) {
      console.warn(err);
      Alert.alert(t('common.error'), t('recipes.reminderError'));
    }
  };

  /* ─── Detail Modal ─── */
  const DetailModal = () => {
    if (!selectedRecipe) return null;
    const r = selectedRecipe;
    
    const renderRecipeInfo = () => (
      <ScrollView showsVerticalScrollIndicator={false}>
        <RecipeImage uri={r.image} colors={colors} style={ms.img} iconSize={56} />
        <TouchableOpacity style={[ms.closeBtn, { backgroundColor: colors.iconBg }]} onPress={() => setSelectedRecipe(null)}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={ms.body}>
          <Text style={[ms.title, { color: colors.text }]}>{r.title}</Text>
          {i18n.language === 'uz' && r.titleRu ? <Text style={[ms.titleRu, { color: colors.textSecondary }]}>{r.titleRu}</Text> : null}

          <View style={[ms.statsRow, { backgroundColor: colors.iconBg }]}>
            <View style={ms.statItem}>
              <Ionicons name="time-outline" size={18} color={GREEN} />
              <Text style={[ms.statTxt, { color: colors.text }]}>{r.time} {t('recipes.min')}</Text>
            </View>
            <View style={ms.statItem}>
              <Ionicons name="flame-outline" size={18} color={GREEN} />
              <Text style={[ms.statTxt, { color: colors.text }]}>{r.calories} {t('recipes.kcal')}</Text>
            </View>
            <View style={ms.statItem}>
              <Ionicons name="people-outline" size={18} color={GREEN} />
              <Text style={[ms.statTxt, { color: colors.text }]}>{r.servings} {t('recipes.porsiya')}</Text>
            </View>
          </View>

          <View style={[ms.nutritionCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <Text style={[ms.secTitle, { color: colors.text }]}>{t('recipes.portionSelect')}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <TouchableOpacity 
                style={[ms.portionBtn, { flex: 1, backgroundColor: portionScale === 1 ? GREEN : colors.iconBg, borderColor: portionScale === 1 ? GREEN : colors.borderLight }]}
                onPress={() => setPortionScale(1)}
              >
                <Text style={[ms.portionBtnTxt, { color: portionScale === 1 ? '#fff' : colors.text }]}>1 {t('recipes.porsiya')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[ms.portionBtn, { flex: 1, backgroundColor: portionScale === 0.5 ? GREEN : colors.iconBg, borderColor: portionScale === 0.5 ? GREEN : colors.borderLight }]}
                onPress={() => setPortionScale(0.5)}
              >
                <Text style={[ms.portionBtnTxt, { color: portionScale === 0.5 ? '#fff' : colors.text }]}>{t('recipes.halfPorsiya')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={[ms.secTitle, { color: colors.text, fontSize: 14 }]}>{t('recipes.nutritionTitle')} ({portionScale} {t('recipes.porsiya')})</Text>
            <View style={ms.nutRow}>
              <NutItem label={t('recipes.sugar')} value={`${Math.round(r.sugar * portionScale)}g`} />
              <NutItem label={t('recipes.carbs')} value={`${Math.round(r.carbs * portionScale)}g`} />
            </View>
            <View style={ms.nutRow}>
              <NutItem label={t('recipes.protein')} value={`${Math.round(r.protein * portionScale)}g`} />
              <NutItem label={t('recipes.fat')} value={`${Math.round(r.fat * portionScale)}g`} />
            </View>
          </View>

          {/* Action Buttons: Eat Now + Schedule Reminder */}
          <View style={{ gap: 10, marginVertical: 14 }}>
            <TouchableOpacity 
              style={[ms.addBtn, { backgroundColor: GREEN }]} 
              onPress={() => addRecipeToDiary(false)} 
              activeOpacity={0.85}
            >
              <Ionicons name="restaurant" size={20} color="#fff" />
              <Text style={ms.addBtnTxt}>
                {i18n.language?.startsWith('en') ? '🍽️ Eat Now (Log to Diary)' : (i18n.language?.startsWith('ru') ? '🍽️ Съел(а) сейчас (В дневник)' : '🍽️ Hozir iste\'mol qildim')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[ms.addBtn, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: GREEN }]} 
              onPress={handleAddPress} 
              activeOpacity={0.85}
            >
              <Ionicons name="alarm-outline" size={20} color={GREEN} />
              <Text style={[ms.addBtnTxt, { color: GREEN }]}>
                {i18n.language?.startsWith('en') ? '⏰ Schedule Meal Reminder' : (i18n.language?.startsWith('ru') ? '⏰ Напомнить о приеме' : '⏰ Eslatish vaqtini belgilash')}
              </Text>
            </TouchableOpacity>
          </View>

          {r.ingredients?.length > 0 && (
            <View style={ms.section}>
              <Text style={[ms.secTitle, { color: colors.text }]}>{t('recipes.ingredientsTitle')}</Text>
              {r.ingredients.map((ing, i) => (
                <View key={i} style={ms.ingRow}>
                  <View style={ms.bullet} />
                  <Text style={[ms.ingTxt, { color: colors.textSecondary }]}>{ing}</Text>
                </View>
              ))}
            </View>
          )}

          {r.instructions && (
            <View style={ms.section}>
              <Text style={[ms.secTitle, { color: colors.text }]}>{t('recipes.instructionsTitle')}</Text>
              <Text style={[ms.instrTxt, { color: colors.textSecondary }]}>
                {r.instructions.replace(/\\n/g, '\n')}
              </Text>
            </View>
          )}

          <View style={{ gap: 10, marginTop: 16 }}>
            <TouchableOpacity 
              style={[ms.addBtn, { backgroundColor: GREEN }]} 
              onPress={() => addRecipeToDiary(false)} 
              activeOpacity={0.85}
            >
              <Ionicons name="restaurant" size={20} color="#fff" />
              <Text style={ms.addBtnTxt}>
                {i18n.language?.startsWith('en') ? '🍽️ Eat Now (Log to Diary)' : (i18n.language?.startsWith('ru') ? '🍽️ Съел(а) сейчас (В дневник)' : '🍽️ Hozir iste\'mol qildim')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[ms.addBtn, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: GREEN }]} 
              onPress={handleAddPress} 
              activeOpacity={0.85}
            >
              <Ionicons name="alarm-outline" size={20} color={GREEN} />
              <Text style={[ms.addBtnTxt, { color: GREEN }]}>
                {i18n.language?.startsWith('en') ? '⏰ Schedule Meal Reminder' : (i18n.language?.startsWith('ru') ? '⏰ Напомнить о приеме' : '⏰ Eslatish vaqtini belgilash')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );

    const renderTimePicker = () => (
      <View style={{ padding: 24, paddingBottom: 40, alignItems: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>{t('recipes.chooseTime')}</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
          {t('recipes.chooseTimeDesc')}
        </Text>

        <View style={{ marginBottom: 32, backgroundColor: isDark ? '#333' : '#f0f0f0', borderRadius: 12, padding: 8, width: '100%' }}>
            <DateTimePicker
              value={(() => {
                let d = new Date();
                d.setHours(parseInt(selectedHour) || 0);
                d.setMinutes(parseInt(selectedMin) || 0);
                return d;
              })()}
              mode="time"
              is24Hour={true}
              display="spinner"
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setSelectedHour(String(selectedDate.getHours()).padStart(2, '0'));
                  setSelectedMin(String(selectedDate.getMinutes()).padStart(2, '0'));
                }
              }}
              textColor={colors.text}
              themeVariant={isDark ? "dark" : "light"}
              style={{ height: 120, width: '100%' }}
            />
        </View>

        <TouchableOpacity 
          style={[ms.addBtn, { width: '100%' }]} 
          onPress={() => addRecipeToDiary(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="notifications" size={20} color="#fff" />
          <Text style={ms.addBtnTxt}>{t('recipes.setTime')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={{ paddingVertical: 14, marginTop: 8 }} 
          onPress={() => addRecipeToDiary(false)}
        >
          <Text style={{ fontSize: 15, color: GREEN, fontWeight: '600' }}>{t('recipes.eatNowBtn')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={{ paddingVertical: 14, position: 'absolute', top: 10, right: 10 }} 
          onPress={() => setShowTimePicker(false)}
        >
          <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    );

    return (
      <Modal visible transparent animationType="slide" onRequestClose={() => { setShowTimePicker(false); setSelectedRecipe(null); }}>
        <View style={[ms.overlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
          <View style={[ms.sheet, { backgroundColor: colors.modalBg }]}>
            {showTimePicker ? renderTimePicker() : renderRecipeInfo()}
          </View>
        </View>
      </Modal>
    );
  };

  const NutItem = ({ label, value }) => (
    <View style={ms.nutItem}>
      <Text style={[ms.nutLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={ms.nutValue}>{value}</Text>
    </View>
  );

return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>

        {/* ─── Header ─── */}
        <View style={s.header}>
          <View style={{ width: 40 }} />
          <Text style={[s.headerTitle, { color: colors.text }]}>{t('recipes.title')}</Text>
          <TouchableOpacity 
             style={[s.iconBtn, favoritesOnly && { backgroundColor: `${GREEN}20`, borderRadius: 10 }]} 
             onPress={() => setFavoritesOnly(!favoritesOnly)}
          >
            <Ionicons name={favoritesOnly ? "heart" : "heart-outline"} size={24} color={favoritesOnly ? '#E53935' : colors.text} />
          </TouchableOpacity>
        </View>

        {/* ─── Search ─── */}
        <View style={[s.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.borderLight }]}>
          <Ionicons name="search" size={20} color={GREEN} style={{ marginRight: 8 }} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            placeholder={t('recipes.searchPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#bbb" />
            </TouchableOpacity>
          )}
        </View>

        {/* ─── Kasallikka xos tavsiya etilgan parhez banneri ─── */}
        {diseaseConfig?.diet && (
          <View style={{
            marginHorizontal: 16,
            marginTop: 4,
            marginBottom: 10,
            padding: 12,
            borderRadius: 16,
            backgroundColor: `${diseaseConfig.color || '#00E676'}12`,
            borderWidth: 1,
            borderColor: `${diseaseConfig.color || '#00E676'}35`,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="nutrition" size={16} color={diseaseConfig.color || '#00E676'} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                  {isEn ? (diseaseConfig.diet.nameEn || diseaseConfig.diet.name) : (isRu ? diseaseConfig.diet.nameRu : diseaseConfig.diet.name)}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                {isEn ? (diseaseConfig.diet.tipEn || diseaseConfig.diet.tipUz) : (isRu ? diseaseConfig.diet.tipRu : diseaseConfig.diet.tipUz)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setDiseaseOnlyFilter(!diseaseOnlyFilter)}
              style={{
                backgroundColor: diseaseOnlyFilter ? (diseaseConfig.color || '#00E676') : (isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'),
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 12
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: diseaseOnlyFilter ? '#000' : colors.text }}>
                {diseaseOnlyFilter ? (isEn ? 'Diet Only' : (isRu ? 'Диета' : 'Faqat parhez')) : (isEn ? 'All' : (isRu ? 'Все' : 'Barchasi'))}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Filter Chips ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipScroll}
          contentContainerStyle={s.chipContent}
        >
          {categories.map(cat => {
            const isActive = selectedCategory === cat.id;
            const activeBg = cat.id === 'foodGuide' ? '#6200EE' : GREEN;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  s.chip,
                  { borderColor: colors.borderLight, backgroundColor: colors.card },
                  isActive && { backgroundColor: activeBg, borderColor: 'transparent' },
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Ionicons
                  name={cat.icon}
                  size={15}
                  color={isActive ? '#fff' : colors.textSecondary}
                />
                <Text style={[
                  s.chipTxt,
                  { color: isActive ? '#fff' : colors.textSecondary, marginLeft: 5 },
                ]}>{cat.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedCategory === 'foodGuide' ? (
            /* Food Guide View */
            <ScrollView style={s.foodGuideContainer} showsVerticalScrollIndicator={false}>
                {filteredFoodGuide && Object.keys(filteredFoodGuide).length > 0 ? (
                    ['green', 'yellow', 'red'].map(key => {
                        const section = filteredFoodGuide[key];
                        if (!section) return null;
                        const color = key === 'green' ? GREEN : (key === 'red' ? '#E53935' : '#FB923C');
                        return (
                            <View key={key} style={s.guideSection}>
                                <View style={[s.sectionHeader, { borderLeftColor: color }]}>
                                    <Text style={[s.sectionTitle, { color: colors.text }]}>{section.title}</Text>
                                    <Text style={[s.sectionDesc, { color: colors.textSecondary }]}>{section.description}</Text>
                                </View>
                                <View style={s.guideGrid}>
                                    {section.items.map((item, idx) => (
                                        <View key={idx} style={[s.guideItem, { backgroundColor: colors.card }]}>
                                            <View style={[s.guideDot, { backgroundColor: color }]} />
                                            <View style={{ flex: 1 }}>
                                              <Text style={[s.itemName, { color: colors.text }]}>{item.name}</Text>
                                              <Text style={[s.itemCat, { color: colors.textSecondary }]}>{item.category}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        );
                    })
                ) : (
                    <View style={s.emptyBox}>
                      <Ionicons name="search-outline" size={48} color={colors.borderLight} />
                      <Text style={[s.emptyTxt, { color: colors.textSecondary }]}>{t('recipes.noRecipesFound')}</Text>
                    </View>
                )}
            </ScrollView>
        ) : (
            /* Recipes Grid */
            <FlatList
              data={filteredRecipes}
              keyExtractor={item => item.id.toString()}
              numColumns={2}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.grid}
              columnWrapperStyle={s.row}
              refreshing={refreshing}
              onRefresh={onRefresh}
              renderItem={({ item }) => (
                <RecipeCard
                  item={item}
                  isFavorite={favorites.includes(item.id)}
                  onFavorite={() => toggleFavorite(item.id)}
                  onPress={() => setSelectedRecipe(item)}
                  colors={colors}
                />
              )}
              ListEmptyComponent={
                <View style={s.emptyBox}>
                  <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
                  <Text style={[s.emptyTxt, { color: colors.textSecondary }]}>{t('recipes.noRecipesFound')}</Text>
                </View>
              }
              ListFooterComponent={<View style={{ height: 20 }} />}
            />
        )}
      </Animated.View>

      <DetailModal />
    </SafeAreaView>
  );
};

const RecipeImage = ({ uri, colors, style, iconSize = 36 }) => {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [uri]);

  if (!uri || err) {
    return (
      <View style={[style, { backgroundColor: colors.iconBg, alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="restaurant-outline" size={iconSize} color={colors.textSecondary} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
      onError={() => setErr(true)}
    />
  );
};

/* ─── Grid card styles ─── */
const gs = StyleSheet.create({
  card: {
    width: CARD_W,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
  },
  img: { width: '100%', height: 130 },
  imgPlaceholder: { backgroundColor: '#f2f2f2', alignItems: 'center', justifyContent: 'center' },
  favBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { padding: 10 },
  cardTitle: { fontSize: 13.5, fontWeight: '700', marginBottom: 4, lineHeight: 18 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoTxt: { fontSize: 11, marginLeft: 3 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sugarTxt: { color: GREEN, fontSize: 12, fontWeight: '700' },
  trafficBadge: { 
    position: 'absolute', top: 8, left: 8, 
    width: 14, height: 14, borderRadius: 7, 
    borderWidth: 2, borderColor: '#fff' 
  },
  giBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  giText: { fontSize: 10, fontWeight: '800' },
});

/* ─── Screen styles ─── */
const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8, borderRadius: 14, paddingHorizontal: 14, height: 46,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },
  chipScroll: { flexGrow: 0, flexShrink: 0, marginBottom: 10 },
  chipContent: { paddingHorizontal: 16, paddingRight: 20, gap: 8, alignItems: 'center', paddingVertical: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    minHeight: 36,
  },
  chipTxt: { fontSize: 12, fontWeight: '600' },
  chipTxtActive: { color: '#fff', fontSize: 12, fontWeight: '700' },
  grid: { paddingHorizontal: 16, paddingTop: 10 },
  row: { justifyContent: 'space-between' },
  emptyBox: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 },
  emptyTxt: { fontSize: 15, marginTop: 12, textAlign: 'center' },

  // Food Guide Styles
  foodGuideContainer: { flex: 1, padding: 16 },
  guideSection: { marginBottom: 24 },
  sectionHeader: { borderLeftWidth: 4, paddingLeft: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  sectionDesc: { fontSize: 13, lineHeight: 18 },
  guideGrid: { gap: 8 },
  guideItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
    borderRadius: 12, gap: 12,
  },
  guideDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  itemName: { fontSize: 14, fontWeight: '700' },
  itemCat: { fontSize: 12, marginTop: 1 },
});

/* ─── Modal styles ─── */
const ms = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '93%' },
  img: { width: '100%', height: 240, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  closeBtn: {
    position: 'absolute', top: 14, right: 14,
    borderRadius: 20, padding: 8,
  },
  body: { padding: 20 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  titleRu: { fontSize: 14, marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', borderRadius: 14, paddingVertical: 14, marginBottom: 16 },
  statItem: { alignItems: 'center', gap: 4 },
  statTxt: { fontSize: 12, fontWeight: '600' },
  nutritionCard: { borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1 },
  secTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  nutRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  nutItem: { flex: 1, alignItems: 'center' },
  nutLabel: { fontSize: 12, marginBottom: 3 },
  nutValue: { color: GREEN, fontSize: 15, fontWeight: '700' },
  section: { marginBottom: 16 },
  ingRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN, marginRight: 10, marginTop: 6 },
  ingTxt: { fontSize: 14, flex: 1, lineHeight: 20 },
  instrTxt: { fontSize: 14, lineHeight: 22 },
  addBtn: {
    backgroundColor: GREEN, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', borderRadius: 14, paddingVertical: 16,
    gap: 8, marginTop: 8, marginBottom: 4,
  },
  addBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  timeInput: {
    width: 70, height: 65,
    borderRadius: 14, borderWidth: 1,
    fontSize: 32, fontWeight: '800',
    textAlign: 'center',
  },
  portionBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portionBtnTxt: {
    fontSize: 14,
    fontWeight: '700',
  }
});

/* ─── MedModal Styles ─── */
const med = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  hdrLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hdrIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hdrTitle: { fontSize: 18, fontWeight: '700' },
  hdrSub: { fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  warnTxt: {
    flex: 1,
    fontSize: 12,
    color: '#5D4037',
    lineHeight: 18,
  },
  card: {
    borderRadius: 14,
    borderLeftWidth: 4,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  groupTxt: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  drugName: {
    fontSize: 15,
    fontWeight: '700',
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  infoTxt: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  dosePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  doseTxt: {
    fontSize: 12,
    fontWeight: '600',
  },
  notesTxt: {
    fontSize: 12,
    lineHeight: 18,
    marginHorizontal: 12,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  warnRow: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 2,
  },
  warnItem: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#E1F5FE',
    borderRadius: 8,
    padding: 7,
  },
  timeTxt: {
    flex: 1,
    fontSize: 12,
    color: '#01579B',
    fontWeight: '500',
    lineHeight: 17,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 10,
  },
  footerTxt: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});

export default RecipesScreen;

