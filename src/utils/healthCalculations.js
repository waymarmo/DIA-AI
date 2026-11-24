/**
 * Health Calculations Utility
 * Provides functions for calculating BMI, daily calorie needs, and water intake
 * Based on WHO guidelines and Harris-Benedict formula
 */

/**
 * Calculate BMI (Body Mass Index)
 * Formula: weight (kg) / (height (m))^2
 * WHO Classification:
 * - Underweight: < 18.5
 * - Normal: 18.5 - 24.9
 * - Overweight: 25 - 29.9
 * - Obese: >= 30
 */
export const calculateBMI = (weight, height) => {
    if (!weight || !height || weight <= 0 || height <= 0) {
        return null;
    }

    const heightInMeters = height / 100; // Convert cm to meters
    const bmi = weight / (heightInMeters * heightInMeters);
    return parseFloat(bmi.toFixed(1));
};

/**
 * Get BMI category based on WHO standards
 */
export const getBMICategory = (bmi) => {
    if (!bmi) return { category: 'Unknown', color: '#999999', uz: 'Noma\'lum' };

    if (bmi < 18.5) {
        return { category: 'Underweight', color: '#FFA500', uz: 'Og\'irlik yetarli emas' };
    } else if (bmi >= 18.5 && bmi < 25) {
        return { category: 'Normal', color: '#4CAF50', uz: 'Normal' };
    } else if (bmi >= 25 && bmi < 30) {
        return { category: 'Overweight', color: '#FF9800', uz: 'Ortiqcha vazn' };
    } else {
        return { category: 'Obese', color: '#F44336', uz: 'Semizlik' };
    }
};

/**
 * Calculate daily calorie needs using Harris-Benedict Equation (Revised)
 * 
 * BMR (Basal Metabolic Rate):
 * Men: BMR = 88.362 + (13.397 × weight in kg) + (4.799 × height in cm) - (5.677 × age in years)
 * Women: BMR = 447.593 + (9.247 × weight in kg) + (3.098 × height in cm) - (4.330 × age in years)
 * 
 * TDEE (Total Daily Energy Expenditure) = BMR × Activity Factor:
 * - Sedentary (little to no exercise): BMR × 1.2
 * - Lightly Active (light exercise 1-3 days/week): BMR × 1.375
 * - Moderately Active (moderate exercise 3-5 days/week): BMR × 1.55
 * - Very Active (hard exercise 6-7 days/week): BMR × 1.725
 * - Extra Active (very hard exercise, physical job): BMR × 1.9
 */
export const calculateDailyCalories = (weight, height, age, gender, activityLevel) => {
    if (!weight || !height || !age || !gender || !activityLevel) {
        return null;
    }

    let bmr;

    // Calculate BMR based on gender
    if (gender === 'male') {
        bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
        bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }

    // Activity level multipliers
    const activityMultipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        veryActive: 1.9,
    };

    const multiplier = activityMultipliers[activityLevel] || 1.2;
    const tdee = bmr * multiplier;

    return Math.round(tdee);
};

/**
 * Calculate recommended daily water intake
 * Basic formula: weight (kg) × 30-35 ml
 * We use 33 ml as the average
 */
export const calculateWaterIntake = (weight, activityLevel) => {
    if (!weight) return null;

    let baseWater = weight * 33; // Base: 33ml per kg

    // Add extra water for higher activity levels
    const activityBonus = {
        sedentary: 0,
        light: 250,
        moderate: 500,
        active: 750,
        veryActive: 1000,
    };

    const bonus = activityBonus[activityLevel] || 0;
    const totalWater = baseWater + bonus;

    return Math.round(totalWater / 1000 * 10) / 10; // Convert to liters, round to 1 decimal
};

/**
 * Get activity level display name in Uzbek
 */
export const getActivityLevelName = (activityLevel) => {
    const names = {
        sedentary: 'Kam harakatli',
        light: 'Yengil faol',
        moderate: 'O\'rtacha faol',
        active: 'Juda faol',
        veryActive: 'Ekstremal faol',
    };

    return names[activityLevel] || 'Noma\'lum';
};

/**
 * Calculate ideal weight range based on height (using BMI 18.5-24.9)
 */
export const getIdealWeightRange = (height) => {
    if (!height) return null;

    const heightInMeters = height / 100;
    const minWeight = 18.5 * (heightInMeters * heightInMeters);
    const maxWeight = 24.9 * (heightInMeters * heightInMeters);

    return {
        min: Math.round(minWeight),
        max: Math.round(maxWeight),
    };
};

/**
 * Macronutrient and Diabetes Management Constants
 * Based on ADA 2024 and WHO 2015 guidelines
 * Enhanced with user-provided personalized tables
 */
export const DIABETES_GUIDELINES = {
    GLUCOSE: {
        FASTING: { min: 4.4, max: 7.2, unit: 'mmol/L' },
        POST_PRANDIAL: { max: 10.0, unit: 'mmol/L' },
        BEFORE_BED: { min: 5.0, max: 8.3, unit: 'mmol/L' }
    },
    HBA1C: {
        ADULT: 7.0, // < 7.0%
        ELDERLY: 8.0, // < 7.5-8.0%
        CHILD: 7.0 // < 7.0%
    },
    SUGAR: {
        IDEAL: 25, // <= 25g/day
        LIMIT: 50  // < 10% of energy
    },
    CARBS: {
        RANGE_G: { min: 130, max: 200 }, // Default, but personalized is preferred
        XE_CONVERSION: 12, // 1 XE = 12g Carbs
        XE_RANGE: { min: 15, max: 20 }
    }
};

