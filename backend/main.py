from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import logging
import io
import PyPDF2
import random
from services.elevenlabs_service import speech_to_text, text_to_speech
from services.n8n_service import process_with_n8n
from services.textup_service import send_sms_via_textup, save_otp, verify_otp

app = FastAPI(title="Dia AI - Backend (FastAPI)")

# CORS sozlamalari (React Native/Admin Panel ruxsatlari uchun)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Ishlab chiqarishda buni xavfsiz domenga o'zgartiring
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Matn qabul qilish uchun model
class TextChatRequest(BaseModel):
    text: str
    user_id: str = "default_user"
    session_id: str = "default_session"
    context: Optional[dict] = None

class SendOtpRequest(BaseModel):
    phone_number: Optional[str] = None
    phone: Optional[str] = None

class VerifyOtpRequest(BaseModel):
    phone_number: Optional[str] = None
    phone: Optional[str] = None
    code: str

@app.get("/")
@app.get("/health")
async def root():
    return {"status": "ok", "message": "Dia AI FastAPI Backend ishlamoqda!"}

@app.post("/api/v1/auth/send-otp")
@app.post("/v1/auth/otp")
async def send_otp_endpoint(request: SendOtpRequest):
    """
    TextUP Gateway orqali haqiqiy SMS OTP yuboradi.
    """
    phone = (request.phone_number or request.phone or "").strip()
    if not phone:
        raise HTTPException(status_code=400, detail="Telefon raqami kiritilmagan")

    # 6 xonali tasdiqlash kodi
    code = str(random.randint(100000, 999999))
    save_otp(phone, code)

    # TextUP orqali yuborish
    success, message = await send_sms_via_textup(phone, code)

    return JSONResponse(content={
        "success": True,
        "phone": phone,
        "sms_sent": success,
        "message": message,
        "demo_code": code  # Sinov vaqtida oson tekshirish uchun
    })

@app.post("/api/v1/auth/verify-otp")
@app.post("/v1/auth/login")
async def verify_otp_endpoint(request: VerifyOtpRequest):
    """
    Yuborilgan OTP kodni tekshiradi va JWT access_token qaytaradi.
    """
    phone = (request.phone_number or request.phone or "").strip()
    code = (request.code or "").strip()

    if not phone or not code:
        raise HTTPException(status_code=400, detail="Telefon raqam yoki kod kiritilmagan")

    is_valid = verify_otp(phone, code)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Tasdiqlash kodi noto'g'ri yoki muddati tugagan")

    return JSONResponse(content={
        "success": True,
        "access_token": f"dia_ai_jwt_{phone}_{int(random.random()*1000000)}",
        "token_type": "bearer",
        "user": {
            "phone": phone,
            "status": "verified"
        }
    })

@app.post("/api/chat/text")
async def chat_text(request: TextChatRequest):
    """
    Foydalanuvchi matnini qabul qiladi va n8n AI Agent orqali javob qaytaradi.
    """
    try:
        logger.info(f"Matn keldi: {request.text} (User: {request.user_id})")
        
        # n8n ga matnni yuborish va AI javobini olish
        ai_reply = await process_with_n8n(
            text=request.text, 
            user_id=request.user_id, 
            session_id=request.session_id,
            context=request.context or {}
        )
        
        return JSONResponse(content={"reply": ai_reply, "status": "success"})
        
    except Exception as e:
        logger.error(f"Xatolik: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/voice")
