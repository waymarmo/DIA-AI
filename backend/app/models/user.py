from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String(50), unique=True, index=True, nullable=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    # Profile information
    first_name = Column(String(100), nullable=True)
    gender = Column(String(20), nullable=True)  # 'male' | 'female'
    age = Column(Integer, nullable=True)
    height = Column(Float, nullable=True)       # in cm
    weight = Column(Float, nullable=True)       # in kg
    activity_level = Column(String(50), nullable=True) # sedentary, moderate, active
    diabetes_type = Column(String(50), default="type2") # type2, prediabetes
    
    # Targets
    target_sugar_low = Column(Float, default=70.0)
    target_sugar_high = Column(Float, default=140.0)
    daily_calorie_target = Column(Integer, default=1800)
    daily_carb_target = Column(Integer, default=150)
    
    language = Column(String(10), default="uz")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    meals = relationship("Meal", back_populates="user", cascade="all, delete-orphan")
    glucose_logs = relationship("GlucoseLog", back_populates="user", cascade="all, delete-orphan")
