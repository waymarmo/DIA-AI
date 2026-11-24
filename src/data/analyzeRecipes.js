/**
 * Recipe Health Analysis Script
 * Analyzes all recipes against WHO and ADA diabetes standards
 * Calculates health score (0-100) based on multiple factors
 */

const fs = require('fs');
const path = require('path');

// WHO and ADA Guidelines for Diabetes Management
const GUIDELINES = {
    // ADA recommends <10% of total calories from added sugars
    maxSugarPercent: 10,

    // WHO recommends <10% of total calories from saturated fats
    maxSaturatedFatPercent: 10,

    // ADA recommends <2300mg sodium per day (approximately <767mg per meal)
    maxSodiumPerMeal: 767,

    // WHO recommends minimum 14g fiber per 1000 kcal
    minFiberPer1000kcal: 14,

    // Low GI is preferred for diabetes (GI < 55)
    preferredGI: 'low',

    // Ideal macronutrient ranges (ADA guidelines)
    carbs: { min: 45, max: 50 }, // % of total calories
    protein: { min: 15, max: 20 },
    fat: { min: 30, max: 35 },
};

/**
 * Calculate health score for a recipe (0-100)
 * Based on WHO and ADA diabetes guidelines
 */
function calculateHealthScore(recipe) {
    let score = 100; // Start with perfect score
    const { calories, sugar, carbs, protein, fat, fiber, gi } = recipe;

    // 1. Sugar content (20 points)
    const sugarPercent = (sugar * 4 / calories) * 100;
    if (sugarPercent > GUIDELINES.maxSugarPercent) {
        score -= Math.min(20, (sugarPercent - GUIDELINES.maxSugarPercent) * 2);
    }

    // 2. Fiber content (20 points)
    const fiberPer1000kcal = (fiber / calories) * 1000;
    if (fiberPer1000kcal < GUIDELINES.minFiberPer1000kcal) {
        score -= Math.min(20, (GUIDELINES.minFiberPer1000kcal - fiberPer1000kcal) * 1.5);
    }

    // 3. Glycemic Index (15 points)
    if (gi === 'medium') {
        score -= 7;
    } else if (gi === 'high') {
        score -= 15;
    }

    // 4. Saturated Fat (15 points) - Estimate: ~30% of total fat
    const saturatedFat = fat * 0.3;
    const saturatedFatPercent = (saturatedFat * 9 / calories) * 100;
    if (saturatedFatPercent > GUIDELINES.maxSaturatedFatPercent) {
        score -= Math.min(15, (saturatedFatPercent - GUIDELINES.maxSaturatedFatPercent) * 1.5);
    }

    // 5. Sodium (10 points) - Estimate based on recipe type
    const estimatedSodium = estimateSodium(recipe);
    if (estimatedSodium > GUIDELINES.maxSodiumPerMeal) {
        score -= Math.min(10, ((estimatedSodium - GUIDELINES.maxSodiumPerMeal) / 100));
    }

    // 6. Macronutrient balance (20 points)
    const carbsPercent = (carbs * 4 / calories) * 100;
    const proteinPercent = (protein * 4 / calories) * 100;
    const fatPercent = (fat * 9 / calories) * 100;

    if (carbsPercent < GUIDELINES.carbs.min || carbsPercent > GUIDELINES.carbs.max) {
        score -= 7;
    }
    if (proteinPercent < GUIDELINES.protein.min || proteinPercent > GUIDELINES.protein.max) {
        score -= 7;
    }
    if (fatPercent < GUIDELINES.fat.min || fatPercent > GUIDELINES.fat.max) {
        score -= 6;
    }

    return Math.max(0, Math.round(score));
}

/**
 * Estimate sodium content based on recipe ingredients
 * This is a rough estimation since exact sodium data isn't available
 */
function estimateSodium(recipe) {
    const { category, calories } = recipe;

    // Base estimation on category and calories
    // Breakfast items: ~300-400mg
    // Lunch/Dinner: ~500-700mg
    // Snacks: ~100-200mg

    if (category === 'nonushta') {
        return Math.min(400, calories * 1.4);
    } else if (category === 'tushlik' || category === 'kechki_ovqat') {
        return Math.min(700, calories * 2.5);
    } else {
        return Math.min(200, calories * 0.8);
    }
}

