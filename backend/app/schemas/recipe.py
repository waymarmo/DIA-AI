from pydantic import BaseModel
from typing import Optional, List

class RecipeBase(BaseModel):
    title: str
    title_ru: Optional[str] = None
    title_en: Optional[str] = None
    category: Optional[str] = "all"
    calories: Optional[float] = 0.0
    sugar: Optional[float] = 0.0
    carbs: Optional[float] = 0.0
    protein: Optional[float] = 0.0
    fat: Optional[float] = 0.0
    glycemic_index: Optional[int] = 0
    prep_time: Optional[int] = 20
    ingredients: Optional[List[str]] = []
    instructions: Optional[str] = None
    source: Optional[str] = "ADA - American Diabetes Association"
    image_url: Optional[str] = None

class RecipeCreate(RecipeBase):
    pass

class RecipeResponse(RecipeBase):
    id: int
    is_custom: bool

    class Config:
        from_attributes = True
