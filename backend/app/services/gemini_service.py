import json
import re
import httpx
from app.core.config import settings

def clean_json_string(raw: str) -> str:
    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()

async def gemini_scan_food(image_base64: str, language: str = "uz") -> dict:
    """Analyze food image using Gemini multimodal API."""
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured")
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    
    prompt = f"""
    Ushbu taom suratini 2-toifa qandli diabet bemorlari uchun chuqur tahlil qiling.
    Javobni FAQAT quyidagi toza JSON formatida bering:
    {{
      "name": "Taom nomi ({language} tilida)",
      "calories": 250.0,
      "sugar": 3.5,
      "carbs": 28.0,
      "protein": 12.0,
      "fat": 8.0,
      "glycemic_index": 45,
      "is_allowed": true,
      "allowed_reason": "Tushuntirish ({language} tilida)",
      "portion_grams": 150.0,
      "recommendation": "Foydali maslahat ({language} tilida)"
    }}
    """
    
    # Strip base64 header if present
    pure_base64 = image_base64.split(",")[-1] if "," in image_base64 else image_base64
    
    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": "image/jpeg", "data": pure_base64}}
            ]
        }]
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(url, json=payload)
        res.raise_for_status()
        data = res.json()
        
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    cleaned = clean_json_string(text)
    return json.loads(cleaned)

async def gemini_chat(message: str, language: str = "uz", history: list = None) -> str:
    """Chat with Dia AI assistant."""
    if not settings.GEMINI_API_KEY:
        return "Gemini API kaliti ulanmagan."
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    
    system_instruction = f"""
    Sen Dia AI — 2-toifa qandli diabet bilan yashovchilar uchun ixtisoslashgan shaxsiy sog'liq va ovqatlanish bo'yicha sun'iy intellekt yordamchisisan.
    Foydalanuvchiga {language} tilida muloyim, aniq va dalda beruvchi ohangda javob ber.
    """
    
    parts = [{"text": f"System: {system_instruction}\nUser: {message}"}]
    payload = {"contents": [{"parts": parts}]}
    
    async with httpx.AsyncClient(timeout=25.0) as client:
        res = await client.post(url, json=payload)
        res.raise_for_status()
        data = res.json()
        
    return data["candidates"][0]["content"]["parts"][0]["text"]

async def gemini_daily_advice(language: str = "uz") -> dict:
    """Generate 3 daily meals AI suggestions."""
    prompt = f"""
    2-toifa diabet uchun bugungi kunlik 3 mahal ovqatlanish bo'yicha qisqa tavsiya bering.
    Javobni FAQAT JSON formatida bering:
    {{"breakfast": "nonushta tavsiyasi", "lunch": "tushlik tavsiyasi", "dinner": "kechki ovqat tavsiyasi"}}
    Til: {language}
    """
    text = await gemini_chat(prompt, language=language)
    try:
        return json.loads(clean_json_string(text))
    except Exception:
        if language == "en":
            return {
                "breakfast": "Egg and vegetable omelette with whole grain bread.",
                "lunch": "Boiled chicken breast, fresh green salad, and buckwheat.",
                "dinner": "Steamed white fish with broccoli and zucchini."
            }
        elif language == "ru":
            return {
                "breakfast": "Омлет с зеленью и цельнозерновым хлебом.",
                "lunch": "Отварная куриная грудка с овощным салатом и гречкой.",
                "dinner": "Запеченная рыба с зелеными овощами на пару."
            }
        return {
            "breakfast": "Tuxum va ko'katli omlet, to'liq donli non.",
            "lunch": "Qaynatilgan tovuq go'shti, sabzavotli salat va grechka.",
            "dinner": "Bug'da pishirilgan baliq va yashil sabzavotlar."
        }
