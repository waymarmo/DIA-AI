import os
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "Dia AI Backend"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dia_ai_secret_key_change_in_prod_12345")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./dia_ai.db")
    
    # AI Credentials
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    YANDEX_API_KEY: str = os.getenv("YANDEX_API_KEY", "")
    YANDEX_FOLDER_ID: str = os.getenv("YANDEX_FOLDER_ID", "")
    
    # Pushbullet SMS & Notification API
    PUSHBULLET_API_KEY: str = os.getenv("PUSHBULLET_API_KEY", "o.8vEO994vNMrttJWcFq8yH0hppz52WLjz")
    
    # Android SMS Gateway (Optional)
    SMS_GATEWAY_URL: str = os.getenv("SMS_GATEWAY_URL", "")
    SMS_GATEWAY_AUTH_KEY: str = os.getenv("SMS_GATEWAY_AUTH_KEY", "")
    SMS_TEST_MODE: bool = True
    
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = "*"

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()
