from sqlalchemy import Column, Integer, String, Float, Text, Boolean, JSON
from app.core.database import Base

class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    title_ru = Column(String(200), nullable=True)
    title_en = Column(String(200), nullable=True)
    
    category = Column(String(50), index=True, default="all") # 'nonushta', 'tushlik', 'kechki_ovqat', 'desert', 'ichimlik'
    calories = Column(Float, default=0.0)
    sugar = Column(Float, default=0.0)
    carbs = Column(Float, default=0.0)
    protein = Column(Float, default=0.0)
    fat = Column(Float, default=0.0)
    glycemic_index = Column(Integer, default=0)
    prep_time = Column(Integer, default=20) # in minutes
    
    ingredients = Column(JSON, default=list)
    instructions = Column(Text, nullable=True)
    source = Column(String(200), default="ADA - American Diabetes Association")
    image_url = Column(String(500), nullable=True)
    is_custom = Column(Boolean, default=False)
