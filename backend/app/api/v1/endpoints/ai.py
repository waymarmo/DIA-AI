from fastapi import APIRouter, Depends, HTTPException, Response
from datetime import datetime
from app.models.user import User
from app.schemas.ai import FoodScanRequest, FoodScanResponse, FoodNutritionInfo, AIChatRequest, AIChatResponse, DailyAdviceResponse
from app.services.gemini_service import gemini_scan_food, gemini_chat, gemini_daily_advice
from app.services.yandex_service import yandex_chat, yandex_synthesize_speech
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter(prefix="/ai", tags=["AI Engine"])

@router.post("/scan-food", response_model=FoodScanResponse)
async def scan_food_image(req: FoodScanRequest, current_user: User = Depends(get_current_user)):
    try:
        lang = req.language or current_user.language or "uz"
        result = await gemini_scan_food(image_base64=req.image_base64, language=lang)
        
        info = FoodNutritionInfo(
            name=result.get("name", "Nomaʼlum taom"),
            calories=float(result.get("calories", 0.0)),
            sugar=float(result.get("sugar", 0.0)),
            carbs=float(result.get("carbs", 0.0)),
            protein=float(result.get("protein", 0.0)),
            fat=float(result.get("fat", 0.0)),
            glycemic_index=int(result.get("glycemic_index", 0)),
            is_allowed=bool(result.get("is_allowed", True)),
            allowed_reason=str(result.get("allowed_reason", "")),
            portion_grams=float(result.get("portion_grams", 100.0)),
            recommendation=str(result.get("recommendation", ""))
        )
        return FoodScanResponse(success=True, data=info)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI tahlilida xatolik: {str(e)}")

@router.post("/chat", response_model=AIChatResponse)
async def chat_assistant(req: AIChatRequest, current_user: User = Depends(get_current_user)):
    lang = req.language or current_user.language or "uz"
    try:
        # First attempt: Gemini
        reply = await gemini_chat(message=req.message, language=lang, history=req.chat_history)
        return AIChatResponse(reply=reply)
    except Exception:
        try:
            # Second attempt: Yandex GPT fallback
            reply = await yandex_chat(message=req.message)
            return AIChatResponse(reply=reply)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Suhbat xizmati vaqtincha band: {str(e)}")

@router.get("/daily-advice", response_model=DailyAdviceResponse)
async def get_daily_meal_advice(language: str = "uz", current_user: User = Depends(get_current_user)):
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    advice = await gemini_daily_advice(language=language)
    return DailyAdviceResponse(
        date=today_str,
        breakfast=advice.get("breakfast", "Sog'lom nonushta qiling."),
        lunch=advice.get("lunch", "Tushlikda sabzavotlarga e'tibor bering."),
        dinner=advice.get("dinner", "Kechki ovqatni yengil tanlang.")
    )

@router.post("/tts")
async def text_to_speech(text: str, voice: str = "nigora", lang: str = "uz-UZ", current_user: User = Depends(get_current_user)):
    try:
        audio_bytes = await yandex_synthesize_speech(text=text, voice=voice, lang=lang)
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ovoz sintezida xatolik: {str(e)}")