async def chat_voice(
    file: UploadFile = File(...),
    user_id: str = Form("default_user"),
    session_id: str = Form("default_session"),
    context: str = Form("{}")
):
    """
    Foydalanuvchi audiosini qabul qiladi, STT qiladi, n8n ga yuboradi va qaytgan javobni TTS qilib MP3 qaytaradi.
    """
    try:
        logger.info(f"Audio qabul qilindi: {file.filename} (User: {user_id})")
        
        audio_bytes = await file.read()
        
        # 1. ElevenLabs orqali Audioni matnga aylantirish (STT)
        user_text = await speech_to_text(audio_bytes, file.filename)
        logger.info(f"Olingan matn (STT): {user_text}")
        
        if not user_text.strip():
            raise HTTPException(status_code=400, detail="Audiodan matn aniqlanmadi")

        # 2. Matnni n8n AI Agentga yuborish
        import json
        try:
            parsed_context = json.loads(context)
        except:
            parsed_context = {}

        ai_reply = await process_with_n8n(
            text=user_text, 
            user_id=user_id, 
            session_id=session_id,
            context=parsed_context
        )
        logger.info(f"AI Javobi: {ai_reply}")

        # 3. AI javobini ElevenLabs orqali MP3 ovozga aylantirish (TTS)
        reply_audio_bytes = await text_to_speech(ai_reply)

        if not reply_audio_bytes:
            # Agar API kalit yo'q bo'lsa yoki ishlamasa
            return JSONResponse(content={"reply": ai_reply, "status": "tts_failed"})

        # 4. MP3 faylni (bytes) ilovaga qaytarish
        import base64
        audio_b64 = base64.b64encode(reply_audio_bytes).decode('utf-8')
        return JSONResponse(content={"reply": ai_reply, "audio_base64": audio_b64, "status": "success"})
        
    except Exception as e:
        logger.error(f"Voice Chat Xatolik: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-report")
async def upload_report(
    file: UploadFile = File(...),
    context: str = Form("{}")
):
    """
    Tibbiy PDF hisobotini qabul qiladi, matnini o'qiydi va AI orqali tahlil qiladi.
    """
    try:
        logger.info(f"Report qabul qilindi: {file.filename}")
        pdf_bytes = await file.read()
        
        # 1. PDF dan matnni ajratish
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
        extracted_text = ""
        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\\n"
        
        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="PDF faylidan matn topilmadi. U rasm bo'lishi mumkin.")
            
        # 2. Context ga pdf_text ni qo'shish va n8n ga jo'natish
        import json
        try:
            parsed_context = json.loads(context)
        except:
            parsed_context = {}
            
        parsed_context['pdf_text'] = extracted_text
        parsed_context['is_medical_report'] = True

        prompt = "Iltimos, ushbu tibbiy hisobotni tahlil qiling va qat'iy JSON formatda qaytaring. Qaytariladigan JSON quyidagi maydonlarni o'z ichiga olsin: summary, diet, exercise, schedule (ichida: time (qat'iy soat emas, balki: 'morning', 'noon', 'evening', 'bedtime' qiymatlaridan birini bering), title, body). Shuningdek, agar bemorning holatida shifokorga ko'rinishni talab qiluvchi juda xavfli holat bo'lsa (masalan qon kamligi yoki o'ta yuqori qand), JSON ga 'critical_alert' nomli qator ham qo'shing va qisqa xavfni yozing."
        
        ai_reply = await process_with_n8n(
            text=prompt, 
            user_id="default", 
            session_id="report_parsing",
            context=parsed_context
        )
        
        logger.info(f"AI Hisobot Javobi: {ai_reply}")

        # ai_reply JSON bo'lishi kerak
        try:
            ai_reply_json = json.loads(ai_reply)
        except json.JSONDecodeError:
            # Agar n8n toza JSON qaytarmasa, manual parser:
            # Haqiqiy proyektda n8n dagi structured output yordam beradi
            ai_reply_json = {
                "summary": ai_reply,
                "diet": "Tavsiya n8n tomonidan JSON qilib berilmadi.",
                "exercise": "Tavsiya n8n tomonidan JSON qilib berilmadi.",
                "schedule": []
            }

        # Xulosani (summary) ElevenLabs orqali ovozga o'tkazamiz
        audio_b64 = None
        if "summary" in ai_reply_json and ai_reply_json["summary"]:
            reply_audio_bytes = await text_to_speech(ai_reply_json["summary"])
            if reply_audio_bytes:
                import base64
                audio_b64 = base64.b64encode(reply_audio_bytes).decode('utf-8')
                
        return JSONResponse(content={"result": ai_reply_json, "audio_base64": audio_b64, "status": "success"})
        
    except Exception as e:
        logger.error(f"Report Upload Xatolik: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
