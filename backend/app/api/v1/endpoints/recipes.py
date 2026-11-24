from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.user import User
from app.models.recipe import Recipe
from app.schemas.recipe import RecipeResponse, RecipeCreate
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter(prefix="/recipes", tags=["Recipes & Diet Guide"])

@router.get("", response_model=List[RecipeResponse])
def get_recipes(
    category: Optional[str] = Query(None, description="nonushta, tushlik, kechki_ovqat, all"),
    search: Optional[str] = Query(None, description="Search by name"),
    max_gi: Optional[int] = Query(None, description="Max Glycemic Index"),
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(Recipe)
    
    if category and category != "all":
        query = query.filter(Recipe.category == category)
    if search:
        query = query.filter(Recipe.title.ilike(f"%{search}%"))
    if max_gi:
        query = query.filter(Recipe.glycemic_index <= max_gi)
        
    return query.limit(limit).all()

@router.get("/{recipe_id}", response_model=RecipeResponse)
def get_recipe_by_id(recipe_id: int, db: Session = Depends(get_db)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Retsept topilmadi")
    return recipe

@router.post("", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
def create_custom_recipe(
    recipe_in: RecipeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recipe = Recipe(
        title=recipe_in.title,
        title_ru=recipe_in.title_ru,
        title_en=recipe_in.title_en,
        category=recipe_in.category or "all",
        calories=recipe_in.calories or 0.0,
        sugar=recipe_in.sugar or 0.0,
        carbs=recipe_in.carbs or 0.0,
        protein=recipe_in.protein or 0.0,
        fat=recipe_in.fat or 0.0,
        glycemic_index=recipe_in.glycemic_index or 0,
        prep_time=recipe_in.prep_time or 20,
        ingredients=recipe_in.ingredients or [],
        instructions=recipe_in.instructions,
        source=recipe_in.source or "Foydalanuvchi retsepti",
        image_url=recipe_in.image_url,
        is_custom=True
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe
