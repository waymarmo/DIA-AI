from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class GlucoseBase(BaseModel):
    value: float  # in mg/dL
    measurement_type: Optional[str] = "random" # fasting, before_meal, after_meal, bedtime
    notes: Optional[str] = None
    date_str: str # YYYY-MM-DD

class GlucoseCreate(GlucoseBase):
    pass

class GlucoseResponse(GlucoseBase):
    id: int
    user_id: int
    status: str
    measured_at: datetime

    class Config:
        from_attributes = True

class GlucoseStats(BaseModel):
    average_sugar: float
    min_sugar: float
    max_sugar: float
    normal_count: int
    high_count: int
    low_count: int
    total_logs: int
