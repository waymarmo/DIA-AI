from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str
    phone_number: Optional[str] = None
    first_name: Optional[str] = None
    gender: Optional[str] = "male"
    age: Optional[int] = 30
    height: Optional[float] = 170.0
    weight: Optional[float] = 70.0
    activity_level: Optional[str] = "moderate"
    diabetes_type: Optional[str] = "type2"
    language: Optional[str] = "uz"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class SendOtpRequest(BaseModel):
    phone_number: str

class VerifyOtpRequest(BaseModel):
    phone_number: str
    code: str
    first_name: Optional[str] = None
    gender: Optional[str] = "male"
    age: Optional[int] = 30
    height: Optional[float] = 170.0
    weight: Optional[float] = 70.0
    activity_level: Optional[str] = "moderate"
    diabetes_type: Optional[str] = "type2"

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    activity_level: Optional[str] = None
    diabetes_type: Optional[str] = None
    daily_calorie_target: Optional[int] = None
    daily_carb_target: Optional[int] = None
    language: Optional[str] = None

class UserResponse(UserBase):
    id: int
    daily_calorie_target: Optional[int] = 1800
    daily_carb_target: Optional[int] = 150
    target_sugar_low: Optional[float] = 70.0
    target_sugar_high: Optional[float] = 140.0
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
