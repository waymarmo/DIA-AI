from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MealBase(BaseModel):
    name: str
    meal_type: Optional[str] = "other"
    portion_grams: Optional[float] = 100.0
    calories: Optional[float] = 0.0
    sugar: Optional[float] = 0.0
    carbs: Optional[float] = 0.0
    protein: Optional[float] = 0.0
    fat: Optional[float] = 0.0
    glycemic_index: Optional[int] = 0
    is_allowed: Optional[bool] = True
    photo_url: Optional[str] = None
    date_str: str  # YYYY-MM-DD

class MealCreate(MealBase):
    pass

class MealResponse(MealBase):
    id: int
    user_id: int
    logged_at: datetime

    class Config:
        from_attributes = True

class DailyMealSummary(BaseModel):
    date_str: str
    total_calories: float
    total_sugar: float
    total_carbs: float
    total_protein: float
    total_fat: float
    meal_count: int
    meals: list[MealResponse]
