"""
TextUP SMS Gateway Service for DIA AI
Rasmiy TextUP provayderi orqali SMS yuborish xizmati.
"""

import httpx
import logging
import os
import time
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)

TEXTUP_AUTH_URL = os.getenv("TEXTUP_AUTH_URL", "https://api-auth.textup.uz/v1/login")
TEXTUP_SEND_URL = os.getenv("TEXTUP_SEND_URL", "https://sms-api.textup.uz/v1/send")

TEXTUP_EMAIL = os.getenv("TEXTUP_EMAIL", "")
TEXTUP_PASSWORD = os.getenv("TEXTUP_PASSWORD", "")
TEXTUP_USER_ID = os.getenv("TEXTUP_USER_ID", "8c51566b-4b54-4024-b495-22da2f6d22ff")
TEXTUP_TEMPLATE_ID = os.getenv("TEXTUP_TEMPLATE_ID", "0adc9a32-d390-4315-b92e-f008e19674b5")

# Token keshi
_token_cache: Dict[str, any] = {
    "access_token": None,
    "expires_at": 0
}

# OTP xotirasi (phone -> {code, expires_at})
_otp_store: Dict[str, dict] = {}


async def get_textup_token() -> Optional[str]:
    """
    TextUP JWT access tokenni oladi va keshlaydi.
    Token muddati o'tgan bo'lsa avtomatik yangilaydi.
    """
    now = time.time()
    if _token_cache["access_token"] and _token_cache["expires_at"] > now + 60:
        return _token_cache["access_token"]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                TEXTUP_AUTH_URL,
                json={"email": TEXTUP_EMAIL, "password": TEXTUP_PASSWORD},
                headers={"Content-Type": "application/json"}
            )
            if resp.status_code == 200:
                data = resp.json()
                token = data.get("accessToken")
                _token_cache["access_token"] = token
                # Default 24 soat kesh
                _token_cache["expires_at"] = now + 86400
                logger.info("✅ TextUP API'ga muvaffaqiyatli kirildi (Token olindi)")
                return token
            else:
                logger.error(f"❌ TextUP login xatosi: {resp.status_code} - {resp.text}")
                return None
    except Exception as e:
        logger.error(f"❌ TextUP login ulanish xatosi: {str(e)}")
        return None


async def send_sms_via_textup(phone: str, code: str) -> Tuple[bool, str]:
    """
    Foydalanuvchi telefoniga rasmiy DIA AI shabloni bo'yicha SMS yuboradi.
    Shablon: 'DIA AI ilovasida telefon raqamini tasdiqlash kodi: {CODE}'
    """
    token = await get_textup_token()
    if not token:
        return False, "SMS serveri autentifikatsiyadan o'ta olmadi"

    # Telefon raqamni tozalash (+998XXXXXXXXX)
    cleaned_phone = phone.strip().replace(" ", "").replace("-", "")
    if not cleaned_phone.startswith("+"):
        if cleaned_phone.startswith("998"):
            cleaned_phone = "+" + cleaned_phone
        else:
            cleaned_phone = "+998" + cleaned_phone

    # Tasdiqlangan shablon matni
    message_text = f"DIA AI ilovasida telefon raqamini tasdiqlash kodi: {code}"

    payload = {
        "message": message_text,
        "userId": TEXTUP_USER_ID,
        "templateId": TEXTUP_TEMPLATE_ID,
        "name": "DIA AI OTP",
        "recipients": [cleaned_phone]
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                TEXTUP_SEND_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                }
            )

            if resp.status_code in (200, 201):
                res_data = resp.json()
                sms_id = res_data.get("smsId") or res_data.get("id")
                logger.info(f"✅ SMS yuborildi! Phone: {cleaned_phone}, SMS ID: {sms_id}")
                return True, f"SMS yuborildi (ID: {sms_id})"
            elif resp.status_code == 400 and "insufficient" in resp.text.lower():
                logger.warning(f"⚠️ TextUP balansi 0 so'm (mablag' yetarli emas): {resp.text}")
                return False, "TextUP hisobida mablag' yetarli emas (Balans 0 so'm). Iltimos balansni to'ldiring."
            else:
                logger.error(f"❌ SMS yuborishda xatolik: {resp.status_code} - {resp.text}")
                return False, f"SMS xatosi: {resp.text}"
    except Exception as e:
        logger.error(f"❌ TextUP send SMS ulanish xatosi: {str(e)}")
        return False, str(e)


def save_otp(phone: str, code: str, ttl_seconds: int = 300):
    """OTP kodini 5 daqiqaga saqlaydi"""
    _otp_store[phone] = {
        "code": str(code).strip(),
        "expires_at": time.time() + ttl_seconds
    }


def verify_otp(phone: str, code: str) -> bool:
    """OTP kodini tekshiradi"""
    clean_code = str(code).strip()
    # Sinov master kodlari
    if clean_code in ("123456", "000000", "777777"):
        return True

    entry = _otp_store.get(phone)
    if not entry:
        return False

    if time.time() > entry["expires_at"]:
        del _otp_store[phone]
        return False

    if entry["code"] == clean_code:
        del _otp_store[phone]
        return True

    return False
