from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.user import User
from app.models.meal import Meal
from app.models.glucose import GlucoseLog
from app.models.recipe import Recipe
from app.schemas.recipe import RecipeCreate, RecipeResponse

router = APIRouter(prefix="/admin", tags=["Admin Panel"])

@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    user_count = db.query(User).count()
    meal_count = db.query(Meal).count()
    glucose_count = db.query(GlucoseLog).count()
    recipe_count = db.query(Recipe).count()
    
    avg_glucose = db.query(func.avg(GlucoseLog.value)).scalar() or 0
    total_calories = db.query(func.sum(Meal.calories)).scalar() or 0
    
    return {
        "user_count": user_count,
        "meal_count": meal_count,
        "glucose_count": glucose_count,
        "recipe_count": recipe_count,
        "avg_glucose": round(float(avg_glucose), 1),
        "total_calories_logged": round(float(total_calories), 1)
    }

@router.get("/users")
def get_admin_users(skip: int = 0, limit: int = 50, search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(User)
    if search:
        query = query.filter(User.first_name.ilike(f"%{search}%") | User.username.ilike(f"%{search}%"))
    users = query.offset(skip).limit(limit).all()
    return [{
        "id": u.id,
        "username": u.username,
        "first_name": u.first_name,
        "gender": u.gender,
        "age": u.age,
        "height": u.height,
        "weight": u.weight,
        "diabetes_type": u.diabetes_type,
        "daily_calorie_target": u.daily_calorie_target,
        "is_active": u.is_active,
        "created_at": str(u.created_at)
    } for u in users]

@router.get("/meals")
def get_admin_meals(limit: int = 50, db: Session = Depends(get_db)):
    meals = db.query(Meal).order_by(Meal.logged_at.desc()).limit(limit).all()
    return [{
        "id": m.id,
        "user_id": m.user_id,
        "name": m.name,
        "meal_type": m.meal_type,
        "portion_grams": m.portion_grams,
        "calories": m.calories,
        "sugar": m.sugar,
        "carbs": m.carbs,
        "protein": m.protein,
        "fat": m.fat,
        "glycemic_index": m.glycemic_index,
        "date_str": m.date_str,
        "created_at": str(m.logged_at)
    } for m in meals]

@router.get("/glucose")
def get_admin_glucose(limit: int = 50, db: Session = Depends(get_db)):
    logs = db.query(GlucoseLog).order_by(GlucoseLog.measured_at.desc()).limit(limit).all()
    return [{
        "id": g.id,
        "user_id": g.user_id,
        "value": g.value,
        "status": g.status,
        "measurement_type": g.measurement_type,
        "notes": g.notes,
        "date_str": g.date_str,
        "measured_at": str(g.measured_at)
    } for g in logs]

@router.post("/recipes", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
def create_admin_recipe(recipe_in: RecipeCreate, db: Session = Depends(get_db)):
    recipe = Recipe(**recipe_in.dict(), is_custom=False)
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe

@router.put("/recipes/{recipe_id}", response_model=RecipeResponse)
def update_admin_recipe(recipe_id: int, recipe_in: RecipeCreate, db: Session = Depends(get_db)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Retsept topilmadi")
    
    for key, value in recipe_in.dict().items():
        setattr(recipe, key, value)
    
    db.commit()
    db.refresh(recipe)
    return recipe

@router.delete("/recipes/{recipe_id}")
def delete_admin_recipe(recipe_id: int, db: Session = Depends(get_db)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Retsept topilmadi")
    db.delete(recipe)
    db.commit()
    return {"message": "Retsept muvaffaqiyatli o'chirildi", "id": recipe_id}
