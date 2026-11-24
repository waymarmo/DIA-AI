from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class GlucoseLog(Base):
    __tablename__ = "glucose_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    value = Column(Float, nullable=False) # in mg/dL
    measurement_type = Column(String(50), default="random") # 'fasting', 'before_meal', 'after_meal', 'bedtime'
    status = Column(String(50), default="normal") # 'low', 'normal', 'elevated', 'high'
    notes = Column(String(500), nullable=True)
    
    date_str = Column(String(20), index=True, nullable=False) # 'YYYY-MM-DD'
    measured_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="glucose_logs")