/**
 * Determine if recipe is diabetes-friendly
 */
function isDiabetesFriendly(score, gi) {
    return score >= 70 && gi !== 'high';
}

/**
 * Generate nutrition advice based on recipe analysis
 */
function generateNutritionAdvice(recipe, score) {
    const advice = [];
    const { sugar, fiber, gi, calories } = recipe;

    const sugarPercent = (sugar * 4 / calories) * 100;
    const fiberPer1000kcal = (fiber / calories) * 1000;

    if (score >= 85) {
        advice.push('✅ Qandli diabet uchun mukammal tanlov');
    } else if (score >= 70) {
        advice.push('✅ Qandli diabet uchun yaxshi tanlov');
    } else if (score >= 50) {
        advice.push('⚠️ Mo\'tadil miqdorda iste\'mol qiling');
    } else {
        advice.push('❌ Kamdan-kam iste\'mol qiling');
    }

    if (sugarPercent > GUIDELINES.maxSugarPercent) {
        advice.push('⚠️ Yuqori shakar miqdori - portionsizni cheklang');
    }

    if (fiberPer1000kcal < GUIDELINES.minFiberPer1000kcal) {
        advice.push('💡 Sabzavot yoki mevalar qo\'shing (tolalar uchun)');
    }

    if (gi === 'low') {
        advice.push('✅ Past glikemik indeks - qon shakarini barqarorlaydi');
    } else if (gi === 'medium') {
        advice.push('ℹ️ O\'rtacha GI - oqsil yoki yog\' bilan iste\'mol qiling');
    }

    return advice.join('\\n');
}

/**
 * Process all recipes and add health analysis
 */
function processRecipes() {
    const recipesPath = path.join(__dirname, 'recipes.json');
    const recipes = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));

    const processedRecipes = recipes.map(recipe => {
        const healthScore = calculateHealthScore(recipe);
        const diabetesFriendly = isDiabetesFriendly(healthScore, recipe.gi);
        const sugarPercent = Math.round((recipe.sugar * 4 / recipe.calories) * 100);
        const fiberPer1000kcal = Math.round((recipe.fiber / recipe.calories) * 1000);
        const saturatedFat = Math.round(recipe.fat * 0.3 * 10) / 10;
        const sodium = estimateSodium(recipe);
        const nutritionAdvice = generateNutritionAdvice(recipe, healthScore);

        return {
            ...recipe,
            healthScore,
            diabetesFriendly,
            saturatedFat,
            sodium,
            sugarPercent,
            fiberPer1000kcal,
            nutritionAdvice,
        };
    });

    // Save processed recipes
    fs.writeFileSync(
        recipesPath,
        JSON.stringify(processedRecipes, null, 2),
        'utf8'
    );

    // Generate summary
    const summary = {
        total: processedRecipes.length,
        diabetesFriendly: processedRecipes.filter(r => r.diabetesFriendly).length,
        averageScore: Math.round(processedRecipes.reduce((sum, r) => sum + r.healthScore, 0) / processedRecipes.length),
        lowGI: processedRecipes.filter(r => r.gi === 'low').length,
    };

    console.log('\\n========== RECIPE ANALYSIS SUMMARY ==========');
    console.log(`Total Recipes: ${summary.total}`);
    console.log(`Diabetes-Friendly: ${summary.diabetesFriendly} (${Math.round(summary.diabetesFriendly / summary.total * 100)}%)`);
    console.log(`Average Health Score: ${summary.averageScore}/100`);
    console.log(`Low GI Recipes: ${summary.lowGI} (${Math.round(summary.lowGI / summary.total * 100)}%)`);
    console.log('==========================================\\n');

    // Show top 5 healthiest recipes
    const topRecipes = [...processedRecipes]
        .sort((a, b) => b.healthScore - a.healthScore)
        .slice(0, 5);

    console.log('Top 5 Healthiest Recipes:');
    topRecipes.forEach((r, i) => {
        console.log(`${i + 1}. ${r.title} - Score: ${r.healthScore}/100`);
    });

    return summary;
}

// Run the analysis
if (require.main === module) {
    console.log('Starting recipe health analysis...');
    processRecipes();
    console.log('✅ Analysis complete! recipes.json has been updated.');
}

module.exports = { calculateHealthScore, isDiabetesFriendly, generateNutritionAdvice };
