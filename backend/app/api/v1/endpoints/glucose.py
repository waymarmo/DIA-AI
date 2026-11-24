from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.user import User
from app.models.glucose import GlucoseLog
from app.schemas.glucose import GlucoseCreate, GlucoseResponse, GlucoseStats
from app.services.health_calculator import get_glucose_status
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter(prefix="/glucose", tags=["Glucose Monitoring"])

@router.post("", response_model=GlucoseResponse, status_code=status.HTTP_201_CREATED)
def log_glucose(log_in: GlucoseCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    calc_status = get_glucose_status(log_in.value)
    
    glucose = GlucoseLog(
        user_id=current_user.id,
        value=log_in.value,
        measurement_type=log_in.measurement_type or "random",
        status=calc_status,
        notes=log_in.notes,
        date_str=log_in.date_str
    )
    db.add(glucose)
    db.commit()
    db.refresh(glucose)
    return glucose

@router.get("/recent", response_model=List[GlucoseResponse])
def get_recent_glucose_logs(limit: int = 20, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    logs = db.query(GlucoseLog)\
             .filter(GlucoseLog.user_id == current_user.id)\
             .order_by(GlucoseLog.measured_at.desc())\
             .limit(limit)\
             .all()
    return logs

@router.get("/stats", response_model=GlucoseStats)
def get_glucose_statistics(days: int = 7, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    logs = db.query(GlucoseLog)\
             .filter(GlucoseLog.user_id == current_user.id)\
             .order_by(GlucoseLog.measured_at.desc())\
             .limit(days * 5)\
             .all()
             
    if not logs:
        return GlucoseStats(
            average_sugar=0.0,
            min_sugar=0.0,
            max_sugar=0.0,
            normal_count=0,
            high_count=0,
            low_count=0,
            total_logs=0
        )
        
    values = [l.value for l in logs]
    return GlucoseStats(
        average_sugar=round(sum(values) / len(values), 1),
        min_sugar=min(values),
        max_sugar=max(values),
        normal_count=sum(1 for l in logs if l.status == "normal"),
        high_count=sum(1 for l in logs if l.status in ["elevated", "high"]),
        low_count=sum(1 for l in logs if l.status == "low"),
        total_logs=len(logs)
    )
