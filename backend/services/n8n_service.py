import os
import httpx
import logging
from dotenv import load_dotenv

load_dotenv()

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def process_with_n8n(text: str, user_id: str, session_id: str, context: dict = None) -> str:
    """
    n8n dagi AI Agent webhookiga foydalanuvchi xabarini yuboradi va javobini qaytaradi.
    """
    if not N8N_WEBHOOK_URL:
        logger.warning("N8N_WEBHOOK_URL topilmadi, mock javob qaytarilmoqda.")
        return "Salom! Bu AI Agentdan sinov javobi. n8n webhook ulanmagan."

    payload = {
        "text": text,
        "user_id": user_id,
        "session_id": session_id,
        "context": context or {}
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(N8N_WEBHOOK_URL, json=payload, timeout=60.0)
            response.raise_for_status()
            data = response.json()
            
            # n8n dan qaytayotgan javob tuzilishi odatda siz qanday sozlashingizga bog'liq
            # Biz bu yerda 'output', 'reply' yoki to'g'ridan to'g'ri string kutamiz
            if isinstance(data, dict):
                return data.get("reply", data.get("output", "No valid output in JSON"))
            elif isinstance(data, list) and len(data) > 0:
                return data[0].get("reply", "No valid output in list")
            else:
                return str(data)

        except Exception as e:
            logger.error(f"n8n Webhook Error: {str(e)}")
            raise e
