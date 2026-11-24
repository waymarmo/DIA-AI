def get_glucose_status(sugar: float) -> str:
    """Returns classification for blood glucose level in mg/dL."""
    if sugar < 70.0:
        return "low"
    elif sugar <= 140.0:
        return "normal"
    elif sugar <= 180.0:
        return "elevated"
    else:
        return "high"

def calculate_xe(carbs: float) -> float:
    """Calculate Bread Units (Xlebnye Edinitsy). 1 XE = 12g Carbs."""
    return round(carbs / 12.0, 1)

def calculate_daily_targets(gender: str = "male", age: int = 30, height: float = 170.0, weight: float = 70.0, activity_level: str = "moderate"):
    """
    Harris-Benedict equation tailored for Type-2 Diabetes management.
    """
    # 1. BMR Calculation
    if gender.lower() == "female":
        bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
    else:
        bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
        
    # 2. Activity Multiplier
    multipliers = {
        "sedentary": 1.2,
        "moderate": 1.55,
        "active": 1.725
    }
    multiplier = multipliers.get(activity_level.lower(), 1.4)
    tdee = bmr * multiplier
    
    # 3. For diabetes management, slight deficit or balanced calorie limit
    target_calories = max(1200, int(tdee * 0.9))
    
    # 4. Carb budget (approx 45% of total calories / 4 kcal per gram)
    target_carbs = int((target_calories * 0.45) / 4)
    
    return {
        "daily_calories": target_calories,
        "daily_carbs": target_carbs,
        "target_sugar_low": 70.0,
        "target_sugar_high": 140.0
    }
