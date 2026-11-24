from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Meal(Base):
    __tablename__ = "meals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    name = Column(String(200), nullable=False)
    meal_type = Column(String(50), default="other") # 'breakfast' | 'lunch' | 'dinner' | 'snack'
    portion_grams = Column(Float, default=100.0)
    
    calories = Column(Float, default=0.0)
    sugar = Column(Float, default=0.0)
    carbs = Column(Float, default=0.0)
    protein = Column(Float, default=0.0)
    fat = Column(Float, default=0.0)
    glycemic_index = Column(Integer, default=0)
    is_allowed = Column(Boolean, default=True)
    
    photo_url = Column(String(500), nullable=True)
    date_str = Column(String(20), index=True, nullable=False) # 'YYYY-MM-DD'
    logged_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="meals")
