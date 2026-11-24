import os
import httpx
import logging
from dotenv import load_dotenv

load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = "kdmDKE6EkgrWrrykO9Qt" # User provided voice ID

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def speech_to_text(audio_bytes: bytes, filename: str = "audio.mp4") -> str:
    """
    Yuborilgan audio faylni ElevenLabs Scribe (v2) orqali matnga o'giradi.
    """
    if not ELEVENLABS_API_KEY:
        logger.warning("ELEVENLABS_API_KEY topilmadi, mock matn qaytarilmoqda.")
        return "Bu sinov uchun ElevenLabs STT API dan qaytgan matn. Iltimos API kalitni kiriting."

    url = "https://api.elevenlabs.io/v1/speech-to-text"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY
    }
    
    files = {
        "file": (filename, audio_bytes, "audio/mp4")
    }
    data = {
        "model_id": "scribe_v1"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, data=data, files=files, timeout=30.0)
            response.raise_for_status()
            result = response.json()
            return result.get("text", "")
        except Exception as e:
            logger.error(f"ElevenLabs STT Error: {str(e)}")
            raise e

async def text_to_speech(text: str) -> bytes:
    """
    Yuborilgan matnni ElevenLabs orqali MP3 audio (bytes) ga o'giradi.
    """
    if not ELEVENLABS_API_KEY:
        logger.warning("ELEVENLABS_API_KEY topilmadi, xatolik berilmasligi uchun bo'sh bytes qaytarilmoqda.")
        return b""

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }
    data = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=data, timeout=30.0)
            response.raise_for_status()
            return response.content # bytes
        except Exception as e:
            logger.error(f"ElevenLabs TTS Error: {str(e)}")
            raise e
