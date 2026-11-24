from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class FoodScanRequest(BaseModel):
    image_base64: str
    language: Optional[str] = "uz"

class FoodNutritionInfo(BaseModel):
    name: str
    calories: float
    sugar: float
    carbs: float
    protein: float
    fat: float
    glycemic_index: int
    is_allowed: bool
    allowed_reason: Optional[str] = ""
    portion_grams: Optional[float] = 100.0
    recommendation: Optional[str] = ""

class FoodScanResponse(BaseModel):
    success: bool
    data: FoodNutritionInfo
    raw_response: Optional[str] = None

class AIChatRequest(BaseModel):
    message: str
    language: Optional[str] = "uz"
    audio_base64: Optional[str] = None
    chat_history: Optional[List[Dict[str, str]]] = []

class AIChatResponse(BaseModel):
    reply: str
    action: Optional[str] = None
    action_target: Optional[str] = None
    audio_base64: Optional[str] = None

class DailyAdviceResponse(BaseModel):
    date: str
    breakfast: str
    lunch: str
    dinner: str
