from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.core.database import get_db
from app.models.user import User
from app.models.meal import Meal
from app.models.glucose import GlucoseLog
from app.services.health_calculator import calculate_xe
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/summary")
def get_health_report_summary(
    period: str = Query("week", description="week, month, year"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    days = 7 if period == "week" else (30 if period == "month" else 365)
    start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    meals = db.query(Meal)\
              .filter(Meal.user_id == current_user.id, Meal.date_str >= start_date)\
              .all()
              
    glucose_logs = db.query(GlucoseLog)\
                     .filter(GlucoseLog.user_id == current_user.id, GlucoseLog.date_str >= start_date)\
                     .all()
                     
    total_cal = sum(m.calories for m in meals)
    total_sugar = sum(m.sugar for m in meals)
    total_carbs = sum(m.carbs for m in meals)
    
    avg_glucose = round(sum(g.value for g in glucose_logs) / len(glucose_logs), 1) if glucose_logs else 0.0
    
    # Calculate daily averages
    active_days = max(1, len(set(m.date_str for m in meals)))
    avg_daily_cal = round(total_cal / active_days, 1)
    avg_daily_sugar = round(total_sugar / active_days, 1)
    avg_daily_carbs = round(total_carbs / active_days, 1)
    avg_daily_xe = calculate_xe(avg_daily_carbs)
    
    return {
        "period": period,
        "days": days,
        "active_days_count": active_days,
        "averages": {
            "glucose_mg_dl": avg_glucose,
            "daily_calories": avg_daily_cal,
            "daily_sugar_g": avg_daily_sugar,
            "daily_carbs_g": avg_daily_carbs,
            "daily_xe": avg_daily_xe
        },
        "totals": {
            "meals_count": len(meals),
            "glucose_measurements_count": len(glucose_logs)
        },
        "target_goals": {
            "target_calories": current_user.daily_calorie_target,
            "target_carbs": current_user.daily_carb_target,
            "target_sugar_low": current_user.target_sugar_low,
            "target_sugar_high": current_user.target_sugar_high
        }
    }
