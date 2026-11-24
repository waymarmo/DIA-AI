from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.models.user import User
from app.models.meal import Meal
from app.schemas.meal import MealCreate, MealResponse, DailyMealSummary
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter(prefix="/meals", tags=["Meals"])

@router.post("", response_model=MealResponse, status_code=status.HTTP_201_CREATED)
def log_meal(meal_in: MealCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    meal = Meal(
        user_id=current_user.id,
        name=meal_in.name,
        meal_type=meal_in.meal_type or "other",
        portion_grams=meal_in.portion_grams or 100.0,
        calories=meal_in.calories or 0.0,
        sugar=meal_in.sugar or 0.0,
        carbs=meal_in.carbs or 0.0,
        protein=meal_in.protein or 0.0,
        fat=meal_in.fat or 0.0,
        glycemic_index=meal_in.glycemic_index or 0,
        is_allowed=meal_in.is_allowed if meal_in.is_allowed is not None else True,
        photo_url=meal_in.photo_url,
        date_str=meal_in.date_str
    )
    db.add(meal)
    db.commit()
    db.refresh(meal)
    return meal

@router.get("/date/{date_str}", response_model=DailyMealSummary)
def get_meals_by_date(date_str: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    meals = db.query(Meal).filter(Meal.user_id == current_user.id, Meal.date_str == date_str).all()
    
    total_cal = sum(m.calories for m in meals)
    total_sug = sum(m.sugar for m in meals)
    total_car = sum(m.carbs for m in meals)
    total_pro = sum(m.protein for m in meals)
    total_fat = sum(m.fat for m in meals)
    
    return DailyMealSummary(
        date_str=date_str,
        total_calories=round(total_cal, 1),
        total_sugar=round(total_sug, 1),
        total_carbs=round(total_car, 1),
        total_protein=round(total_pro, 1),
        total_fat=round(total_fat, 1),
        meal_count=len(meals),
        meals=[MealResponse.from_orm(m) for m in meals]
    )

@router.get("/today", response_model=DailyMealSummary)
def get_today_meals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    return get_meals_by_date(date_str=today_str, current_user=current_user, db=db)

@router.delete("/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal(meal_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    meal = db.query(Meal).filter(Meal.id == meal_id, Meal.user_id == current_user.id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Taom topilmadi")
    db.delete(meal)
    db.commit()
    return None
