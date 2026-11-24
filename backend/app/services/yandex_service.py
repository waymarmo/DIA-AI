import httpx
from app.core.config import settings

async def yandex_chat(message: str, folder_id: str = None, api_key: str = None) -> str:
    """Generate dialog response using Yandex GPT."""
    folder = folder_id or settings.YANDEX_FOLDER_ID
    key = api_key or settings.YANDEX_API_KEY
    
    if not key or not folder:
        raise ValueError("Yandex API credentials missing")
        
    url = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Api-Key {key}",
        "x-folder-id": folder
    }
    
    payload = {
        "modelUri": f"gpt://{folder}/yandexgpt-lite",
        "completionOptions": {"stream": False, "temperature": 0.6, "maxTokens": "500"},
        "messages": [
            {"role": "system", "text": "Siz Dia AI — diabetiklar uchun tibbiy maslahatchisiz."},
            {"role": "user", "text": message}
        ]
    }
    
    async with httpx.AsyncClient(timeout=25.0) as client:
        res = await client.post(url, headers=headers, json=payload)
        res.raise_for_status()
        data = res.json()
        
    return data["result"]["alternatives"][0]["message"]["text"]

async def yandex_synthesize_speech(text: str, voice: str = "nigora", lang: str = "uz-UZ") -> bytes:
    """Synthesize voice using Yandex SpeechKit TTS."""
    key = settings.YANDEX_API_KEY
    folder = settings.YANDEX_FOLDER_ID
    
    if not key or not folder:
        raise ValueError("Yandex SpeechKit credentials missing")
        
    url = "https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize"
    headers = {"Authorization": f"Api-Key {key}"}
    
    data = {
        "text": text,
        "lang": lang,
        "voice": voice,
        "folderId": folder,
        "format": "mp3"
    }
    
    async with httpx.AsyncClient(timeout=20.0) as client:
        res = await client.post(url, headers=headers, data=data)
        res.raise_for_status()
        return res.content
