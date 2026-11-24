import os
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.api.v1.router import api_router
import app.models
import logging
from app.services.elevenlabs_service import speech_to_text, text_to_speech
from app.services.n8n_service import process_with_n8n
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TextChatRequest(BaseModel):
    text: str
    user_id: str = "default_user"
    session_id: str = "default_session"
    context: Optional[dict] = None

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    description="Dia AI — 2-toifa Qandli Diabet Bemorlari uchun Shaxsiy AI Assistent Backend API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS if isinstance(settings.BACKEND_CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

STATIC_ADMIN_PATH = os.path.join(os.path.dirname(__file__), "static", "admin", "index.html")
APK_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sms_gateway.apk")

@app.get("/admin", tags=["Admin Panel"])
def serve_admin():
    if os.path.exists(STATIC_ADMIN_PATH):
        return FileResponse(STATIC_ADMIN_PATH)
    return {"error": "Admin panel template not found"}

@app.get("/download/sms-gateway.apk", tags=["Downloads"])
def download_sms_gateway_apk():
    if os.path.exists(APK_PATH):
        return FileResponse(
            APK_PATH,
            filename="sms_gateway.apk",
            media_type="application/vnd.android.package-archive"
        )
    raise HTTPException(status_code=404, detail="APK yuklab olinmoqda, iltimos ozgina kuting...")

@app.get("/", tags=["Health Check"])
def root():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "admin": "/admin",
        "sms_gateway_apk": "/download/sms-gateway.apk"
    }

@app.post("/api/chat/text", tags=["Legacy AI Chat"])
async def chat_text(request: TextChatRequest):
    """
    Foydalanuvchi matnini qabul qiladi va n8n AI Agent orqali javob qaytaradi.
    """
    try:
        logger.info(f"Matn keldi: {request.text} (User: {request.user_id})")
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

@app.post("/api/chat/voice", tags=["Legacy AI Chat"])
async def chat_voice(
    file: UploadFile = File(...),
    user_id: str = Form("default_user"),
    session_id: str = Form("default_session"),
    context: str = Form("{}")
):
    """
    Ovozli xabarni ElevenLabs va n8n orqali tahlil qiladi.
    """
    try:
        audio_bytes = await file.read()
        user_text = await speech_to_text(audio_bytes, file.filename)
        
        if not user_text.strip():
            raise HTTPException(status_code=400, detail="Audiodan matn aniqlanmadi")

        import json
        try: parsed_context = json.loads(context)
        except: parsed_context = {}

        ai_reply = await process_with_n8n(
            text=user_text, 
            user_id=user_id, 
            session_id=session_id,
            context=parsed_context
        )

        reply_audio_bytes = await text_to_speech(ai_reply)

        if not reply_audio_bytes:
            return JSONResponse(content={"reply": ai_reply, "status": "tts_failed"})

        import base64
        audio_b64 = base64.b64encode(reply_audio_bytes).decode('utf-8')
        return JSONResponse(content={"reply": ai_reply, "audio_base64": audio_b64, "status": "success"})
        
    except Exception as e:
        logger.error(f"Voice Chat Xatolik: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/stt", tags=["AI Services"])
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Audio faylni qabul qilib, uni matnga o'giradi (Speech-To-Text)
    """
    try:
        audio_bytes = await file.read()
        user_text = await speech_to_text(audio_bytes, file.filename)
        return JSONResponse(content={"text": user_text.strip(), "status": "success"})
    except Exception as e:
        logger.error(f"STT Xatolik: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