/**
 * Calculate personalized carbohydrate and sugar goals
 * Based on gender, weight, activity level, and BMI
 */
export const calculatePersonalizedCarbGoals = (userData) => {
    const { gender = 'male', weight = 70, height = 170, activityLevel = 'sedentary' } = userData || {};
    const bmi = calculateBMI(weight, height);
    
    // Base goals from provided tables
    let carbGoal = { min: 130, max: 150 };
    let sugarGoal = { min: 0, max: 15 };
    
    if (gender === 'male') {
        if (activityLevel === 'sedentary') {
            carbGoal = { min: 130, max: 150 };
            sugarGoal = { min: 0, max: 15 };
        } else if (activityLevel === 'moderate' || activityLevel === 'light') {
            carbGoal = { min: 150, max: 200 };
            sugarGoal = { min: 15, max: 20 };
        } else { // active or veryActive
            carbGoal = { min: 200, max: 250 };
            sugarGoal = { min: 20, max: 30 };
        }
    } else { // female
        if (activityLevel === 'sedentary') {
            carbGoal = { min: 100, max: 120 };
            sugarGoal = { min: 0, max: 10 };
        } else if (activityLevel === 'moderate' || activityLevel === 'light') {
            carbGoal = { min: 130, max: 150 };
            sugarGoal = { min: 10, max: 15 };
        } else { // active or veryActive
            carbGoal = { min: 150, max: 180 };
            sugarGoal = { min: 15, max: 20 };
        }
    }
    
    // BMI Adjustment: If BMI > 25 (Overweight/Obese), cap carbs
    if (bmi && bmi > 25) {
        carbGoal = { min: 100, max: 130 };
    }
    
    // Formula weight-based validation (safety check/fine-tuning)
    // Sedentary: 1.5 - 2 g/kg, Active: 3 - 4 g/kg
    const formulaMultiplier = (activityLevel === 'active' || activityLevel === 'veryActive') ? 3.5 : 1.75;
    const formulaGoal = weight * formulaMultiplier;
    
    // We average the table goal with the weight formula for a more personalized "Max"
    const personalizedMaxCarbs = Math.round((carbGoal.max + formulaGoal) / 2);
    
    return {
        carbsG: {
            min: carbGoal.min,
            max: personalizedMaxCarbs, // Use averaged value for better personalization
            target: Math.round((carbGoal.min + personalizedMaxCarbs) / 2)
        },
        sugarG: {
            min: sugarGoal.min,
            max: sugarGoal.max,
            target: sugarGoal.max
        },
        bmi,
        bmiCategory: getBMICategory(bmi)
    };
};

/**
 * Convert Carbohydrates in grams to Bread Units (XE)
 */
export const carbsToXE = (carbsGrams) => {
    if (!carbsGrams || carbsGrams < 0) return 0;
    return parseFloat((carbsGrams / DIABETES_GUIDELINES.CARBS.XE_CONVERSION).toFixed(1));
};

/**
 * Get Glucose Status based on type and value
 */
export const getGlucoseStatus = (value, type = 'fasting') => {
    if (!value) return { status: 'Unknown', color: '#999999', uz: 'Noma\'lum' };

    const targets = DIABETES_GUIDELINES.GLUCOSE;
    let min, max;

    if (type === 'fasting') {
        min = targets.FASTING.min;
        max = targets.FASTING.max;
    } else if (type === 'postprandial') {
        min = null;
        max = targets.POST_PRANDIAL.max;
    } else {
        min = targets.BEFORE_BED.min;
        max = targets.BEFORE_BED.max;
    }

    if (min !== null && value < min) {
        return { status: 'Low', color: '#FF9800', uz: 'Past' };
    } else if (value > max) {
        return { status: 'High', color: '#F44336', uz: 'Baland' };
    } else {
        return { status: 'Normal', color: '#4CAF50', uz: 'Me\'yor' };
    }
};

/**
 * Calculate macronutrient distribution for diabetes management
 * Based on ADA (American Diabetes Association) recommendations:
 * - Carbs: 45-50% of total calories (User target: 180-250g)
 * - Protein: 15-20% of total calories
 * - Fat: 30-35% of total calories
 */
export const calculateMacros = (dailyCalories) => {
    if (!dailyCalories) return null;

    return {
        carbs: {
            grams: Math.round((dailyCalories * 0.475) / 4), // 47.5% average, 4 cal/g
            calories: Math.round(dailyCalories * 0.475),
            percentage: 47.5,
        },
        protein: {
            grams: Math.round((dailyCalories * 0.175) / 4), // 17.5% average, 4 cal/g
            calories: Math.round(dailyCalories * 0.175),
            percentage: 17.5,
        },
        fat: {
            grams: Math.round((dailyCalories * 0.35) / 9), // 35% average, 9 cal/g
            calories: Math.round(dailyCalories * 0.35),
            percentage: 35,
        },
    };
};
